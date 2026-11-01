'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { BILLING_ENABLED, FREE_DIAGNOSIS_LIMIT } from '@/lib/stripe';
import { TRIAL_DAYS } from '@/lib/trial';
import type { DiagnosisInputs, DiagnosisResults, Verdict } from '@/lib/engine';

export interface PlanInfo {
  plan: 'free' | 'pro';
  used: number;
  limit: number | null; // null = unlimited
}

export interface TrialInfo {
  /** ISO timestamp of when the trial ends, or null if unknown. */
  trialEndsAt: string | null;
  /** Whole days remaining. Negative when expired. */
  daysLeft: number;
  expired: boolean;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

/**
 * Trial status for the current user. This is the access-control source of
 * truth while BILLING_ENABLED=false (launch mode).
 */
export async function getTrial(): Promise<TrialInfo> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('trial_ends_at')
    .eq('id', user.id)
    .maybeSingle();

  const trialEndsAt = (profile?.trial_ends_at as string | null) ?? null;
  if (!trialEndsAt) {
    // Profiles created before the trial migration get the benefit of the doubt.
    return { trialEndsAt: null, daysLeft: TRIAL_DAYS, expired: false };
  }
  const msLeft = new Date(trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  return { trialEndsAt, daysLeft, expired: msLeft <= 0 };
}

/**
 * Legacy Stripe-era plan lookup. Only used when BILLING_ENABLED=true.
 * Kept intact for the billing phase; not called during the trial launch.
 */
export async function getPlan(): Promise<PlanInfo> {
  const { supabase, user } = await requireUser();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  const isPro = sub?.status === 'active' || sub?.status === 'trialing';

  const { count } = await supabase
    .from('diagnoses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return {
    plan: isPro ? 'pro' : 'free',
    used: count ?? 0,
    limit: isPro ? null : FREE_DIAGNOSIS_LIMIT,
  };
}

export interface SaveDiagnosisArgs {
  inputs: DiagnosisInputs;
  results: DiagnosisResults;
  screenshotPath: string | null;
}

export async function saveDiagnosis(
  args: SaveDiagnosisArgs,
): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await requireUser();

  if (BILLING_ENABLED) {
    // Stripe era: enforce the free-plan diagnosis cap server-side.
    const plan = await getPlan();
    if (plan.limit !== null && plan.used >= plan.limit) {
      return { error: 'FREE_LIMIT_REACHED' };
    }
  } else {
    // Trial launch: unlimited diagnoses while the trial is active.
    // Expired trials can still VIEW past diagnoses — just not create new ones.
    const trial = await getTrial();
    if (trial.expired) {
      return { error: 'TRIAL_EXPIRED' };
    }
  }

  const { data, error } = await supabase
    .from('diagnoses')
    .insert({
      user_id: user.id,
      campaign_name: args.inputs.campaignName || 'Untitled campaign',
      verdict: args.results.verdict as Verdict,
      inputs: args.inputs,
      results: args.results,
      screenshot_path: args.screenshotPath,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { error: error?.message ?? 'Could not save the diagnosis.' };
  }

  revalidatePath('/dashboard');
  return { id: data.id as string };
}

export async function deleteDiagnosis(id: string): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();

  // Fetch first so we can also clean up the screenshot file.
  const { data: row } = await supabase
    .from('diagnoses')
    .select('screenshot_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('diagnoses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  if (row?.screenshot_path) {
    await supabase.storage.from('screenshots').remove([row.screenshot_path as string]);
  }

  revalidatePath('/dashboard');
  return {};
}

/** Short-lived signed URL for a private screenshot. Never expose raw paths. */
export async function getScreenshotUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { supabase, user } = await requireUser();

  // Confirm the row belongs to this user before signing.
  const { data: row } = await supabase
    .from('diagnoses')
    .select('id')
    .eq('user_id', user.id)
    .eq('screenshot_path', path)
    .maybeSingle();
  if (!row) return null;

  const { data, error } = await supabase.storage
    .from('screenshots')
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/** Used by the Stripe webhook only — never call from the browser. */
export async function upsertSubscriptionFromStripe(record: {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  price_id: string | null;
  current_period_end: string | null;
}) {
  const supabase = await createServiceClient();
  const { error } = await supabase.from('subscriptions').upsert(record, {
    onConflict: 'user_id',
  });
  if (error) throw new Error(`subscription upsert failed: ${error.message}`);
}
