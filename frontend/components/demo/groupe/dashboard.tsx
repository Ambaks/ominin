"use client";

import { useMemo, useRef } from "react";
import { AnimatedNumber } from "@/components/demo/reseau/animated-number";
import { Figure } from "@/components/demo/reseau/figure";
import { useSimClock } from "@/components/demo/use-sim-clock";
import type { GroupVenue } from "@/lib/demo/groupe/catalog";
import { getGroup } from "@/lib/demo/groupe/data";
import {
  cumulative,
  latestOrders,
  periodSummary,
  projection,
  revenueAt,
  salesBuckets,
  serviceAverages,
  simulateDay,
  venueSnapshot,
  waitingSince,
  type GroupOrder,
  type Period,
} from "@/lib/demo/groupe/simulation";
import { basketParts, capitalize, formatClock, formatHour, formatInteger, formatPercent, formatWait, WEEKDAYS } from "@/lib/demo/reseau/format";
import { addDays, minutesOf, weekdayOf, type Clock } from "@/lib/demo/sim";
import { DayChart } from "./day-chart";
import { Dialog } from "./dialog";
import { OrderFeed } from "./order-feed";
import { ArrowIcon, Avatar, CARD, LateIcon, LINK, LiveDot, PANEL_TITLE, rise, Sparkline, Trend } from "./ui";
import { VenuePanel } from "./venue-panel";
import { Week } from "./week";

/*
 * Vue groupe : ce qui se passe, maintenant, dans chaque établissement d'un
 * même propriétaire, et la semaine écoulée côte à côte. Tout vient de la
 * simulation (lib/demo/groupe) : le serveur fixe l'instant, lit les cartes
 * et calcule la période ; le navigateur fait avancer l'horloge, simule la
 * journée et relit l'état du groupe à chaque seconde. Le bandeau sous
 * l'en-tête dit, à toutes les tailles, que c'est une démonstration, et
 * ouvre ses hypothèses.
 */

