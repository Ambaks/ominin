"use client";

import type { GroupFixture } from "@/lib/demo/groupe/data";
import { span, type Period, type PeriodVenue } from "@/lib/demo/groupe/simulation";
import { formatCents, formatEuroAmount, formatHour, formatPercent, formatWait, WEEKDAYS } from "@/lib/demo/reseau/format";
import { weekdayOf } from "@/lib/demo/sim";
import { Avatar, CARD, PANEL_TITLE, Trend, useReveal } from "./ui";

const monthName = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });
const month = (day: string) => monthName.format(new Date(day));
/** « 9 », « 1er ». */
const dayNumber = (day: string) => (Number(day.slice(8)) === 1 ? "1er" : String(Number(day.slice(8))));
const weekdayShort = (day: string) => `${WEEKDAYS[weekdayOf(day)].slice(0, 3)}.`;
/** « sam. 10 ». */
const shortDay = (day: string) => `${weekdayShort(day)} ${dayNumber(day)}`;
/** « vendredi 9 octobre ». */
const longDay = (day: string) => `${WEEKDAYS[weekdayOf(day)]} ${dayNumber(day)} ${month(day)}`;
const euros = (cents: number) => `${formatEuroAmount(cents)} €`;

/** « Du vendredi 9 au jeudi 15 octobre » : le mois une fois, à la fin, sauf s'il change en route. */
function rangeLabel(from: string, to: string): string {
  const start = from.slice(0, 7) === to.slice(0, 7) ? `${WEEKDAYS[weekdayOf(from)]} ${dayNumber(from)}` : longDay(from);
  return `Du ${start} au ${longDay(to)}`;
}

/** L'indice de la plus forte valeur, null quand rien ne s'est vendu. */
function bestIndex(values: number[]): number | null {
  const best = values.reduce((b, value, i) => (value > values[b] ? i : b), 0);
  return values[best] > 0 ? best : null;
}

/** La teinte d'une case : la plus creuse des heures reste visible, la meilleure est pleine. */
const fill = (color: string, ratio: number) => `color-mix(in srgb, ${color} ${Math.round((0.12 + 0.88 * ratio) * 100)}%, transparent)`;

/** Les jours de la période en barres, le meilleur plein et nommé dessous ; chaque valeur se lit aussi sans souris. */
function DayBars({ days, values }: { days: string[]; values: number[] }) {
  const max = Math.max(...values, 1);
  const best = bestIndex(values);
  return (
    <div className="flex flex-col gap-2">
      <ol aria-label="CA de chaque jour" className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <li key={day} className="relative flex flex-col gap-1">
            <span className="sr-only">
              {longDay(day)} : {euros(values[i])}
            </span>
            <span aria-hidden className="flex h-12 items-end" title={`${shortDay(day)} : ${euros(values[i])}`}>
              <span
                className={`groupe-grow block w-full origin-bottom rounded-t-[2px] bg-(--venue) ${i === best ? "" : "opacity-45"}`}
                style={{ height: `${(values[i] / max) * 100}%`, "--i": i } as React.CSSProperties}
              />
            </span>
            <span aria-hidden className={`text-center text-[0.6875rem] leading-tight ${i === best ? "text-foreground" : "text-faint"}`}>
              <span className="block">{weekdayShort(day)}</span>
              <span className="block tabular-nums">{dayNumber(day)}</span>
            </span>
          </li>
        ))}
      </ol>
      {best != null && (
        <p className="text-xs text-muted">
          Meilleur jour :{" "}
          <span className="font-medium text-foreground tabular-nums">
            {shortDay(days[best])} · {euros(values[best])}
          </span>
        </p>
      )}
    </div>
  );
}

/** Une case de la carte des heures : l'heure et son CA moyen dits aux lecteurs d'écran, une teinte pour les yeux, un contour si rien ne s'y vend. */
function HourCell({ hour, value, max, color, label, height }: { hour: number; value: number; max: number; color: string; label: string; height: string }) {
  return (
    <td className="p-0">
      <span className="sr-only">
        {formatHour(hour * 60)} : {euros(value)}
      </span>
      <span
        aria-hidden
        title={`${label}, ${formatHour(hour * 60)} : ${euros(value)} en moyenne`}
        className={`block rounded-[4px] ${height} ${value ? "" : "border border-hairline"}`}
        style={value ? { backgroundColor: fill(color, value / max) } : undefined}
      />
    </td>
  );
}

