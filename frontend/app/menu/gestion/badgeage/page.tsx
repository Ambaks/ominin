"use client";

import { FeatureLocked } from "@/components/gestion/feature-locked";
import { Badgeuse } from "@/components/gestion/temps/badgeuse";
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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Badgeage
        </h1>
        <p className="mt-1 text-sm text-muted">
          Pointez votre arrivée et votre départ, d&rsquo;une signature.
        </p>
      </div>

      <Badgeuse
        staff={state.staff}
        entries={open.entries}
        onChange={open.reload}
      />
    </div>
  );
}
