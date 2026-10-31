"use client";

import { Bars, StatTile } from "@/components/gestion/ui";
import type { LoyaltyStats } from "@/lib/gestion/fidelite";
import { CardIcon, GiftOpenIcon, PeopleIcon, PhoneCheckIcon } from "./icons";

/*
 * Ce que le programme rapporte : la part des commandes réglées qui portent
 * une carte, les membres, les récompenses servies, les téléphones reconnus —
 * chaque chiffre avec son seul repère — puis cette part semaine par semaine.
 */

const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const weekLabel = (week: string) => shortDay.format(new Date(`${week}T00:00:00`));
const count = (n: number) => n.toLocaleString("fr-FR");
const share = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;
const percent = (value: number) => `${value} %`;
/** Beaucoup de colonnes : une étiquette sur deux, puis sur quatre. */
const labelEvery = (weeks: number) => (weeks > 24 ? 4 : weeks > 12 ? 2 : 1);

export function LoyaltyResults({ stats }: { stats: LoyaltyStats }) {
  const paid = stats.weeks.reduce((sum, week) => sum + week.paidOrders, 0);
  const withCard = stats.weeks.reduce((sum, week) => sum + week.cardOrders, 0);
  const rewards = stats.weeks.reduce((sum, week) => sum + week.rewardsUsed, 0);
  const overall = share(withCard, paid);
  const shares = stats.weeks.map((week) => share(week.cardOrders, week.paidOrders) ?? 0);
  // Plafond rond au-dessus de la plus haute barre : la grille dit une valeur
  // atteignable, une semaine vide ne l'écrase pas à zéro.
  const top = Math.max(10, Math.ceil(Math.max(...shares) / 10) * 10);
  const every = labelEvery(stats.weeks.length);
  const last = stats.weeks.length - 1;
  const first = stats.weeks[0];
  const current = stats.weeks[last];

  return (
    <div className="grid gap-g-gap">
      <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          entity="orders"
          icon={<CardIcon />}
          label="Commandes avec carte"
          value={overall === null ? "—" : percent(overall)}
          baseline={`${count(withCard)} sur ${count(paid)} réglées`}
          title="Part des commandes réglées où le client a donné son numéro ou son email, depuis la première carte"
        />
        <StatTile
          entity="orders"
          icon={<PeopleIcon />}
          label="Membres"
          value={count(stats.members)}
          baseline={`${count(stats.returningMembers)} ${stats.returningMembers === 1 ? "revenu" : "revenus"} avec leur carte`}
          title="Clients qui ont une carte ; ceux qui ont commandé au moins deux fois avec"
        />
        <StatTile
          entity="money"
          icon={<GiftOpenIcon />}
          label="Récompenses servies"
          value={count(rewards)}
          baseline={`${count(stats.pointsOutstanding)} points en circulation`}
          title="Récompenses offertes depuis le menu ; points gagnés et pas encore dépensés"
        />
        <StatTile
          entity="orders"
          icon={<PhoneCheckIcon />}
          label="Téléphones reconnus"
          value={count(stats.rememberedPhones)}
          baseline="n'ont plus rien à taper"
          title="Téléphones que le menu reconnaît d'une visite à l'autre"
        />
      </div>
      <div className="g-plate px-5 pb-4 pt-4.5">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-g-h2">Commandes avec carte, par semaine</h3>
          <small className="whitespace-nowrap text-g-meta text-muted">% des réglées</small>
        </div>
        <Bars
          entity="orders"
          dense={stats.weeks.length > 12}
          data={stats.weeks.map((week, index) => ({
            label:
              index % every === 0 || index === last ? weekLabel(week.week) : "",
            value: shares[index],
            sub: `${week.cardOrders}/${week.paidOrders}`,
          }))}
          ticks={[0, top / 2, top]}
          format={percent}
          label={`Part des commandes réglées avec une carte, par semaine, du ${weekLabel(first.week)} au ${weekLabel(current.week)} : ${shares.map((value) => `${value} %`).join(", ")} ; cette semaine ${shares[last]} % (${current.cardOrders} sur ${current.paidOrders}), ${current.rewardsUsed} ${current.rewardsUsed === 1 ? "récompense servie" : "récompenses servies"}, ${current.newMembers} ${current.newMembers === 1 ? "nouveau membre" : "nouveaux membres"}`}
        />
      </div>
    </div>
  );
}
