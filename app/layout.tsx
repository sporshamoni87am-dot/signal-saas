import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://signalassistance.app";
const SITE_TITLE = "Meta Ads Signal Assistance — Know which metrics matter";
const SITE_DESCRIPTION =
  "Metric-focused diagnosis for D2C media buyers on Meta: which signals matter, when to kill or scale a campaign, and exactly what to change in Ads Manager. Free 30-day trial, no credit card required.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s · Meta Ads Signal Assistance",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "meta ads",
    "facebook ads",
    "media buying",
    "ad metrics",
    "ROAS",
    "MER",
    "POAS",
    "campaign diagnosis",
    "D2C advertising",
  ],
  authors: [{ name: "Meta Ads Signal Assistance" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: "Meta Ads Signal Assistance",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function Logo() {
  return (
    <a href="/" className="flex min-h-11 shrink-0 items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-lg font-black text-zinc-950">
        ∿
      </span>
      {/* Wordmark hidden on narrow phones: icon + nav links alone fit 360px;
          the full wordmark returns at 420px and up. */}
      <span className="hidden text-[15px] font-bold tracking-tight text-zinc-50 min-[420px]:inline">
        Signal<span className="text-lime-300"> Assistance</span>
      </span>
    </a>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <header className="no-print border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
            <Logo />
            <nav className="flex min-w-0 items-center gap-1 sm:gap-3">
              <a href="/dashboard" className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-sm font-medium text-zinc-300 transition hover:text-zinc-50 sm:px-3">
                Dashboard
              </a>
              <a href="/#pricing" className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-300 transition hover:text-zinc-50 sm:inline-flex">
                Pricing
              </a>
              <a href="/login" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-lime-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 sm:px-4">
                Sign in
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-zinc-800/80">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6">
            <p className="text-xs text-zinc-500">
              Meta Ads Signal Assistance — metric-focused diagnosis for media buyers.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <a href="/privacy" className="inline-block py-1 text-zinc-500 transition hover:text-zinc-300">
                Privacy Policy
              </a>
              <a href="/terms" className="inline-block py-1 text-zinc-500 transition hover:text-zinc-300">
                Terms of Service
              </a>
              <span className="text-zinc-600">
                Benchmarks are adjustable starting points, not verified platform data.
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
