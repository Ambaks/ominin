import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BullesDemoGestion } from "@/components/bulles/demo-gestion";
import { bulleDemoSlug } from "@/lib/bulles/demo";
import { carteUrl, siteUrlOf } from "@/lib/bulles/links";

/*
 * La gestion des bulles de la démonstration du Boho, sans compte : ce que le
 * gérant verrait dans son onglet Bulles. Jamais indexée.
 */
export const metadata: Metadata = {
  title: "BOHO — Bulles (démonstration)",
  robots: { index: false, follow: false },
};

export default async function DemoGestionPage({ params }: PageProps<"/menu/demo/[slug]/gestion">) {
  const { slug } = await params;
  const live = bulleDemoSlug(slug);
  if (!live) notFound();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ember-2">Démonstration · Gestion</p>
          <p className="font-display text-xl font-medium">BOHO</p>
        </div>
        <nav aria-label="La démonstration" className="flex flex-wrap gap-2 text-sm">
          <a href={siteUrlOf(live)} className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4">
            Le site
          </a>
          <a href={carteUrl(live)} className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4">
            La carte
          </a>
        </nav>
      </header>
      <BullesDemoGestion />
    </div>
  );
}
