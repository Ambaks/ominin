import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CollectDemoStage } from "@/components/collect/demo/stage";
import { CollectWordmark } from "@/components/collect/landing/wordmark";
import { demoSettings } from "@/lib/collect/demo/data";
import { demoSection } from "@/lib/collect-landing-data";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { brandName, getRestaurant, restaurantThemeClass } from "@/lib/menu-data";

/*
 * Démo Collect personnalisée par prospect (visites commerciales) : la même
 * scène jouable que /collect/demo, jouée sur sa carte et habillée aux
 * couleurs du restaurant (le thème de sa carte) — sur toute la page, ou sur
 * le seul téléphone pour une démo « vrai téléphone » (demoSettings), dont
 * l'écran du restaurant reste celui d'Ominin, comme le vrai. Scène double sur
 * un laptop face au client ; sous lg, un volet à la fois, comme
 * /collect/demo. Données fictives : jamais indexée.
 */

export async function generateMetadata({
  params,
}: PageProps<"/collect/demo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  return {
    title: `Démo ${brandName(restaurant)} — Ominin Collect`,
    robots: { index: false, follow: false },
  };
}

export default async function ClientDemoPage({
  params,
}: PageProps<"/collect/demo/[slug]">) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  const { realPhone } = demoSettings(slug);

  return (
    <div
      // Les polices de l'établissement, comme sur son menu : sans elles, son thème retombait sur celles d'Ominin.
      className={`${brandFontVariables} ${realPhone ? "lg:justify-center" : (restaurantThemeClass(slug) ?? "")} flex min-h-dvh flex-col bg-background text-foreground`}
    >
      {/* Vrai téléphone : resserrée, la scène prend la hauteur (le retrait des
          volets, stage.tsx) ; sur un grand écran, la page se borne à la scène
          et se centre, sans bandes vides entre l'en-tête et les volets. */}
      <div
        className={`mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 ${
          realPhone ? "gap-3 py-3 lg:max-h-[60rem]" : "gap-6 py-6"
        }`}
      >
        <header className="flex items-center justify-between gap-3">
          <div>
            {/* Vrai téléphone : la page dit ce qu'elle montre, l'accroche du
                restaurant est sur son téléphone ; son nom de marque passe dessous,
                dans la police du texte — celle des titres décroche le « ō ». */}
            <p className="font-display text-2xl font-medium leading-tight">
              {realPhone ? "Click & collect" : restaurant.name}
            </p>
            <p className="text-xs text-muted">
              {realPhone ? brandName(restaurant) : restaurant.tagline}
            </p>
          </div>
          <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Démo
          </span>
        </header>

        <div className="my-auto">
          {/* Chaque appareil nommé, comme sur la landing (côte à côte seulement). */}
          {realPhone && (
            <p className="mb-2 hidden justify-between text-[11px] font-semibold uppercase tracking-[0.28em] text-muted lg:flex">
              <span>{demoSection.customerLabel}</span>
              <span>{demoSection.restaurantLabel}</span>
            </p>
          )}
          <CollectDemoStage variant="responsive" slug={slug} />
        </div>

        <footer className="flex items-center justify-center gap-2 text-xs text-muted">
          Propulsé par
          <span className="flex items-center gap-1.5">
            <Image src="/logo.png" alt="" width={16} height={16} />
            <CollectWordmark className="text-sm" />
          </span>
        </footer>
      </div>
    </div>
  );
}
