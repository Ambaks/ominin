"use client";

import { Bars, StatTile } from "@/components/gestion/ui";
import type { LoyaltyStats } from "@/lib/gestion/fidelite";
import { CardIcon, GiftOpenIcon, PeopleIcon, PhoneCheckIcon } from "./icons";

/*
 * Ce que le programme rapporte : la part des commandes encaissées qui portent
 * une carte, les clients avec carte, les récompenses servies, les téléphones
 * reconnus — chaque chiffre avec son seul repère — puis cette part semaine
 * par semaine. Une semaine sans commande encaissée n'a pas de part : « — ».
 */

const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const weekLabel = (week: string) => shortDay.format(new Date(`${week}T00:00:00`));
const count = (n: number) => n.toLocaleString("fr-FR");
const plural = (n: number, one: string, many: string) => `${count(n)} ${n > 1 ? many : one}`;
const share = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;
const percent = (value: number) => `${value} %`;
/** Au-delà d'une douzaine de semaines, l'axe se clairsème et les barres se serrent. */
const DENSE_FROM = 12;
const labelEvery = (weeks: number) => (weeks > 2 * DENSE_FROM ? 4 : weeks > DENSE_FROM ? 2 : 1);

export function LoyaltyResults({ stats }: { stats: LoyaltyStats }) {
  const paid = stats.weeks.reduce((sum, week) => sum + week.paidOrders, 0);
  const withCard = stats.weeks.reduce((sum, week) => sum + week.cardOrders, 0);
  const rewards = stats.weeks.reduce((sum, week) => sum + week.rewardsUsed, 0);
  const overall = share(withCard, paid);
  const shares = stats.weeks.map((week) => share(week.cardOrders, week.paidOrders));
  // Plafond rond au-dessus de la plus haute barre : la grille dit une valeur
  // atteignable, une semaine vide ne l'écrase pas à zéro.
  const top = Math.max(10, Math.ceil(Math.max(...shares.map((value) => value ?? 0)) / 10) * 10);
  const dense = stats.weeks.length > DENSE_FROM;
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
          baseline={`${count(withCard)} sur ${plural(paid, "encaissée", "encaissées")}`}
          title="Part des commandes encaissées où le client a donné son numéro ou son email, depuis la première carte"
        />
        <StatTile
          entity="orders"
          icon={<PeopleIcon />}
          label="Clients avec carte"
          value={count(stats.members)}
          baseline={`${count(stats.returningMembers)} ${stats.returningMembers > 1 ? "sont revenus" : "est revenu"} commander`}
          title="Clients qui ont une carte ; ceux qui ont commandé au moins deux fois avec"
        />
        <StatTile
          entity="money"
          icon={<GiftOpenIcon />}
          label="Récompenses servies"
          value={count(rewards)}
          baseline={`${plural(stats.pointsOutstanding, "point", "points")} en circulation`}
          title="Récompenses offertes depuis le menu ; points gagnés et pas encore dépensés"
        />
        <StatTile
          entity="orders"
          icon={<PhoneCheckIcon />}
          label="Téléphones reconnus"
          value={count(stats.rememberedPhones)}
          baseline="reconnus d'une visite à l'autre"
          title="Téléphones que le menu reconnaît d'une visite à l'autre : ces clients n'ont plus rien à taper"
        />
      </div>
      <div className="g-plate px-5 pb-4 pt-4">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h3 className="text-g-body font-semibold">Commandes avec carte, par semaine</h3>
          <small className="whitespace-nowrap text-g-meta text-muted">% des encaissées</small>
        </div>
        <Bars
          entity="orders"
          dense={dense}
          data={stats.weeks.map((week, index) => ({
            label: index % every === 0 || (!dense && index === last) ? weekLabel(week.week) : "",
            value: shares[index] ?? 0,
            sub: dense ? undefined : shares[index] === null ? "—" : `${week.cardOrders}/${week.paidOrders}`,
          }))}
          ticks={[0, top / 2, top]}
          format={percent}
          label={`Part des commandes encaissées avec une carte, par semaine, du ${weekLabel(first.week)} au ${weekLabel(current.week)} : ${shares.map((value) => (value === null ? "pas de commande" : `${value} %`)).join(", ")} ; cette semaine ${shares[last] === null ? "pas encore de commande" : `${shares[last]} % (${current.cardOrders} sur ${current.paidOrders})`}, ${plural(current.rewardsUsed, "récompense servie", "récompenses servies")}, ${plural(current.newMembers, "nouveau client", "nouveaux clients")}`}
        />
      </div>
    </div>
  );
}
