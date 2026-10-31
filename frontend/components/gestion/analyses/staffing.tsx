import { GlassButton } from "@/components/gestion/ui";
import { lastWeekHours, type StaffingData, type WeekProposal } from "@/lib/gestion/analyses";
import { WEEK_DRAFT_HREF } from "@/lib/gestion/constants";
import { Card, Fact, money } from "./parts";

/**
 * Ce que la semaine prochaine pourrait coûter en heures, d'après le brouillon que le gérant
 * génère dans Équipe → Planning : les deux écrans partagent le même calcul.
 */
export function StaffingCard({
  data,
  to,
  proposal,
}: {
  data: StaffingData;
  to: string;
  proposal: WeekProposal | null;
}) {
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
      {proposal ? (
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            {lastWeek != null && <Fact label="Dernière semaine complète" value={label(lastWeek)} />}
            <Fact label="Semaine habituelle" value={label(proposal.usualHours)} />
            <Fact label="Planning proposé" value={label(proposal.hours)} />
          </div>
          {proposal.savings.week >= 1 ? (
            <div>
              <Fact label="Économie sur la semaine" value={saved(proposal.savings.week)} />
              <Fact label="Sur un mois" value={saved(proposal.savings.month)} />
              <Fact label="Sur un an, si chaque semaine lui ressemble" value={saved(proposal.savings.year)} />
            </div>
          ) : (
            <p className="self-center text-g-meta text-muted">
              Pas d’économie : le volume prévu demande au moins l’équipe habituelle.
            </p>
          )}
        </div>
      ) : (
        <p className="text-g-meta text-muted">Pas encore assez de commandes et de pointages pour préparer une semaine.</p>
      )}
    </Card>
  );
}
