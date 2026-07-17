"use client";

import Link from "next/link";
import { ComptesTabs } from "@/components/clip/espace/comptes-tabs";
import { useClipData } from "@/lib/clip/context";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import { CLIP_PLATFORMS } from "@/lib/clip/provider/types";

/*
 * Page « Créer des comptes » (bientôt disponible) : annonce la création de
 * comptes sociaux neufs depuis l'espace — ouverts, reliés et prêts à publier
 * sans passer par chaque plateforme. Purement statique en attendant.
 */

export default function CreationComptesPage() {
  const { basePath } = useClipData();

  return (
    <div className="flex flex-col gap-8">
      <ComptesTabs active="creation" />

      <header className="rise" style={{ animationDelay: "40ms" }}>
        <p className="flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          <span className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
            Bientôt disponible
          </span>
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight">
          La création de comptes arrive
        </h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Ouvrez de nouveaux comptes sociaux sans quitter votre espace : ils
          naissent déjà reliés, prêts à recevoir vos clips — aucune
          configuration sur les plateformes.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CLIP_PLATFORMS.map((platform, index) => (
          <div
            key={platform}
            style={{ animationDelay: `${100 + index * 60}ms` }}
            className="rise flex flex-col gap-1.5 rounded-2xl border border-dashed border-hairline p-5"
          >
            <p className="text-sm font-semibold">{PLATFORM_LABELS[platform]}</p>
            <p className="text-sm text-faint">Compte neuf, relié d&apos;office</p>
          </div>
        ))}
      </div>

      <section
        className="rise flex flex-col items-start gap-4 rounded-2xl border border-hairline bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "280ms" }}
      >
        <div>
          <h2 className="font-display text-lg font-medium">En attendant</h2>
          <p className="mt-1 text-sm text-muted">
            Vos comptes existants se relient en un clic, dès aujourd&apos;hui.
          </p>
        </div>
        <Link
          href={`${basePath}/comptes`}
          className="ember-gradient shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-background transition-transform active:scale-[0.98]"
        >
          Connecter mes comptes
        </Link>
      </section>
    </div>
  );
}