const formatMillions = (euros: number) => (euros / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Une jauge fine, part d'un tout : tables occupées, commandes passées au QR. */
function Gauge({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-1.5 overflow-hidden rounded-full bg-foreground/8">
      <span
        className="block h-full origin-left rounded-full bg-foreground/60 transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `scaleX(${Math.min(1, ratio)})` }}
      />
    </div>
  );
}

function Kpi({
  label,
  order,
  value,
  children,
  visual,
}: {
  label: string;
  order: number;
  value: React.ReactNode;
  /** La précision sous le chiffre. */
  children: React.ReactNode;
  /** Entre le chiffre et la précision : une jauge, une courbe. */
  visual?: React.ReactNode;
}) {
  const { className, style } = rise(order);
  return (
    <div className={`flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:px-5 sm:py-4 ${CARD} ${className}`} style={style}>
      <h3 className={`text-balance ${PANEL_TITLE}`}>{label}</h3>
      <p className="font-display text-[1.75rem] font-medium leading-none tabular-nums sm:text-[2.25rem]">{value}</p>
      <div className="mt-auto flex flex-col gap-2 pt-1">
        {visual}
        <p className="text-[0.8125rem] text-balance text-muted">{children}</p>
      </div>
    </div>
  );
}

/** Une ligne d'alerte dépliable : l'adresse, ce qui cloche, puis chaque commande en cause. */
function Alert({ color, title, orders, describe }: { color: string; title: React.ReactNode; orders: GroupOrder[]; describe: (order: GroupOrder) => string }) {
  return (
    <details className="group/alert min-w-0" style={{ "--venue": color } as React.CSSProperties}>
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-(--venue)" />
        <span className="text-pretty">{title}</span>
        <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-muted transition-transform group-open/alert:rotate-180" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <ul className="mt-1 mb-1 ml-4 flex flex-col gap-1 border-l border-hairline pl-3 text-[0.8125rem] text-muted">
        {orders.map((order) => (
          <li key={order.number}>{describe(order)}</li>
        ))}
      </ul>
    </details>
  );
}

export function GroupDashboard({
  slug,
  venues,
  clock,
  period: initialPeriod,
  contact,
}: {
  slug: string;
  venues: GroupVenue[];
  clock: Clock;
  /** La période du jour de `clock`, calculée par le serveur. */
  period: Period;
  contact: string;
}) {
  const fixture = getGroup(slug)!;
  const { display } = fixture;
  const { day, seconds: t } = useSimClock(clock, { dayStartHour: fixture.dayStartHour, ...display });
  const today = useMemo(() => simulateDay(fixture, venues, day), [fixture, venues, day]);
  const lastWeek = useMemo(() => simulateDay(fixture, venues, addDays(day, -7)), [fixture, venues, day]);
  // Le jour suivant (l'horloge passe 5 h) : la période se recalcule ici.
  const period = useMemo(
    () => (day === clock.day ? initialPeriod : periodSummary(fixture, venues, day, display.periodDays)),
    [day, clock.day, initialPeriod, fixture, venues, display.periodDays]
  );
  const hypotheses = useRef<HTMLDialogElement>(null);
  const cartes = useRef<HTMLDialogElement>(null);

  // L'axe de la journée : de la première ouverture à la dernière fermeture, à l'heure pleine.
  const bucket = display.bucketMinutes * 60;
  const axis = useMemo(() => {
    const start = Math.floor(Math.min(...today.venues.map((v) => v.open)) / 3600) * 3600;
    const end = Math.ceil(Math.max(...today.venues.map((v) => v.close)) / 3600) * 3600;
    return {
      start,
      end,
      slots: (end - start) / bucket,
      reference: salesBuckets(lastWeek, start, end - 1, bucket).map((stack) => stack.reduce((s, v) => s + v, 0)),
      ghosts: lastWeek.venues.map((v) => cumulative(v.orders, start, end, bucket)),
      groupGhost: cumulative(lastWeek.orders, start, end, bucket),
    };
  }, [today, lastWeek, bucket]);
  const now = Math.min(t, axis.end);
  const current = now < axis.start ? -1 : Math.min(axis.slots - 1, Math.floor((now - axis.start) / bucket));
  const progress = t >= axis.end ? 1 : current < 0 ? 0 : (now - axis.start - current * bucket) / bucket;

  const snaps = fixture.venues.map((venue, i) => venueSnapshot(fixture, today.venues[i], venue, t));
  const before = lastWeek.venues.map((v) => revenueAt(v.orders, t));
  // Le groupe est la somme des adresses telles qu'affichées : les totaux tombent juste à l'euro près.
  const euros = (cents: number) => Math.round(cents / 100);
  const revenue = snaps.reduce((s, v) => s + euros(v.revenue), 0);
  const revenueBefore = before.reduce((s, v) => s + v, 0);
  const orders = snaps.reduce((s, v) => s + v.orders, 0);
  const qrOrders = snaps.reduce((s, v) => s + v.qrOrders, 0);
  const onlineOrders = snaps.reduce((s, v) => s + v.onlineOrders, 0);
  const occupied = snaps.reduce((s, v) => s + v.occupiedTables, 0);
  const tables = fixture.venues.reduce((s, v) => s + v.tables, 0);
  const toCollect = snaps.reduce((s, v) => s + euros(v.toCollect), 0);
  const awaiting = snaps.reduce((s, v) => s + v.awaitingPayment, 0);
  const oldestToCollect = Math.min(...snaps.map((v) => v.oldestToCollect ?? Infinity));
  const service = serviceAverages(today.orders, t, display.serviceWindowMinutes * 60);
  const projected = projection(fixture, today.orders, lastWeek.orders, t);
  const late = snaps.reduce((s, v) => s + v.late.length, 0);
  const stuck = snaps.reduce((s, v) => s + v.stuck.length, 0);

  const weekday = WEEKDAYS[today.weekday];
  const lastWeekday = `${weekday} dernier`;
  const anyOpen = snaps.some((s) => s.open);
  const firstOpen = Math.min(...today.venues.map((v) => v.open));
  const mail = `mailto:${contact}?subject=${encodeURIComponent(`Vue groupe — ${fixture.name}`)}`;
  const names = venues.map((v) => v.name);
  const { showcase } = display;
  const showcaseDay = WEEKDAYS[weekdayOf(fixture.referenceDay)];

  const basket = (order: GroupOrder) => {
    const { named, more } = basketParts(order.lines, 2);
    return more ? `${named} ${more}` : named;
  };

  return (
    <div className="groupe flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-[100rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="hidden shrink-0 gap-1 sm:flex" aria-hidden>
              {fixture.venues.map((venue) => (
                <Avatar key={venue.slug} venue={venue} size={28} />
              ))}
            </span>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-faint sm:text-xs">Ominin · Vue groupe</p>
              <h1 className="font-display text-lg font-medium leading-tight sm:text-xl">{fixture.name}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 text-sm text-muted">
              <LiveDot />
              <span className="max-sm:hidden">{t >= 86_400 ? `Nuit de ${weekday}` : capitalize(weekday)}</span>
              <span className="font-semibold text-foreground tabular-nums">{formatClock(t)}</span>
            </p>
            <button
              type="button"
              onClick={() => cartes.current?.showModal()}
              className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground lg:inline-flex"
            >
              Côté client
            </button>
            <a
              href={mail}
              className="hidden rounded-full border border-foreground/30 px-4 py-1.5 text-sm font-semibold transition-colors hover:border-foreground/60 sm:inline-flex"
            >
              En parler avec Ominin
            </a>
          </div>
        </div>
        <div className="border-t border-hairline bg-foreground/[0.03]">
          <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2 text-[0.8125rem] text-muted sm:px-6">
            <span className="rounded border border-hairline px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-foreground">
              Démonstration
            </span>
            <p className="text-pretty">
              Une journée et une semaine simulées de vos {fixture.venues.length} adresses, à partir de vos vraies cartes : toutes les commandes
              passent par Ominin, au QR ou saisies par l’équipe. Montants TTC.
            </p>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <button type="button" onClick={() => hypotheses.current?.showModal()} className={LINK}>
                Hypothèses
              </button>
              <button type="button" onClick={() => cartes.current?.showModal()} className={`${LINK} lg:hidden`}>
                Côté client
              </button>
              <a href={mail} className={`${LINK} sm:hidden`}>
                Nous écrire
              </a>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-6">
        {!anyOpen && (
          <section aria-label="Hors service" className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm ${CARD}`}>
            <p className="text-pretty">
              {t < firstOpen
                ? `Vos établissements ouvrent à ${formatHour(firstOpen / 60)}.`
                : "Le service est terminé partout."}{" "}
              <span className="text-muted">Pour voir un soir de service :</span>
            </p>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <a href={`?heure=${showcase.at}&jour=${fixture.referenceDay}`} className={LINK}>
                {capitalize(showcaseDay)} à {formatHour(minutesOf(showcase.at))}
              </a>
              <a href={`?heure=${showcase.replayFrom}&jour=${fixture.referenceDay}&vitesse=${showcase.replaySpeed}`} className={LINK}>
                Rejouer la soirée ×{showcase.replaySpeed}
              </a>
            </span>
          </section>
        )}

        <section aria-labelledby="groupe-aujourdhui" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <h2 id="groupe-aujourdhui" className="sr-only">
            Le groupe aujourd’hui
          </h2>
          <div className="col-span-2 lg:col-span-1 [&>*]:h-full">
            <Kpi
              label="Encaissé TTC"
              order={0}
              value={<Figure value={<AnimatedNumber value={revenue} format={formatInteger} duration={display.tweenMs} />} unit="€" />}
              visual={
                <Sparkline
                  values={cumulative(today.orders, axis.start, now, bucket)}
                  ghost={axis.groupGhost}
                  span={axis.slots + 1}
                  tail={progress || 1}
                  color="rgb(244 243 239 / 0.75)"
                />
              }
            >
              <Trend ratio={revenueBefore ? (revenue * 100) / revenueBefore - 1 : null} suffix={`vs ${lastWeekday} à la même heure`} />
              {projected != null && anyOpen && (
                <span className="block">
                  ≈&nbsp;<span className="font-medium text-foreground tabular-nums">{formatInteger(Math.round(projected / 100))}&nbsp;€</span> à la
                  fermeture, à ce rythme
                </span>
              )}
            </Kpi>
          </div>
          <Kpi
            label="Commandes"
            order={1}
            value={<AnimatedNumber value={orders} format={formatInteger} duration={display.tweenMs} />}
            visual={orders ? <Gauge ratio={qrOrders / orders} label={`${formatPercent(qrOrders / orders)} des commandes passées au QR`} /> : null}
          >
            {orders ? `${formatPercent(qrOrders / orders)} au QR · ${formatPercent(onlineOrders / orders)} payées en ligne` : "Pas encore de commande"}
          </Kpi>
          <Kpi
            label="Tables occupées"
            order={2}
            value={<Figure value={<AnimatedNumber value={occupied} format={formatInteger} duration={display.tweenMs} />} unit={`/ ${tables}`} />}
            visual={<Gauge ratio={occupied / tables} label={`${formatPercent(occupied / tables)} des tables occupées`} />}
          >
            de l’arrivée au départ, addition réglée
          </Kpi>
          <Kpi
            label="À encaisser"
            order={3}
            value={<Figure value={<AnimatedNumber value={toCollect} format={formatInteger} duration={display.tweenMs} />} unit="€" />}
          >
            {awaiting ? (
              <>
                <span className="block">
                  {awaiting} commande{awaiting > 1 ? "s" : ""} attendent un serveur et son terminal
                </span>
                <span className="block">la plus ancienne depuis {formatWait((t - oldestToCollect) / 60)}</span>
              </>
            ) : (
              "Aucune commande en attente d’encaissement"
            )}
          </Kpi>
          <div className="[&>*]:h-full">
            <Kpi
              label="Service"
              order={4}
              value={
                <span className="flex flex-col gap-1.5 text-[1.5rem] sm:text-[1.75rem]">
                  {[
                    { label: "boissons", value: service.bar },
                    { label: "plats", value: service.kitchen },
                  ].map(({ label, value }) => (
                    <span key={label} className="flex items-baseline gap-2">
                      {value != null ? <Figure value={Math.round(value)} unit="min" /> : "—"}
                      <span className="font-sans text-[0.8125rem] font-normal text-muted">{label}</span>
                    </span>
                  ))}
                </span>
              }
            >
              du ticket à la table, sur la dernière heure
            </Kpi>
          </div>
        </section>

        <section aria-labelledby="groupe-surveiller" className={rise(5).className} style={rise(5).style}>
          <div className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-sm ${late || stuck ? "border-(--late)/35 bg-(--late)/8" : "border-hairline"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id="groupe-surveiller" className={`flex items-center gap-1.5 ${PANEL_TITLE} ${late || stuck ? "text-(--late)" : ""}`}>
                {(late > 0 || stuck > 0) && <LateIcon className="size-3.5" />}À surveiller
              </h2>
              {/* Seul le compte s'annonce, pas chaque minute d'attente. */}
              <p aria-live="polite" className="text-muted">
                {late || stuck
                  ? [late && `${late} commande${late > 1 ? "s" : ""} en retard`, stuck && `${stuck} à payer au comptoir`].filter(Boolean).join(" · ")
                  : anyOpen
                    ? "Rien en retard : toutes les commandes en cours sont dans les temps."
                    : "Tous les établissements sont fermés."}
              </p>
            </div>
            {(late > 0 || stuck > 0) && (
              <div className="flex flex-col gap-0.5">
                {fixture.venues.map((venue, v) => {
                  const snap = snaps[v];
                  return [
                    snap.late.length > 0 && (
                      <Alert
                        key={`${venue.slug}-retard`}
                        color={venue.color}
                        orders={snap.late}
                        title={
                          <>
                            <span className="font-semibold">{names[v]}</span> : {snap.late.length} commande{snap.late.length > 1 ? "s" : ""} en
                            retard, la plus ancienne attend depuis {formatWait(Math.max(...snap.late.map((o) => waitingSince(o, t) ?? 0)) / 60)}
                          </>
                        }
                        describe={(o) => `Table ${o.table} · ${basket(o)} · attend depuis ${formatWait((waitingSince(o, t) ?? 0) / 60)}`}
                      />
                    ),
                    snap.stuck.length > 0 && (
                      <Alert
                        key={`${venue.slug}-comptoir`}
                        color={venue.color}
                        orders={snap.stuck}
                        title={
                          <>
                            <span className="font-semibold">{names[v]}</span> : {snap.stuck.length} commande{snap.stuck.length > 1 ? "s" : ""} à
                            payer au comptoir, ticket en attente
                          </>
                        }
                        describe={(o) => `Table ${o.table} · ${basket(o)} · commandée il y a ${formatWait((t - o.createdAt) / 60)}`}
                      />
                    ),
                  ];
                })}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="groupe-adresses">
          <h2 id="groupe-adresses" className="sr-only">
            Vos établissements
          </h2>
          <div
            className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-[repeat(var(--venues),minmax(0,1fr))]"
            style={{ "--venues": fixture.venues.length } as React.CSSProperties}
          >
            {fixture.venues.map((venue, v) => (
              <VenuePanel
                key={venue.slug}
                venue={venue}
                name={names[v]}
                address={venues[v].address}
                venueDay={today.venues[v]}
                snap={snaps[v]}
                previousRevenue={before[v]}
                lastWeekday={lastWeekday}
                projected={projection(fixture, today.venues[v].orders, lastWeek.venues[v].orders, t)}
                trend={cumulative(today.venues[v].orders, axis.start, now, bucket)}
                ghost={axis.ghosts[v]}
                span={axis.slots + 1}
                tail={progress || 1}
                t={t}
                freshSeconds={display.freshSeconds}
                tweenMs={display.tweenMs}
                clientTable={display.clientTable}
                order={6 + v}
              />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:h-[32rem] lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div className={`flex flex-col p-4 sm:p-5 ${CARD} ${rise(10).className}`} style={rise(10).style}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className={PANEL_TITLE}>La journée, adresse par adresse</h2>
              <p className="text-[0.8125rem] text-muted">Ventes TTC par demi-heure, à l’heure de la commande</p>
            </div>
            <div className="mt-4 flex-1">
              <DayChart
                venues={fixture.venues}
                names={names}
                stacks={salesBuckets(today, axis.start, Math.min(now, axis.end - 1), bucket).slice(0, current + 1)}
                reference={axis.reference}
                start={axis.start}
                bucket={bucket}
                current={current}
                progress={progress}
                tickHours={display.tickHours}
                gridLines={display.gridLines}
              />
            </div>
          </div>
          <div className={`flex min-h-0 flex-col overflow-hidden ${CARD} ${rise(11).className}`} style={rise(11).style}>
            <div className="flex items-baseline justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
              <h2 className={PANEL_TITLE}>Commandes en direct</h2>
              <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
                <LiveDot />
                {formatInteger(orders)} aujourd’hui
              </p>
            </div>
            {orders ? (
              <OrderFeed fixture={fixture} names={names} orders={latestOrders(today, t, display.feedSize)} t={t} day={day} />
            ) : (
              <p className="px-5 py-8 text-sm text-faint">Pas encore de commande aujourd’hui.</p>
            )}
          </div>
        </section>

        <Week fixture={fixture} names={names} period={period} />
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[0.8125rem] text-faint sm:px-6">
          <p>Ominin · démonstration sur une journée simulée, vos cartes réelles.</p>
          <a href={mail} className={LINK}>
            {contact}
          </a>
        </div>
      </footer>

      <Dialog ref={hypotheses} title="Ce que montre cette démonstration">
        <p>
          Une journée simulée, pas vos chiffres. Les adresses, horaires et cartes sont les vôtres ; chaque commande est tirée de la carte de l’adresse,
          selon le moment de la journée (le café du matin, le plat du midi, la tournée de l’apéro). Une fois vos établissements équipés, la même vue
          lit vos vraies commandes.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {fixture.venues.map((venue, v) => (
            <li key={venue.slug} className="flex gap-3">
              <Avatar venue={venue} size={28} className="mt-0.5" />
              <p>
                <span className="font-semibold text-foreground">{names[v]}</span> : journée calée sur {formatMillions(venue.revenue.annualHT)}
                &nbsp;M€ HT par an ({venue.revenue.basis}), soit environ{" "}
                {formatInteger(Math.round((venue.revenue.annualHT * (1 + fixture.vatAverage)) / 52))}&nbsp;€ TTC par semaine ; {venue.tables} tables
                supposées ; {formatPercent(venue.qrShare)} des commandes au QR, dont {formatPercent(venue.onlineShare)} réglées en ligne ; cuisine de{" "}
                {formatHour(minutesOf(venue.kitchen[0]))} à {formatHour(minutesOf(venue.kitchen[1]))}
                {venue.happyHour && (
                  <>
                    , happy hour de {formatHour(minutesOf(venue.happyHour[0]))} à {formatHour(minutesOf(venue.happyHour[1]))}
                  </>
                )}
                .
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4">
          Montants TTC : le CA publié, hors taxes, plus une TVA moyenne de {formatPercent(fixture.vatAverage)}. Une commande saisie par l’équipe
          se règle à l’addition ; une commande au QR se règle en ligne, ou au comptoir avant que son ticket parte au bar ou en cuisine — au-delà de{" "}
          {fixture.paymentWaitMinutes}&nbsp;min, elle est signalée. Le service se compte du ticket à la table : une commande non servie{" "}
          {fixture.lateMinutes.bar}&nbsp;min après son ticket (boissons), {fixture.lateMinutes.cuisine}&nbsp;min (plats), passe en retard.
        </p>
        <p className="mt-3">
          L’équipe en poste est celle pointée à la badgeuse d’Ominin ; le CA par heure travaillée en découle. « vs {lastWeekday} » compare à la
          même heure, et la fin de journée estimée prolonge l’encaissé au rythme de {lastWeekday}.
        </p>
      </Dialog>

      <Dialog ref={cartes} title="Côté client : les cartes au QR">
        <p>Ce que voient vos clients à table, adresse par adresse : la carte, la commande, le paiement en ligne et le suivi jusqu’au service.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {fixture.venues.map((venue, v) => (
            <li key={venue.slug}>
              <a
                href={`/menu/demo/${venue.slug}?table=${display.clientTable}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-xl border border-hairline px-3 py-2.5 text-foreground transition-colors hover:border-foreground/30"
              >
                <Avatar venue={venue} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{names[v]}</span>
                  <span className="block truncate text-faint">{venues[v].address}</span>
                </span>
                <ArrowIcon />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
