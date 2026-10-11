import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ConnectComposer } from "@/components/composer/connect-composer";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { composerPage, quotePage } from "@/lib/landing-data";

export const metadata: Metadata = {
  title: composerPage.seoTitle,
  robots: { index: false, follow: false },
};

export default function ComposerPage() {
  return (
    <div className="relative min-h-dvh">
      <div
        className="qr-motif pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-96" aria-hidden />

      <div className="relative mx-auto w-full max-w-2xl px-5 pb-20 lg:max-w-5xl lg:px-10">
        <header className="flex items-center justify-between py-4">
          <Link href="/">
            <Wordmark className="text-xl" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="rise flex flex-col items-center gap-4 pb-10 pt-8 text-center lg:pb-12 lg:pt-10">
          <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
            {composerPage.eyebrow}
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {composerPage.title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted lg:text-[15px]">
            {composerPage.subtitle}
          </p>
        </div>

        <ConnectComposer defaultTables={quotePage.defaultTables} />
      </div>
    </div>
  );
}
