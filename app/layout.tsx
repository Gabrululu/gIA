import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: "gIA — The GPU Hedge Layer on Injective",
  description: "GPU Insurance Agent: plan GPU rental budgets with indicative SICI capped-call recommendations and simulated execution.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className="h-full antialiased">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* Shared root stylesheet applies to every App Router page. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
    </head>
    <body className="flex min-h-full flex-col">
      <header className="border-b border-border">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-10">
          <Link href="/" className="flex items-baseline gap-3" aria-label="gIA home">
            <span className="display text-4xl text-plum">gIA</span>
            <span className="eyebrow hidden sm:inline">The GPU Hedge Layer on Injective</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/start" className="text-sm hover:underline">Plan my hedge →</Link>
            <span className="rounded-full border border-warn/50 bg-warn/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-widest text-warn">Simulated prototype</span>
          </div>
        </nav>
      </header>
      <main className="w-full flex-1">{children}</main>
      <footer className="mt-24 border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between md:px-10">
          <Link href="/" className="display text-8xl text-steel">gIA</Link>
          <p className="max-w-md text-sm text-muted-foreground">GPU Insurance Agent. Simulated testnet prototype. SICI uses a live oracle when available, with labelled example data as fallback. Premiums are model estimates, not quotes. Not financial advice.</p>
        </div>
      </footer>
    </body>
  </html>;
}
