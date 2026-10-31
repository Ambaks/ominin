"use client";

import { useCallback, useEffect, useState } from "react";
import { BullesBoard } from "@/components/gestion/bulles/board";
import { EmptyState, SectionHeading, Shimmer } from "@/components/gestion/ui";
import { currentServiceDate } from "@/lib/bulles/format";
import { loadSetup, useBulleDay, type BulleSetup } from "@/lib/gestion/bulles-api";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Table } from "@/lib/gestion/types";

/*
 * L'onglet Réservations : le soir de service, créneau par créneau, ce que
 * chaque bulle a de réservé — confirmé (la bulle est tenue) ou en attente
 * (des groupes qui paient encore leurs places). L'accueil y coche les
 * arrivées et encaisse le reste ; le gérant y prend une réservation au
 * téléphone et règle prix, créneaux et bulles.
 */

export default function BullesPage() {
  const state = useGestion();
  const { hasFeature, role } = useGestionAccess();
  const etablissementId = state?.etablissement.id;
  const [setup, setSetup] = useState<BulleSetup | null>(null);
  const [setupVersion, setSetupVersion] = useState(0);

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    void loadSetup(etablissementId).then((loaded) => {
      if (!cancelled) setSetup(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [etablissementId, setupVersion]);
  const reloadSetup = useCallback(() => setSetupVersion((count) => count + 1), []);

  if (state && !hasFeature("bulles")) {
    return (
      <div className="grid gap-6">
        <SectionHeading level={1} title="Réservations" />
        <EmptyState text="La réservation en ligne s'ouvre sur demande : parlez-en à Ominin." />
      </div>
    );
  }
  if (!state || !setup || !etablissementId) {
    return (
      <div aria-busy className="grid gap-6">
        <SectionHeading level={1} title="Réservations" />
        <Shimmer className="h-(--g-control) max-w-sm" />
        <Shimmer className="h-64" />
      </div>
    );
  }
  return (
    <LiveBoard
      etablissementId={etablissementId}
      slug={state.etablissement.slug}
      dayEndHour={state.dayEndHour}
      tables={state.tables}
      gerant={role === "gerant"}
      setup={setup}
      reloadSetup={reloadSetup}
    />
  );
}

/** Le tableau sur la base : le soir choisi, relu en direct. */
function LiveBoard({
  etablissementId,
  dayEndHour,
  gerant,
  reloadSetup,
  ...board
}: {
  etablissementId: string;
  slug: string;
  dayEndHour: number;
  tables: Table[];
  gerant: boolean;
  setup: BulleSetup;
  reloadSetup: () => void;
}) {
  const [date, setDate] = useState(() => currentServiceDate(dayEndHour));
  const day = useBulleDay(etablissementId, date, dayEndHour);
  return (
    <BullesBoard
      {...board}
      dayEndHour={dayEndHour}
      gerant={gerant}
      date={date}
      onDateChange={setDate}
      day={day}
      settings={gerant ? { etablissementId, onSaved: reloadSetup } : undefined}
    />
  );
}
