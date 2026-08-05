"use client";

import { collectLandingHref } from "@/lib/collect/shared";
import { useHostAwareHref } from "@/lib/collect/use-host-href";
import { demoSection } from "@/lib/collect-landing-data";

/** Retour vers la landing — résolu côté client car dépendant de l'hôte. */
export function BackToLandingLink() {
  const href = useHostAwareHref(collectLandingHref, "/collect");

  return (
    <a
      href={href}
      className="pb-4 text-center text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80"
    >
      {demoSection.backLabel}
    </a>
  );
}
