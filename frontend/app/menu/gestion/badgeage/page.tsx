"use client";

import { useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { ProfileRow } from "@/components/gestion/profile-row";
import { Badgeuse } from "@/components/gestion/temps/badgeuse";
import { MonPlanning, WeekNav } from "@/components/gestion/temps/planning";
import { weekStart } from "@/lib/gestion/temps";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useOpenEntries, useWeek } from "@/lib/gestion/use-week";

/*
 * L'écran de l'équipe : la badgeuse partagée du comptoir, puis la semaine du
 * membre connecté — ce qui lui est prévu, ce qu'il a badgé.
 */
export default function BadgeagePage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [start, setStart] = useState(() => weekStart(new Date()));
  const etablissementId = state?.etablissement.id ?? "";
  const { data, reload } = useWeek(etablissementId, start);
  const open = useOpenEntries(etablissementId);

  const badged = () => {
    open.reload();
    reload();
  };

  if (!state) return null;
  if (!hasFeature("roles")) return <FeatureLocked />;

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
        etablissementId={state.etablissement.id}
        members={state.members}
        entries={open.entries}
        onChange={badged}
      />

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-medium">Ma semaine</h2>
        <WeekNav start={start} onChange={setStart} />
        <MonPlanning
          userId={state.userId}
          shifts={data.shifts}
          entries={data.entries}
          start={start}
        />
      </section>

      <ProfileRow state={state} />
    </div>
  );
}
