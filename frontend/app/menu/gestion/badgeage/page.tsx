"use client";

import type { CSSProperties } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { Badgeuse } from "@/components/gestion/temps/badgeuse";
import { SectionHeading } from "@/components/gestion/ui";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useOpenEntries } from "@/lib/gestion/use-week";

/*
 * L'écran de l'équipe : la badgeuse partagée du comptoir, et rien d'autre.
 * Deux gestes, arrivée et départ. Les horaires prévus ne s'y lisent plus —
 * la tablette est celle de la maison, et chacun consulte les siens par le
 * lien de planning que son gérant lui a remis, sur son propre téléphone.
 */
export default function BadgeagePage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const open = useOpenEntries(state?.etablissement.id ?? "");

  if (!state) return null;
  if (!hasFeature("badgeage")) return <FeatureLocked feature="badgeage" />;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <SectionHeading
          level={1}
          title="Pointage"
          sub="Pointez votre arrivée et votre départ, d'une signature."
        />
      </div>
      <div className="g-rise" style={{ "--g-i": 1 } as CSSProperties}>
        <Badgeuse
          staff={state.staff}
          entries={open.entries}
          showHours={false}
          onChange={open.reload}
        />
      </div>
    </div>
  );
}
