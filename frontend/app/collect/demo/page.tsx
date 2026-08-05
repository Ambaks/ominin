import type { Metadata } from "next";
import Image from "next/image";
import { BackToLandingLink } from "@/components/collect/demo/back-link";
import { CollectDemoStage } from "@/components/collect/demo/stage";
import { CollectWordmark } from "@/components/collect/landing/wordmark";
import { demoSection } from "@/lib/collect-landing-data";

/*
 * Démo Collect en plein écran (cible mobile : la scène double de la landing
 * ne tient pas sous lg). Segment statique — « demo » est un slug réservé,
 * prioritaire sur /collect/[slug]. Données fictives : jamais indexée.
 */
export const metadata: Metadata = {
  title: "Démo — Ominin Collect",
  robots: { index: false, follow: false },
};

export default function CollectDemoPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={24} height={24} />
          <CollectWordmark className="text-base" />
        </p>
        <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {demoSection.badge}
        </span>
      </header>

      <CollectDemoStage variant="switch" />

      <BackToLandingLink />
    </div>
  );
}
