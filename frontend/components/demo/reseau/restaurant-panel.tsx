"use client";

import { useEffect, useRef } from "react";
import type { NetworkFixture } from "@/lib/demo/reseau/data";
import {
  capitalize,
  formatBasket,
  formatCents,
  formatClock,
  formatHour,
  formatInteger,
  formatPercent,
  formatEuroAmount,
  WEEKDAYS,
} from "@/lib/demo/reseau/format";
import { activity, queueAt, type QueueStatus, type RestaurantSnapshot, type SimDay } from "@/lib/demo/reseau/simulation";
import { ActivityChart, ChartLegend, smooth } from "./activity-chart";
import { Figure } from "./figure";
import { Joined } from "./joined";

const GROUPS: { status: QueueStatus; title: string }[] = [
  { status: "en_preparation", title: "Commandes QR en préparation" },
  { status: "prete", title: "Prêtes, en attente du client" },
  { status: "a_regler", title: "À régler en caisse" },
];

/** Un restaurant ouvert depuis la carte, le fil ou le classement : sa file, en direct. */
export function RestaurantPanel({
  fixture,
  sim,
  lastWeek,
  snapshot,
  seconds,
  rank,
  networkShare,
  range,
  onClose,
}: {
  fixture: NetworkFixture;
  sim: SimDay;
  lastWeek: SimDay;
  snapshot: RestaurantSnapshot;
  seconds: number;
  /** Place au CA du jour dans le réseau. */
  rank: number;
  /** Part des commandes passées par QR sur tout le réseau, pour comparer. */
  networkShare: number;
  range: { start: number; end: number };
  onClose: () => void;
}) {
  const restaurant = fixture.restaurants[snapshot.index];
  const { display } = fixture;
  const heading = useRef<HTMLHeadingElement>(null);
  const queue = queueAt(sim, snapshot.index, seconds);
  const ticket = snapshot.orders ? snapshot.revenue / snapshot.orders : 0;
  const share = snapshot.orders ? snapshot.orders / (snapshot.orders + snapshot.walkIns) : 0;
  const bucket = display.bucketMinutes * 60;
  const orders = sim.restaurants[snapshot.index].orders;
  // Sa courbe suit ses propres horaires du jour, sinon ceux du réseau.
  const hours = sim.restaurants[snapshot.index].hours;
  const own = hours ? { start: Math.floor(hours.open / 60) * 3600, end: Math.ceil(hours.close / 60) * 3600 } : range;
  // La grammaire de la grande courbe ; quelques commandes par tranche : la
  // courbe du jour se lisse comme celle de la semaine dernière.
  const step = display.sampleMinutes * 60;
  const curveOf = (list: typeof orders, until: number, minutes: number) =>
    smooth(activity(list, own.start, until, bucket, step), minutes / display.sampleMinutes);
  const today = curveOf(orders, Math.min(seconds, own.end), display.smoothingMinutes);
  const reference = curveOf(lastWeek.restaurants[snapshot.index].orders, own.end, display.smoothingMinutes);
  // L'axe couvre la journée entière et l'instant : le bout lissé de la courbe
  // du jour (moyenne tronquée) peut dépasser la journée lissée d'un bloc.
  const scaleMax =
    Math.max(
      ...curveOf(orders, own.end, display.smoothingMinutes).map((p) => p.count),
      ...today.map((p) => p.count),
      ...reference.map((p) => p.count),
      1
    ) * display.headroom;

  useEffect(() => {
    heading.current?.focus();
  }, [snapshot.index]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  const status = snapshot.open
    ? `${snapshot.rush ? "En rush · ouvert" : "Ouvert"} jusqu’à ${formatHour(snapshot.hours!.close)}`
    : snapshot.hours
      ? seconds < snapshot.hours.open * 60
        ? `Fermé · ouvre à ${formatHour(snapshot.hours.open)}`
        : `Fermé depuis ${formatHour(snapshot.hours.close)}`
      : "Fermé";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <span aria-hidden className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-foreground/20 lg:hidden" />
      <div className="flex items-start gap-3 border-b border-hairline px-5 pb-4 pt-3 lg:pt-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h2
              ref={heading}
              tabIndex={-1}
              className="truncate font-display text-xl font-medium outline-none"
            >
              {restaurant.name}
            </h2>
            {snapshot.isNew && <span className="shrink-0 text-xs text-faint">Nouveau</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{restaurant.address}</p>
          <p className="mt-2 flex items-center gap-2 text-xs font-medium">
            <span
              aria-hidden
              className={`size-2 rounded-full ${
                snapshot.rush ? "reseau-live bg-ember-2" : snapshot.open ? "bg-foreground/60" : "border border-faint"
              }`}
            />
            {status}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche du restaurant"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-8 [mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]">
        <dl className="grid grid-cols-2 gap-px border-b border-hairline bg-hairline">
          {[
            {
              label: "Commandes QR",
              value: formatInteger(snapshot.orders),
              // Sans QR, le client passe en caisse : Ominin ne le voit pas, d'où « ≈ ».
              note: snapshot.orders ? (
                <Joined parts={[`part QR ≈\u00a0${formatPercent(share)}`, `réseau ${formatPercent(networkShare)}`]} />
              ) : (
                "Aucune"
              ),
            },
            {
              label: "CA QR",
              value: formatEuroAmount(snapshot.revenue),
              unit: "€",
              note: (
                <Joined
                  parts={[
                    `${rank}${rank === 1 ? "er" : "e"} du réseau`,
                    ...(snapshot.orders ? [`panier ${formatCents(ticket)}`] : []),
                  ]}
                />
              ),
            },
            {
              label: "Délai annoncé",
              value: snapshot.waitNow == null ? "—" : formatInteger(Math.round(snapshot.waitNow)),
              unit: snapshot.waitNow == null ? undefined : "min",
              note: `≈\u00a0${formatInteger(snapshot.kitchen.total)} en cuisine, dont ${formatInteger(snapshot.kitchen.qr)} QR`,
              accent: snapshot.rush,
            },
            {
              label: "File en caisse",
              value: formatInteger(snapshot.tillLine),
              unit: "pers.",
              approx: true,
              note: `sans QR : ≈\u00a0${formatInteger(snapshot.tillLineWithoutQr)}`,
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface px-5 py-2">
              <dt className="text-[0.6875rem] font-medium uppercase tracking-wider text-faint">{stat.label}</dt>
              <dd className="mt-0.5">
                <span className={`block font-display text-2xl leading-tight ${stat.accent ? "text-ember-2" : ""}`}>
                  <Figure value={stat.value} unit={stat.unit} approx={stat.approx} />
                </span>
                <span className="block text-[0.8125rem] text-muted">{stat.note}</span>
              </dd>
            </div>
          ))}
        </dl>
        {restaurant.country !== "FR" && (
          <p className="border-b border-hairline px-5 py-2.5 text-[0.8125rem] text-muted">
            Prix de la carte nationale, en euros : la carte suisse n’est pas publiée.
          </p>
        )}

        <div className="flex flex-col gap-4 px-5 py-4">
          <section aria-label="Commandes du restaurant au fil de la journée" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[0.8125rem] font-medium text-muted">
                {`Commandes QR / ${display.bucketMinutes}\u00a0min`}
              </h3>
              <ChartLegend
                reference={`${capitalize(WEEKDAYS[sim.weekday])} dernier`}
                pace={seconds >= own.start && seconds <= own.end ? (today.at(-1)?.count ?? null) : null}
                unit={`cmd / ${display.bucketMinutes}\u00a0min`}
              />
            </div>
            <div className="h-24">
              <ActivityChart
                today={today}
                reference={reference}
                start={own.start}
                end={own.end}
                now={seconds}
                label={`Commandes QR à ${restaurant.name}, aujourd’hui et le même jour de la semaine dernière.`}
                tickHours={display.tickHours}
                scaleMax={scaleMax}
                ticks={display.panelChartTicks}
                forecast={null}
              />
            </div>
          </section>
          {GROUPS.map(({ status: group, title }) => {
            // Par heure : l'heure annoncée en préparation, l'heure de prêt
            // ensuite — comme l'écran du comptoir.
            const time = (entry: (typeof queue)[number]) =>
              group === "en_preparation"
                ? entry.order.estimatedAt
                : group === "prete"
                  ? entry.order.readyAt
                  : entry.order.createdAt;
            const entries = queue.filter((entry) => entry.status === group).sort((a, b) => time(a) - time(b));
            if (!entries.length && group === "a_regler") return null;
            return (
              <section key={group} aria-label={title}>
                <h3 className="mb-2 flex items-baseline justify-between text-[0.8125rem] font-medium text-muted">
                  {title}
                  <span className="tabular-nums">{entries.length}</span>
                </h3>
                {entries.length === 0 ? (
                  <p className="text-xs text-faint">Aucune commande.</p>
                ) : (
                  <ul className="flex flex-col">
                    {entries.map(({ order }) => {
                      const late = Math.max(0, Math.ceil((seconds - order.estimatedAt) / 60));
                      const progress = Math.min(
                        1,
                        (seconds - order.paidAt) / Math.max(1, order.estimatedAt - order.paidAt)
                      );
                      return (
                        <li
                          key={order.number}
                          className="reseau-enter grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-hairline py-2 first:border-t-0"
                        >
                          <span className="row-span-2 font-display text-xl font-medium leading-tight">{order.number}</span>
                          <span className="line-clamp-2 text-sm">
                            {formatBasket(order.lines)}
                            {/* Réglée en caisse, elle n'est partie en cuisine qu'après. */}
                            {!order.online && order.paidAt <= seconds && (
                              <span className="ml-2 whitespace-nowrap rounded bg-foreground/[0.08] px-1.5 py-px text-xs text-foreground/85">
                                {`réglée en caisse à ${formatClock(order.paidAt)}`}
                              </span>
                            )}
                          </span>
                          <span className="grid grid-cols-[9.5rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-[0.8125rem] text-faint tabular-nums">
                            <span>
                              {group === "en_preparation"
                                ? `Prête vers ${formatClock(order.estimatedAt)}`
                                : group === "prete"
                                  ? `Prête à ${formatClock(order.readyAt)}`
                                  : `Commandée à ${formatClock(order.createdAt)}`}
                              {group === "en_preparation" && late > 0 && (
                                <span className="text-(--reseau-down)"> +{late}&nbsp;min</span>
                              )}
                            </span>
                            {group === "en_preparation" ? (
                              <span className="h-1 overflow-hidden rounded-full bg-foreground/[0.08]">
                                <span
                                  className="block h-full rounded-full bg-foreground/60 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                                  style={{ width: `${progress * 100}%` }}
                                />
                              </span>
                            ) : (
                              <span />
                            )}
                            <span className="text-right">{formatCents(order.total)}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}

        </div>
      </div>
    </div>
  );
}
