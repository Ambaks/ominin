"use client";

import type { LoyaltyStats, LoyaltyWeek } from "@/lib/gestion/fidelite";

/*
 * En tête de l'onglet Fidélité : ce que le programme rapporte. Quatre
 * chiffres — la part des commandes réglées qui portent une carte, les
 * membres et ceux qui reviennent, les récompenses servies, les téléphones
 * reconnus — puis cette part semaine par semaine, pour voir si elle monte.
 */

const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const weekLabel = (week: string) => shortDay.format(new Date(`${week}T00:00:00`));
const count = (n: number) => n.toLocaleString("fr-FR");
const share = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

function Tile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-hairline bg-surface px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-3xl tabular-nums">{value}</p>
      <p className="text-xs text-faint">{detail}</p>
    </div>
  );
}

function WeeklyShare({ weeks }: { weeks: LoyaltyWeek[] }) {
  const shares = weeks.map((week) => share(week.cardOrders, week.paidOrders) ?? 0);
  // Échelle ronde au-dessus de la plus haute barre, pour que la grille dise
  // une valeur atteignable ; une semaine vide ne l'écrase pas à zéro.
  const top = Math.max(10, Math.ceil(Math.max(...shares) / 10) * 10);
  // Au-delà d'une douzaine de semaines, une étiquette sur deux.
  const labelEvery = weeks.length > 12 ? 2 : 1;
  const last = weeks.length - 1;

  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface px-4 py-4">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Commandes avec carte, par semaine</span>
        <span className="text-xs text-faint">part des commandes réglées</span>
      </figcaption>
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 border-t border-dashed border-hairline" />
        <span aria-hidden="true" className="absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-faint">
          {top}&nbsp;%
        </span>
        <div className="flex h-36 items-end gap-[3px] border-b border-hairline pt-4">
          {weeks.map((week, i) => {
            const value = shares[i];
            const label = `Semaine du ${weekLabel(week.week)} : ${value} % des commandes réglées avec une carte (${week.cardOrders} sur ${week.paidOrders}), ${week.rewardsUsed} ${week.rewardsUsed === 1 ? "récompense servie" : "récompenses servies"}, ${week.newMembers} ${week.newMembers === 1 ? "nouveau membre" : "nouveaux membres"}.`;
            return (
              <div
                key={week.week}
                tabIndex={0}
                aria-label={label}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <div
                  className="w-full max-w-10 rounded-t-[4px] bg-ember-1 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{ height: `${(value / top) * 100}%`, minHeight: value > 0 ? 2 : 0 }}
                />
                {i === last && (
                  <span
                    className="pointer-events-none absolute text-[11px] font-semibold tabular-nums group-hover:opacity-0 group-focus-visible:opacity-0"
                    style={{ bottom: `calc(${(value / top) * 100}% + 4px)` }}
                  >
                    {value}&nbsp;%
                  </span>
                )}
                <div
                  role="tooltip"
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden w-44 rounded-xl border border-hairline bg-background px-3 py-2 text-left text-[11px] leading-snug shadow-lg group-hover:block group-focus-visible:block ${
                    i > last / 2 ? "right-0" : "left-0"
                  }`}
                >
                  <p className="font-semibold">Semaine du {weekLabel(week.week)}</p>
                  <p className="tabular-nums">
                    {value}&nbsp;% · {week.cardOrders} sur {week.paidOrders} commandes
                  </p>
                  <p className="text-muted">
                    {week.rewardsUsed} {week.rewardsUsed === 1 ? "récompense" : "récompenses"} ·{" "}
                    {week.newMembers} {week.newMembers === 1 ? "nouveau membre" : "nouveaux membres"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="mt-1.5 flex gap-[3px]">
          {weeks.map((week, i) => (
            <span key={week.week} className="flex-1 truncate text-center text-[10px] text-faint">
              {i % labelEvery === 0 || i === last ? weekLabel(week.week) : ""}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Commandes avec carte, par semaine</caption>
        <thead>
          <tr>
            <th scope="col">Semaine du</th>
            <th scope="col">Commandes réglées</th>
            <th scope="col">Avec carte</th>
            <th scope="col">Récompenses</th>
            <th scope="col">Nouveaux membres</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.week}>
              <th scope="row">{weekLabel(week.week)}</th>
              <td>{week.paidOrders}</td>
              <td>{week.cardOrders}</td>
              <td>{week.rewardsUsed}</td>
              <td>{week.newMembers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function LoyaltyResults({ stats }: { stats: LoyaltyStats }) {
  if (stats.weeks.length === 0) {
    return (
      <p className="text-sm text-muted">
        Les résultats apparaissent dès la première carte de fidélité.
      </p>
    );
  }
  const paid = stats.weeks.reduce((sum, week) => sum + week.paidOrders, 0);
  const withCard = stats.weeks.reduce((sum, week) => sum + week.cardOrders, 0);
  const rewards = stats.weeks.reduce((sum, week) => sum + week.rewardsUsed, 0);
  const thisWeek = stats.weeks[stats.weeks.length - 1];
  const overall = share(withCard, paid);
  const current = share(thisWeek.cardOrders, thisWeek.paidOrders);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Commandes avec carte"
          value={overall === null ? "—" : `${overall} %`}
          detail={`${count(withCard)} sur ${count(paid)} réglées${current === null ? "" : ` · cette semaine ${current} %`}`}
        />
        <Tile
          label="Membres"
          value={count(stats.members)}
          detail={`${count(stats.returningMembers)} ${stats.returningMembers === 1 ? "est revenu" : "sont revenus"} avec leur carte`}
        />
        <Tile
          label="Récompenses servies"
          value={count(rewards)}
          detail={`${count(stats.pointsOutstanding)} points en circulation`}
        />
        <Tile
          label="Téléphones reconnus"
          value={count(stats.rememberedPhones)}
          detail="ces clients n’ont plus rien à taper"
        />
      </div>
      <WeeklyShare weeks={stats.weeks} />
    </div>
  );
}
