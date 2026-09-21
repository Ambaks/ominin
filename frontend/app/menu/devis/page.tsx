import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { QuoteStart } from "@/components/quote/quote-start";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { pricingSection, quotePage } from "@/lib/landing-data";
import { parseQuote } from "@/lib/quote";

export const metadata: Metadata = {
  title: quotePage.seoTitle,
  robots: { index: false, follow: false },
};

export default async function DevisPage({
  searchParams,
}: PageProps<"/menu/devis">) {
  const requested = parseQuote(await searchParams);
  // Sans offre dans l'URL : la plus choisie, avec un nombre de tables de départ.
  const featured =
    pricingSection.plans.find((plan) => plan.badge) ?? pricingSection.plans[0];
  const initial = {
    plan: requested?.plan ?? featured.id,
    tables: requested?.tables || quotePage.defaultTables,
    omilink: requested?.omilink ?? false,
    square: requested?.square ?? false,
  };

  return (
    <div className="relative min-h-dvh">
      <div
        className="qr-motif pointer-events-none absolute inset-x-0 top-0 h-96 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_0%,black,transparent)]"
        aria-hidden
      />
      <div
        className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-96"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-2xl px-5 pb-20 lg:max-w-5xl lg:px-10">
        <header className="flex items-center justify-between py-4">
          <Link href="/">
            <Wordmark className="text-xl" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="rise flex flex-col items-center gap-4 pb-10 pt-8 text-center lg:pb-14 lg:pt-12">
          <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
            {quotePage.eyebrow}
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {quotePage.title}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted lg:text-[15px]">
            {quotePage.subtitle}
          </p>
        </div>

        <QuoteStart initial={initial} />
      </div>
    </div>
  );
}
