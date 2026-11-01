import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Delete an uploaded-but-never-saved screenshot ("orphan").
 *
 * The diagnose wizard uploads the screenshot as soon as the user picks it,
 * so the path is ready when the diagnosis is saved. If the user abandons the
 * wizard (navigates away, closes the tab) the file would otherwise linger in
 * Storage forever. The client fires this endpoint with navigator.sendBeacon()
 * on unmount when no diagnosis was saved.
 *
 * Safety: the path must live under the caller's own "<user_id>/" folder,
 * otherwise the request is rejected. RLS on the bucket is a second layer.
 */
export async function POST(req: Request) {
  let path: unknown;
  try {
    const body = await req.json();
    path = body?.path;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || typeof path !== 'string' || path === '' || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabase.storage.from('screenshots').remove([path]);
  if (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