const STICKY = "sticky left-0 z-10 bg-surface";

/**
 * Les heures fortes de chaque adresse sur la période : une case par heure,
 * d'autant plus pleine que l'heure rapporte, rapportée à la meilleure heure
 * de l'adresse — son rythme se lit d'un coup d'œil, à côté des autres. Au
 * téléphone, le tableau se couche : une ligne par heure, une colonne par
 * adresse, toute la soirée sans défiler de côté.
 */
function Heatmap({ fixture, names, venues }: { fixture: GroupFixture; names: string[]; venues: PeriodVenue[] }) {
  // De la première ouverture à la dernière fermeture du groupe, en heures du jour de service (au-delà de 24 : la nuit).
  const spans = fixture.venues.map((venue) => span(venue.hours));
  const firstHour = Math.floor(Math.min(...spans.map((s) => s.open)) / 3600);
  const lastHour = Math.ceil(Math.max(...spans.map((s) => s.close)) / 3600);
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const rows = venues.map((period) => {
    const values = hours.map((h) => period.hourly[h - fixture.dayStartHour] ?? 0);
    const peak = bestIndex(values);
    return { values, max: Math.max(...values, 1), peak: peak == null ? null : hours[peak] };
  });
  const caption = <caption className="sr-only">Heures fortes : CA moyen de chaque heure sur la période, par adresse</caption>;
  return (
    <>
      {/* relative : les libellés réservés aux lecteurs d'écran (absolus) restent dans la zone qui défile. */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[34rem] table-fixed border-separate border-spacing-[3px] text-xs">
          {caption}
          <colgroup>
            <col className="w-36" />
            {hours.map((h) => (
              <col key={h} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={STICKY}>
                <span className="sr-only">Adresse</span>
              </th>
              {hours.map((h, i) => (
                <th key={h} scope="col" className="text-left font-normal whitespace-nowrap text-faint tabular-nums">
                  {i % 2 === 0 ? formatHour(h * 60) : <span className="sr-only">{formatHour(h * 60)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ values, max, peak }, v) => (
              <tr key={fixture.venues[v].slug}>
                <th scope="row" className={`${STICKY} pr-2 text-left font-medium whitespace-nowrap`}>
                  <span className="block truncate text-[0.8125rem]">{names[v]}</span>
                  <span className="block font-normal text-faint">
                    {peak == null ? "aucune vente" : `pic ${formatHour(peak * 60)}–${formatHour((peak + 1) * 60)}`}
                  </span>
                </th>
                {values.map((value, i) => (
                  <HourCell key={hours[i]} hour={hours[i]} value={value} max={max} color={fixture.venues[v].color} label={names[v]} height="h-8" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative md:hidden">
        <table className="w-full table-fixed border-separate border-spacing-[3px] text-xs">
          {caption}
          <colgroup>
            <col className="w-10" />
            {fixture.venues.map((venue) => (
              <col key={venue.slug} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Heure</span>
              </th>
              {fixture.venues.map((venue, v) => {
                const peak = rows[v].peak;
                return (
                  <th key={venue.slug} scope="col" className="pb-1 align-bottom font-medium">
                    <span className="flex flex-col items-center gap-1 text-center text-[0.6875rem] leading-tight">
                      <Avatar venue={venue} size={28} />
                      {venue.short}
                      <span className="font-normal text-faint">{peak == null ? "aucune vente" : `pic ${formatHour(peak * 60)}`}</span>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((h, i) => (
              <tr key={h}>
                <th scope="row" className="pr-1 text-left font-normal whitespace-nowrap text-faint tabular-nums">
                  {formatHour(h * 60)}
                </th>
                {rows.map(({ values, max }, v) => (
                  <HourCell key={fixture.venues[v].slug} hour={h} value={values[i]} max={max} color={fixture.venues[v].color} label={names[v]} height="h-6" />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** La semaine passée, adresse par adresse : ce qu'elle a fait, comment, et à quelles heures. */
export function Week({ fixture, names, period }: { fixture: GroupFixture; names: string[]; period: Period }) {
  const heading = useReveal<HTMLDivElement>();
  const cards = useReveal<HTMLDivElement>();
  const heatmap = useReveal<HTMLDivElement>();
  const { days, venues } = period;
  const total = venues.reduce((s, v) => s + v.revenue, 0);
  const previous = venues.reduce((s, v) => s + v.previous, 0);
  return (
    <section aria-labelledby="semaine" className="flex flex-col gap-4">
      <div {...heading}>
        <h2 id="semaine" className="font-display text-2xl font-medium">
          Les {days.length} derniers jours
        </h2>
        <p className="mt-1 text-sm text-muted">
          {rangeLabel(days[0], days[days.length - 1])} :{" "}
          <span className="font-semibold text-foreground tabular-nums">{euros(total)}</span>
          {" "}TTC pour le groupe
          {previous > 0 && (
            <>
              , <Trend ratio={total / previous - 1} suffix="sur la semaine d’avant" />
            </>
          )}
        </p>
      </div>

      <div {...cards} className={`overflow-hidden ${CARD}`}>
        {/*
          Chaque carte trace ses bords droit et bas ; la grille déborde d'un
          pixel à droite pour que la carte rogne celui de la dernière colonne.
          En nombre impair sur deux colonnes, la dernière s'étale : jamais de
          case vide.
        */}
        <div
          className="-mr-px grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[repeat(var(--venues),minmax(0,1fr))]"
          style={{ "--venues": fixture.venues.length } as React.CSSProperties}
        >
          {venues.map((venuePeriod, v) => {
            const venue = fixture.venues[v];
            return (
              <div
                key={venue.slug}
                className="flex min-w-0 flex-col gap-4 border-r border-b border-hairline p-4 sm:p-5 md:max-xl:odd:last:col-span-2"
                style={{ "--venue": venue.color } as React.CSSProperties}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar venue={venue} size={28} />
                  <h3 className="truncate font-semibold">{names[v]}</h3>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <p className="font-display text-[1.75rem] font-medium leading-none tabular-nums">
                    {formatEuroAmount(venuePeriod.revenue)}
                    <span className="ml-1 text-[0.6em] text-muted">€</span>
                  </p>
                  <p className="text-right text-[0.8125rem]">
                    <Trend ratio={venuePeriod.previous ? venuePeriod.revenue / venuePeriod.previous - 1 : null} suffix="vs semaine d’avant" />
                  </p>
                </div>
                <DayBars days={days} values={venuePeriod.daily} />
                <dl className="grid grid-cols-3 gap-3 border-t border-hairline pt-3">
                  <div className="flex flex-col justify-between gap-0.5">
                    <dt className="text-xs leading-tight text-faint">Addition moyenne</dt>
                    <dd className="text-sm font-medium tabular-nums">{formatCents(venuePeriod.averageBill)}</dd>
                  </div>
                  <div className="flex flex-col justify-between gap-0.5">
                    <dt className="text-xs leading-tight text-faint">Payé en ligne</dt>
                    <dd className="text-sm font-medium tabular-nums">{formatPercent(venuePeriod.onlineShare)}</dd>
                  </div>
                  <div className="flex flex-col justify-between gap-0.5">
                    <dt className="text-xs leading-tight text-faint">Service moyen</dt>
                    <dd className="text-sm font-medium tabular-nums">{formatWait(venuePeriod.serviceBar)} · {formatWait(venuePeriod.serviceKitchen)}</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
        <p className="px-4 py-3 text-xs text-faint sm:px-5">Service moyen : du ticket au service.</p>
      </div>

      <div {...heatmap} className={`p-4 sm:p-5 ${CARD}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className={PANEL_TITLE}>Heures fortes</h3>
          <p className="text-[0.8125rem] text-muted">CA moyen par heure · chaque adresse rapportée à sa meilleure heure</p>
        </div>
        <div className="mt-3">
          <Heatmap fixture={fixture} names={names} venues={venues} />
        </div>
      </div>
    </section>
  );
}
