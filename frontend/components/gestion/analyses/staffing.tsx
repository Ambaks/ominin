"use client";

import { useMemo } from "react";
import { GlassButton } from "@/components/gestion/ui";
import { draftWeek, lastWeekHours, serverRatio, shiftHours, weekSavings, type StaffingData } from "@/lib/gestion/analyses";
import { ENCAISSER_WAIT_WARN_MINUTES, WEEK_DRAFT_HREF } from "@/lib/gestion/constants";
import { Card, Fact, money } from "./parts";

/**
 * Ce que la semaine prochaine pourrait coûter en heures, d'après le brouillon que le gérant
 * génère dans Équipe → Planning : les deux écrans partagent le même calcul.
 */
export function StaffingCard({ data, to }: { data: StaffingData; to: string }) {
  // La page se redessine à chaque commande reçue : le brouillon ne se refait que si les données changent.
  const draft = useMemo(() => draftWeek(data, to, serverRatio(data), ENCAISSER_WAIT_WARN_MINUTES), [data, to]);
  const hours = draft.shifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const savings = weekSavings(draft.usualHours, hours);
  const lastWeek = lastWeekHours(data, to);
  const hourlyCost = data.settings?.hourly_labor_cost ?? null;
  const label = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} h`;
  const saved = (value: number) =>
    hourlyCost != null ? `≈ ${money(value * hourlyCost)} · ${label(value)}` : `≈ ${label(value)}`;

  return (
    <Card
      title="Équipe de la semaine prochaine"
      sub="à vérifier avec les contrats, les congés et les pauses"
      right={<GlassButton href={WEEK_DRAFT_HREF}>Voir le planning proposé</GlassButton>}
    >
      {draft.shifts.length > 0 ? (
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            {lastWeek != null && <Fact label="Dernière semaine complète" value={label(lastWeek)} />}
            <Fact label="Semaine habituelle" value={label(draft.usualHours)} />
            <Fact label="Planning proposé" value={label(hours)} />
          </div>
          {draft.usualHours > 0 && savings.week >= 1 ? (
            <div>
              <Fact label="Économie sur la semaine" value={saved(savings.week)} />
              <Fact label="Sur un mois" value={saved(savings.month)} />
              <Fact label="Sur un an, si chaque semaine lui ressemble" value={saved(savings.year)} />
            </div>
          ) : (
            <p className="self-center text-g-meta text-muted">
              {draft.usualHours > 0 ? "Pas d’économie : le volume prévu demande au moins l’équipe habituelle." : "Pas encore de pointages pour comparer."}
            </p>
          )}
        </div>
      ) : (
        <p className="text-g-meta text-muted">Pas encore assez de commandes pour préparer une semaine.</p>
      )}
    </Card>
  );
}
