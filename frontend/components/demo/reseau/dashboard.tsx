"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { getNetwork, type NetworkFixture } from "@/lib/demo/reseau/data";
import { offer, setupFeeLabel } from "@/lib/pitch/o-crousti-poulet";
import {
  formatCents,
  formatClock,
  formatClockParam,
  formatDecimal,
  formatEuroAmount,
  formatHour,
  formatInteger,
  formatMinutes,
  formatNumber,
  capitalize,
  WEEKDAYS,
  formatPercent,
  formatWait,
} from "@/lib/demo/reseau/format";
import {
  activity,
  activityWindow,
  addDays,
  bucketed,
  latestOrders,
  minutesOf,
  networkTotals,
  parisClock,
  restaurantSnapshot,
  simulateDay,
  tillWaits,
  type Clock,
  type RestaurantSnapshot,
  type SimOrder,
} from "@/lib/demo/reseau/simulation";
import { ActivityChart, ChartLegend, curve, smooth } from "./activity-chart";
import { AnimatedNumber } from "./animated-number";
import { Figure } from "./figure";
import { Joined } from "./joined";
import { LiveFeed } from "./live-feed";
import { NetworkMap } from "./network-map";
import { Ranking } from "./ranking";
import { RestaurantPanel } from "./restaurant-panel";
import { useRowFit } from "./use-row-fit";

/*
 * Vue réseau : ce qui se passe, maintenant, dans tous les restaurants d'une
 * enseigne. Tout vient de la simulation (lib/demo/reseau) : le serveur fixe
 * l'instant de départ, le navigateur fait avancer l'horloge et relit l'état
 * du réseau à chaque seconde. Le bandeau sous l'en-tête dit, à toutes les
 * tailles, que c'est une démonstration, et laisse choisir l'hypothèse dont
 * tout dépend : la part des commandes passées par QR.
 */


function useSimClock(fixture: NetworkFixture, clock: Clock) {
  const [now, setNow] = useState({ day: clock.day, seconds: clock.seconds });
  const { day, seconds, speed, follow } = clock;
  const { dayStartHour } = fixture.simulation;
  const { tickMs, fastTickMs } = fixture.display;

  useEffect(() => {
    if (!follow && speed === 0) return;
    const origin = performance.now();
    // Accéléré, l'horloge avance par petits pas plutôt que par bonds.
    const period = !follow && speed > 1 ? fastTickMs : tickMs;
    const id = setInterval(() => {
      setNow(
        follow
          ? parisClock(new Date(), dayStartHour)
          : { day, seconds: Math.floor(seconds + ((performance.now() - origin) / 1000) * speed) }
      );
    }, period);
    return () => clearInterval(id);
  }, [day, seconds, speed, follow, dayStartHour, tickMs, fastTickMs]);

  return now;
}

const PANEL_TITLE = "text-[0.8125rem] font-semibold uppercase tracking-wider text-faint";
const CARD = "rounded-2xl border border-hairline bg-surface";

/** « Maintenant » : un point jaune fixe ; l'anneau qui pulse est neutre (teinté, il virait à l'olive). */
function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-1.5 shrink-0">
      <span className="reseau-pulse absolute inset-0 rounded-full border border-foreground/50" />
      <span className="size-1.5 rounded-full bg-ember-2" />
    </span>
  );
}

const ICON = "size-3.5 shrink-0";
const LINK =
  "whitespace-nowrap font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground";

/** Une fenêtre au-dessus de la page (API popover : Échap et clic dehors la ferment). */
function Popover({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      popover="auto"
      className="reseau-popover m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-hairline bg-surface p-6 text-foreground shadow-2xl shadow-black/60"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-xl font-medium text-balance">{title}</h2>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label="Fermer"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-4 text-sm text-pretty text-muted">{children}</div>
    </div>
  );
}

/** Les conditions, telles que le siège les lira partout : conclusion et fenêtre du bandeau. */
function Terms({ rate, aside }: { rate: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <dl className="grid flex-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-[1fr_1.6fr_1fr] lg:max-w-3xl">
          {[
            { value: "0", unit: "€", label: "d’abonnement" },
            {
              value: rate,
              unit: "%",
              label: "des commandes payées en ligne, dégressif selon le chiffre d’affaires (paliers fixés ensemble) ; rien sur celles réglées en caisse",
            },
            { value: "1", unit: "pilote", label: "dans le restaurant de votre choix, équipé par Ominin" },
          ].map((term) => (
            <div key={term.label}>
              <dt className="font-display text-[2.5rem] font-medium leading-none text-foreground">
                <Figure value={term.value} unit={term.unit} />
              </dt>
              <dd className="mt-1.5 text-pretty text-muted">{term.label}</dd>
            </div>
          ))}
        </dl>
        {aside}
      </div>
      <p className="mt-3 text-[0.8125rem] text-balance text-faint">
        {`Frais de carte en sus. Au déploiement, une fois par restaurant : ${setupFeeLabel} (le boîtier relie les commandes aux imprimantes de cuisine).`}
      </p>
    </>
  );
}

/**
 * Tendance d'un chiffre clé, tranche par tranche, sur toute la largeur de sa
 * carte et l'axe de la journée (`span` tranches, de l'ouverture à la
 * fermeture), dans la grammaire de la grande courbe : aujourd'hui en trait
 * plein jusqu'à la dernière tranche terminée, marquée d'un point jaune, puis
 * rien — une ligne du temps, pas une courbe courte ; la semaine dernière en
 * pointillés sur toute la journée ; `mark`, un repère creux (le pic du jour).
 */
function Sparkline({
  values,
  ghost,
  span,
  mark,
}: {
  values: number[];
  ghost: number[];
  span: number;
  mark?: number;
}) {
  const max = Math.max(...values, ...ghost, 1);
  const x = (i: number) => (i / Math.max(1, span - 1)) * 100;
  const y = (v: number) => 30 - (v / max) * 27;
  const line = (series: number[]) => curve(series.map((v, i) => [x(i), y(v)]));
  const last = values.length - 1;
  const dot = (i: number) => ({ left: `${x(i)}%`, top: `${(y(values[i]) / 30) * 100}%` });
  return (
    <div className="relative h-8 w-full">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <line x1={0} x2={100} y1={30} y2={30} className="stroke-hairline" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {ghost.length > 1 && (
          <path
            d={line(ghost)}
            className="fill-none stroke-foreground/40"
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {values.length > 1 && (
          <path
            d={line(values)}
            className="fill-none stroke-foreground/85"
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {mark != null && mark !== last && values[mark] != null && (
        <span
          aria-hidden
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/70 bg-surface"
          style={dot(mark)}
        />
      )}
      {last >= 0 && (
        <span
          aria-hidden
          className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-2"
          style={dot(last)}
        />
      )}
    </div>
  );
}

function Kpi({
  label,
  short,
  tag,
  value,
  format,
  unit,
  versus,
  tweenMs,
  trend,
  ghost,
  span,
  compactNote,
  mark,
  children,
}: {
  label: string;
  /** Libellé sous le plein écran, sur une ligne. */
  short: React.ReactNode;
  /** Le moment que dit le chiffre : « maintenant », « pic du jour ». */
  tag?: React.ReactNode;
  value: number;
  format: (value: number) => string;
  unit?: string;
  /** L'avant, à côté du chiffre : « sans QR : 6,2 min ». */
  versus?: React.ReactNode;
  tweenMs: number;
  trend: number[];
  /** La référence de la tendance, en aplat. */
  ghost: number[];
  span: number;
  /** La précision sous le grand écran, plus courte ; false : aucune. */
  compactNote?: React.ReactNode | false;
  /** Tranche marquée sur la tendance. */
  mark?: number;
  /** Une seule précision, courte. */
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-2 overflow-hidden px-4 py-3.5 sm:px-5 sm:py-4 ${CARD}`}>
      <div className="flex flex-col gap-0.5 2xl:flex-row 2xl:items-baseline 2xl:justify-between 2xl:gap-3">
        <p className={`truncate ${PANEL_TITLE}`}>
          <span className="2xl:hidden">{short}</span>
          <span className="hidden 2xl:inline">{label}</span>
        </p>
        {tag && <p className="shrink-0 truncate text-xs text-faint sm:text-[0.8125rem]">{tag}</p>}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-display text-[1.75rem] font-medium leading-none sm:text-[2.25rem] 2xl:text-[3rem]">
          <Figure value={<AnimatedNumber value={value} format={format} duration={tweenMs} />} unit={unit} />
        </p>
        {versus && <p className="text-[0.8125rem] text-muted max-xl:hidden sm:text-sm">{versus}</p>}
      </div>
      {/* Tendance et précision tiennent le bas de la carte : les cartes d'une rangée s'alignent. */}
      <div className="mt-auto flex flex-col gap-2">
        <div className="pt-1">
          <Sparkline values={trend} ghost={ghost} span={span} mark={mark} />
        </div>
        <p className={`text-[0.8125rem] text-balance text-muted sm:text-sm ${compactNote === false ? "max-xl:hidden" : ""}`}>
          {compactNote ? (
            <>
              <span className="xl:hidden">{compactNote}</span>
              <span className="max-xl:hidden">{children}</span>
            </>
          ) : (
            children
          )}
        </p>
      </div>
    </div>
  );
}

export function NetworkDashboard({
  slug,
  clock,
  contact,
}: {
  slug: string;
  clock: Clock;
  /** Adresse du bouton « En parler avec Ominin ». */
  contact: string;
}) {
  const fixture = getNetwork(slug)!;
  const { simulation, display } = fixture;
  const { day, seconds } = useSimClock(fixture, clock);
  const [adoption, setAdoption] = useState(simulation.adoption.initial);
  // simulateDay garde chaque journée en cache : seul l'instant se recalcule.
  const sim = simulateDay(fixture, day, adoption);
  const lastWeek = simulateDay(fixture, addDays(day, -7), adoption);
  const range = activityWindow([sim, lastWeek], display.closingQuantile);
  const snapshots = fixture.restaurants.map((_, i) => restaurantSnapshot(fixture, sim, i, seconds));
  const totals = networkTotals(snapshots);
  const bucket = display.bucketMinutes * 60;

  const [selected, setSelected] = useState<number | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const [allRush, setAllRush] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const feed = useRef<HTMLDivElement>(null);
  const feedRows = useRowFit(feed);
  const kpis = useRef<HTMLDivElement>(null);
  const closing = useRef<HTMLElement>(null);
  const [floatingCta, setFloatingCta] = useState(false);

  // Au téléphone, le bouton de contact flotte une fois les chiffres clés
  // passés, et s'efface devant celui de la conclusion.
  useEffect(() => {
    const state = { past: false, end: false };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === kpis.current) state.past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        else state.end = entry.isIntersecting;
      }
      setFloatingCta(state.past && !state.end);
    });
    if (kpis.current) observer.observe(kpis.current);
    if (closing.current) observer.observe(closing.current);
    return () => observer.disconnect();
  }, []);

  const select = useCallback((index: number) => {
    if (document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    setSelected(index);
  }, []);
  const close = useCallback(() => {
    setSelected(null);
    opener.current?.focus();
  }, []);

  const ticket = totals.orders ? totals.revenue / totals.orders : 0;
  const networkShare = totals.orders ? totals.orders / (totals.orders + totals.walkIns) : 0;
  const open = snapshots.filter((s) => s.open);
  const waitNow = open.length ? open.reduce((sum, s) => sum + (s.waitNow ?? 0), 0) / open.length : 0;
  const rush = snapshots
    .filter((s) => s.rush)
    .sort((a, b) => (b.waitNow ?? 0) - (a.waitNow ?? 0) || a.index - b.index);
  const rushOrder = rush.map((s) => s.index);
  const fresh = snapshots.filter((s) => s.isNew);
  const byRevenue = [...snapshots].sort((a, b) => b.revenue - a.revenue);
  const current: RestaurantSnapshot | null = selected == null ? null : snapshots[selected];
  const firstOpening = formatHour(range.start / 60);
  const count = fixture.restaurants.length;
  const mail = `mailto:${contact}?subject=${encodeURIComponent(`Vue réseau ${fixture.name}`)}`;
  const weekday = WEEKDAYS[sim.weekday];
  // Heure imposée (film, lien de démonstration) : la journée simulée dit son nom.
  const dayLabel = clock.follow ? "Aujourd’hui" : `${capitalize(weekday)} simulé`;
  // La commission, dégressive selon le chiffre d'affaires : « 1 à 3 % ».
  const rate = (
    <>
      {formatNumber(offer.commissionPercent.min)}
      <span className="mx-1.5 text-[0.6em] text-muted">à</span>
      {formatNumber(offer.commissionPercent.max)}
    </>
  );
  const assumptions = [
    "Restaurants, adresses et horaires : les vôtres ; carte et prix : votre carte nationale.",
    `Volumes calés sur votre CA moyen annoncé (${fixture.announcedRevenue}), selon le jour de la semaine et les pointes du midi et du soir.`,
    "Ce qu’Ominin mesurerait en service : les commandes passées par QR, leur montant, l’heure annoncée au client et l’heure où la commande est prête.",
    `Ce qui est estimé ici : les clients sans QR, la file et l’attente en caisse, à ${formatDecimal(simulation.tillMinutes)}\u00a0min de passage par client et ${formatInteger(simulation.tills)}\u00a0caisse${simulation.tills > 1 ? "s" : ""} par restaurant.`,
    `Délai tenu à ±${formatWait(simulation.estimateToleranceMinutes)} : simulé ici, la préparation variant autour du délai annoncé ; mesuré au pilote.`,
    "La file est simulée client par client : à la pointe, la caisse sature ; lui retirer les commandes payées en ligne fait tomber l’attente bien plus que le nombre de passages.",
  ];

  // Tendances des chiffres clés : les tranches terminées seulement — la
  // tranche en cours, partielle, ferait croire à une chute.
  const done = range.start + Math.floor((Math.min(seconds, range.end) - range.start) / bucket) * bucket;
  const trend = (value: (order: SimOrder) => number) =>
    bucketed(sim.orders, range.start, done - 1, bucket, value);
  const trendOrders = trend(() => 1);
  // Une tranche sans commande garde le délai de la précédente : pas de chute à zéro.
  const held = (series: (number | null)[]) =>
    series.reduce<number[]>((out, v) => [...out, v ?? out.at(-1) ?? 0], []);
  const trendWait = held(trend((o) => o.estimatedAt - o.paidAt).map((sum, i) => (trendOrders[i] ? sum / trendOrders[i] : null)));
  // La référence : le même jour de la semaine passée, sur la journée entière.
  const ghost = (value: (order: SimOrder) => number) =>
    bucketed(lastWeek.orders, range.start, range.end - 1, bucket, value);
  const ghostOrders = ghost(() => 1);
  const ghostWait = held(ghost((o) => o.estimatedAt - o.paidAt).map((sum, i) => (ghostOrders[i] ? sum / ghostOrders[i] : null)));
  const cumulative = (series: number[]) =>
    series.reduce<number[]>((sums, v) => [...sums, (sums.at(-1) ?? 0) + v], []);
  // Les tendances partagent l'axe de la courbe du jour : ouverture à fermeture.
  const span = Math.round((range.end - range.start) / bucket);
  // Attente en caisse, avec le QR et sans : celle du dernier quart d'heure,
  // ou celle du pic du jour quand il est passé (l'après-midi).
  const tillService = simulation.tillMinutes * 60;
  const waits = tillWaits(sim, range.start, done - 1, bucket, tillService);
  const peakIndex = waits.reduce((best, w, i) => (w.withoutQr > (waits[best]?.withoutQr ?? 0) ? i : best), 0);
  const peakWait = waits[peakIndex]?.withoutQr ? { ...waits[peakIndex], at: range.start + peakIndex * bucket } : null;
  const tillWait = totals.openCount ? tillWaits(sim, seconds - bucket, seconds, bucket, tillService)[0] : null;
  // Le pire quart d'heure du jour jusqu'ici, avec le QR et sans (pas
  // forcément le même) ; s'il dépasse l'instant, l'attente du moment ne le dit plus.
  const qrPeakIndex = waits.reduce((best, w, i) => (w.withQr > (waits[best]?.withQr ?? 0) ? i : best), 0);
  const dayPeak = peakWait && { withQr: waits[qrPeakIndex].withQr, withoutQr: peakWait.withoutQr };
  const pastPeak = dayPeak && tillWait && tillWait.withoutQr < dayPeak.withoutQr ? dayPeak : null;
  // File retombée : la tuile montre le pic du jour, l'instant passe en note.
  const quiet = pastPeak && tillWait && tillWait.withoutQr < display.tillQuietMinutes ? pastPeak : null;
  const tillShown = quiet ?? tillWait;
  const tillMoment = quiet ? "pic du jour" : "maintenant";
  const lastWeekTill = tillWaits(lastWeek, range.start, range.end - 1, bucket, tillService);
  const tillGhost = lastWeekTill.map((w) => w.withQr);
  const usualPeak =
    range.start + lastWeekTill.reduce((best, w, i) => (w.withoutQr > lastWeekTill[best].withoutQr ? i : best), 0) * bucket;
  // Le temps de caisse que n'ont pas pris les commandes réglées en ligne.
  const tillHours = (totals.online * simulation.tillMinutes) / 60;
  // Le rush à revoir : le pic de la caisse, sinon la pointe du déjeuner prévue.
  const replayAt = peakWait ? peakWait.at : minutesOf(simulation.peaks[0].at) * 60;
  const replayName = simulation.peaks.reduce((best, p) =>
    Math.abs(minutesOf(p.at) * 60 - replayAt) < Math.abs(minutesOf(best.at) * 60 - replayAt) ? p : best
  ).name;

  const step = display.sampleMinutes * 60;
  const todayCurve = smooth(
    activity(sim.orders, range.start, Math.min(seconds, range.end), bucket, step),
    display.todaySmoothingMinutes / display.sampleMinutes
  );
  const reference = smooth(
    activity(lastWeek.orders, range.start, range.end, bucket, step),
    display.smoothingMinutes / display.sampleMinutes
  );
  const scaleMax =
    Math.max(
      ...activity(sim.orders, range.start, range.end, bucket, step).map((p) => p.count),
      ...reference.map((p) => p.count)
    ) * display.headroom;
  // Calme : la prochaine pointe, d'après le même jour de la semaine passée.
  const ahead = reference.filter((p) => p.at > seconds);
  const peak = ahead.length ? ahead.reduce((best, p) => (p.count > best.count ? p : best)) : null;
  const nextPeak =
    !rush.length && totals.openCount > 0 && peak && peak.count > (todayCurve.at(-1)?.count ?? 0) ? peak : null;
  // Le rythme du moment, tant qu'un restaurant est ouvert.
  const pace = seconds >= range.start && seconds <= range.end ? (todayCurve.at(-1)?.count ?? null) : null;
  // Le début de la fenêtre de pointe, à la tranche près : « vers 20 h ».
  const peakFrom = nextPeak && formatHour((Math.round((nextPeak.at - bucket) / bucket) * bucket) / 60);

  return (
    <div className="reseau flex min-h-dvh flex-col bg-background text-foreground 2xl:h-dvh 2xl:overflow-hidden">
      <header className="flex items-center gap-x-3 gap-y-3 border-b border-hairline px-4 py-3 sm:gap-x-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-black sm:size-11">
            <Image src="/o-crousti-poulet/coq.webp" alt="" width={480} height={346} className="w-6.5 sm:w-8" />
          </span>
          <div className="min-w-0">
            <p className={PANEL_TITLE}>
              Ominin Connect<span className="hidden sm:inline"> · Siège</span>
            </p>
            <h1 className="font-display text-[0.9375rem] font-medium leading-tight sm:truncate sm:text-lg">
              {fixture.fullName}
              <span className="hidden text-muted xl:inline"> · Réseau</span>
            </h1>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <p className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1.5 text-[0.8125rem] sm:gap-2 sm:px-3 sm:text-sm">
            <LiveDot />
            <span className="text-muted">Simulation</span>
            <time className="font-semibold tabular-nums">{formatClock(seconds)}</time>
          </p>
          <a
            href={`/menu/demo/${slug}?service=fast-food`}
            className="hidden items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground lg:inline-flex"
          >
            Côté client
            <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M7 17L17 7M8 7h9v9" />
            </svg>
          </a>
          <a
            href={mail}
            className="hidden rounded-full border border-foreground/30 px-4 py-1.5 text-sm font-semibold transition-colors hover:border-foreground/60 sm:inline-flex"
          >
            En parler avec Ominin
          </a>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline bg-surface/50 px-4 py-2.5 text-sm text-muted sm:px-6">
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-foreground">
          Démonstration
        </span>
        <p className="min-w-0 flex-1 text-pretty max-sm:order-last max-sm:basis-full">
          {`${dayLabel} : vos ${count} restaurants s’ils prenaient les commandes par QR.`}{" "}
          {/* Les liens passent à la ligne ensemble, séparés par l'espace seul. */}
          <span className="inline-flex gap-x-3">
            <button type="button" popoverTarget="reseau-hypotheses" className={LINK}>
              Hypothèses
            </button>
            <button type="button" popoverTarget="reseau-conditions" className={LINK}>
              Conditions
            </button>
            <a href={`/menu/demo/${slug}?service=fast-food`} className={`${LINK} lg:hidden`}>
              Côté client
            </a>
          </span>
        </p>
        <div className="ml-auto flex items-center gap-2 sm:pl-3" role="group" aria-label="Hypothèse : part des commandes passées par QR">
          <span className="text-[0.8125rem]">
            <span className="xl:hidden">Part QR</span>
            <span className="hidden xl:inline">Part des commandes par QR</span>
          </span>
          <span className="flex rounded-full border border-hairline p-0.5">
            {simulation.adoption.choices.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={adoption === choice}
                onClick={() => setAdoption(choice)}
                className={`rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold tabular-nums transition-colors ${
                  adoption === choice ? "bg-foreground text-background" : "hover:text-foreground"
                }`}
              >
                {formatPercent(choice)}
              </button>
            ))}
          </span>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <div ref={kpis} className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:gap-4">
          <Kpi
            label="Commandes par QR"
            short="Commandes QR"
            tag="aujourd’hui"
            value={totals.orders}
            format={formatInteger}
            tweenMs={display.tweenMs}
            trend={cumulative(trendOrders)}
            ghost={cumulative(ghost(() => 1))}
            span={span}
            compactNote={
              totals.orders
                ? `${formatInteger(totals.online)} en ligne (${formatPercent(totals.online / totals.orders)})`
                : undefined
            }
          >
            {totals.orders ? (
              <Joined
                parts={[
                  `${formatInteger(totals.online)} payées en ligne (${formatPercent(totals.online / totals.orders)})`,
                  `≈\u00a0${formatInteger(tillHours)}\u00a0h de caisse libérées`,
                ]}
              />
            ) : (
              `Ouverture à ${firstOpening}`
            )}
          </Kpi>
          <Kpi
            label="Attente en caisse"
            short="Attente caisse"
            tag={`estimée · ${tillMoment}`}
            value={tillShown ? tillShown.withQr : 0}
            format={(v) => (tillShown ? formatDecimal(v) : "—")}
            unit={tillShown ? "min" : undefined}
            versus={
              tillShown && (
                <span className="whitespace-nowrap font-medium">sans QR : {formatMinutes(tillShown.withoutQr)}</span>
              )
            }
            tweenMs={display.tweenMs}
            trend={waits.map((w) => w.withQr)}
            ghost={tillGhost}
            span={span}
            mark={pastPeak ? qrPeakIndex : undefined}
            compactNote={tillShown ? `sans QR : ${formatMinutes(tillShown.withoutQr)}` : false}
          >
            {quiet
              ? `Maintenant : sous ${formatWait(display.tillQuietMinutes)}`
              : pastPeak
                ? `Pic du jour : ${formatMinutes(pastPeak.withQr)} (${formatDecimal(pastPeak.withoutQr)} sans QR)`
                : tillWait && usualPeak > seconds
                ? `Pic attendu vers ${formatHour(usualPeak / 60)}`
                : tillWait
                  ? "Pic du jour : maintenant"
                  : `Ouverture à ${firstOpening}`}
          </Kpi>
          <Kpi
            label="CA commandé par QR"
            short="CA QR"
            tag="aujourd’hui"
            value={totals.revenue}
            format={formatEuroAmount}
            unit="€"
            tweenMs={display.tweenMs}
            trend={cumulative(trend((o) => o.total))}
            ghost={cumulative(ghost((o) => o.total))}
            span={span}
          >
            {totals.orders ? `Panier moyen ${formatCents(ticket)}` : "Pas encore de commande"}
          </Kpi>
          <Kpi
            label="Délai annoncé"
            short="Délai annoncé"
            tag="maintenant"
            value={waitNow}
            format={(v) => (v ? formatDecimal(v) : "—")}
            unit={waitNow ? "min" : undefined}
            tweenMs={display.tweenMs}
            trend={trendWait}
            ghost={ghostWait}
            span={span}
            compactNote={
              totals.ready
                ? `${formatPercent(totals.onTime / totals.ready)} tenus à ±${formatWait(simulation.estimateToleranceMinutes)}`
                : undefined
            }
          >
            <Joined
              parts={[
                "Annoncé au paiement",
                ...(totals.ready
                  ? [`${formatPercent(totals.onTime / totals.ready)} tenus à ±${formatWait(simulation.estimateToleranceMinutes)}`]
                  : []),
              ]}
            />
          </Kpi>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] 2xl:min-h-0 2xl:flex-1 2xl:grid-cols-12">
          <div className="flex min-h-0 flex-col gap-4 2xl:col-span-6">
            <section className={`flex min-h-0 flex-col overflow-hidden 2xl:flex-1 ${CARD}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pt-4">
                <h2 className="font-display text-lg font-medium">Le réseau maintenant</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-muted">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="size-1 rounded-full bg-foreground/70" />
                    <span aria-hidden className="size-2 rounded-full bg-foreground/70" />
                    <span aria-hidden className="size-3 rounded-full bg-foreground/70" />
                    {`Commandes des ${simulation.recentMinutes}\u00a0dernières\u00a0min`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="flex size-4 items-center justify-center rounded-full bg-ember-2 text-[0.625rem] font-bold text-background">
                      1
                    </span>
                    En rush
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="size-2.5 rounded-full border border-foreground/60" />
                    {`Ouvert depuis ${simulation.newDays}\u00a0j`}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showCoverage}
                    onClick={() => setShowCoverage((on) => !on)}
                    className="flex items-center gap-2 transition-colors hover:text-foreground"
                  >
                    <span
                      aria-hidden
                      className={`relative h-4 w-7 rounded-full border transition-colors ${
                        showCoverage ? "border-foreground bg-foreground" : "border-foreground/25 bg-background"
                      }`}
                    >
                      <span
                        className={`absolute left-0 top-px size-3 rounded-full transition-transform ${
                          showCoverage ? "translate-x-3 bg-background" : "translate-x-px bg-foreground/60"
                        }`}
                      />
                    </span>
                    {`Couverture ${simulation.coverageKm}\u00a0km`}
                  </button>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-5 p-5 pt-4 2xl:flex-row 2xl:pb-0 2xl:pr-0">
                {/* En plein écran, un bloc qui ne tient pas en entier passe dans une
                    colonne hors cadre plutôt que d'être coupé. */}
                <div className="order-2 grid content-start gap-5 sm:grid-cols-2 2xl:order-1 2xl:flex 2xl:w-56 2xl:shrink-0 2xl:flex-col 2xl:flex-wrap 2xl:overflow-hidden 2xl:pb-5">
                  <div className="2xl:w-full">
                    <h3 className={`flex items-baseline justify-between ${PANEL_TITLE}`}>
                      En rush
                      <span className="tabular-nums">{rush.length}</span>
                    </h3>
                    {rush.length > 0 && (
                      <p className="mb-2 text-[0.8125rem] text-faint">
                        {`Délai annoncé de ${simulation.rush.waitMinutes}\u00a0min ou plus.`}
                      </p>
                    )}
                    {rush.length ? (
                      <ul className="flex flex-col">
                        {rush.map((s, rank) => (
                          <li
                            key={fixture.restaurants[s.index].id}
                            className={!allRush && rush.length > display.rushPreview + 1 && rank >= display.rushPreview ? "max-sm:hidden" : ""}
                          >
                            <button
                              type="button"
                              onClick={() => select(s.index)}
                              className="flex w-full items-center gap-2.5 rounded-lg py-1 text-left transition-colors hover:bg-foreground/[0.04]"
                            >
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ember-2 text-[0.6875rem] font-bold text-background tabular-nums">
                                {rank + 1}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm">{fixture.restaurants[s.index].name}</span>
                              <span className="shrink-0 text-sm font-medium text-ember-2 tabular-nums">{formatWait(s.waitNow ?? 0)}</span>
                            </button>
                          </li>
                        ))}
                        {rush.length > display.rushPreview + 1 && (
                          <li className="sm:hidden">
                            <button
                              type="button"
                              onClick={() => setAllRush((all) => !all)}
                              aria-expanded={allRush}
                              className="min-h-11 text-sm font-medium text-foreground"
                            >
                              {allRush ? "Réduire ↑" : `Voir les ${rush.length} →`}
                            </button>
                          </li>
                        )}
                      </ul>
                    ) : nextPeak ? (
                      <div className="mt-1">
                        <p className="text-sm text-muted">
                          {`Aucun délai de ${simulation.rush.waitMinutes}\u00a0min ou plus.`}
                        </p>
                        <p className={`mt-3 ${PANEL_TITLE}`}>Prochaine pointe</p>
                        <p className="font-display text-2xl leading-tight">
                          {`vers ${peakFrom}`}
                        </p>
                        <p className="mt-1 text-[0.8125rem] text-faint">
                          {`≈ ${formatInteger(nextPeak.count)} cmd QR / ${display.bucketMinutes}\u00a0min ${weekday} dernier`}
                        </p>
                        <a
                          href={`?heure=${formatClockParam(replayAt)}&jour=${day}`}
                          className="mt-2.5 inline-flex min-h-9 items-center rounded-full border border-hairline px-3.5 text-sm font-medium transition-colors hover:border-foreground/40"
                        >
                          {`Revoir le rush ${replayName}`}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        {totals.openCount
                          ? `Aucun délai de ${simulation.rush.waitMinutes}\u00a0min ou plus.`
                          : `Réseau fermé, ouverture à ${firstOpening}.`}
                      </p>
                    )}
                  </div>
                  {fresh.length > 0 && (
                    <div className="2xl:w-full">
                      <h3 className={`mb-1.5 flex items-center justify-between ${PANEL_TITLE}`}>
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="size-2.5 rounded-full border border-foreground/60" />
                          {`Ouverts depuis ${simulation.newDays}\u00a0jours`}
                        </span>
                        <span className="tabular-nums">{fresh.length}</span>
                      </h3>
                      {/* Un nom par ligne : un fil de texte formait de faux couples. */}
                      <ul className="flex flex-col text-sm leading-[1.375rem]">
                        {fresh.map((s) => (
                          <li key={fixture.restaurants[s.index].id}>
                            <button
                              type="button"
                              onClick={() => select(s.index)}
                              aria-pressed={s.index === selected}
                              className={`max-w-full truncate text-left transition-colors hover:text-foreground ${
                                s.index === selected ? "text-foreground" : "text-muted"
                              }`}
                            >
                              {fixture.restaurants[s.index].name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="order-1 w-full 2xl:order-2 2xl:min-h-0 2xl:min-w-0 2xl:flex-1">
                  <NetworkMap
                    fixture={fixture}
                    snapshots={snapshots}
                    rushOrder={rushOrder}
                    seconds={seconds}
                    selected={selected}
                    onSelect={select}
                    showCoverage={showCoverage}
                  />
                </div>
              </div>
            </section>

            <section className={`flex flex-col px-5 py-4 2xl:h-[16rem] ${CARD}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-lg font-medium">
                  <span className="sm:hidden">{`Commandes QR / ${display.bucketMinutes}\u00a0min`}</span>
                  <span className="hidden sm:inline">{`Commandes QR par tranche de\u00a0${display.bucketMinutes}\u00a0min`}</span>
                </h2>
                <ChartLegend
                  reference={`${capitalize(weekday)} dernier`}
                  pace={pace}
                  unit={`cmd / ${display.bucketMinutes}\u00a0min`}
                />
              </div>
              <div className="mt-3 h-48 2xl:h-auto 2xl:min-h-0 2xl:flex-1">
                <ActivityChart
                  today={todayCurve}
                  reference={reference}
                  start={range.start}
                  end={range.end}
                  now={seconds}
                  label={`Commandes QR du réseau au fil de la journée, comparées à ${weekday} dernier.`}
                  tickHours={display.tickHours}
                  scaleMax={scaleMax}
                  ticks={display.chartTicks}
                  forecast={nextPeak && { ...nextPeak, label: peakFrom! }}
                />
              </div>
            </section>
          </div>

          <div className="relative min-h-0 lg:h-0 lg:min-h-full 2xl:col-span-3">
            <section className={`flex h-full min-h-0 flex-col ${CARD} ${current ? "2xl:hidden" : ""}`}>
              <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <h2 className="font-display text-lg font-medium">Commandes en direct</h2>
                <p className="flex items-center gap-2 text-[0.8125rem] text-muted tabular-nums">
                  <LiveDot />
                  {formatInteger(totals.orders)} aujourd’hui
                </p>
              </div>
              <div ref={feed} className="min-h-0 flex-1 lg:overflow-hidden">
                <LiveFeed
                  fixture={fixture}
                  orders={latestOrders(sim, seconds, feedRows ?? display.feedPreview)}
                  now={seconds}
                  opensAt={firstOpening}
                  onSelect={select}
                />
              </div>
            </section>

            {current && (
              <>
                <div aria-hidden onClick={close} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm backdrop-saturate-50 2xl:hidden" />
                <aside
                  aria-label={`Fiche du restaurant ${fixture.restaurants[current.index].name}`}
                  className={`reseau-sheet fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-hidden rounded-b-none shadow-2xl shadow-black/60 lg:inset-y-4 lg:left-auto lg:right-4 lg:max-h-none lg:w-[26rem] lg:rounded-b-2xl 2xl:static 2xl:z-auto 2xl:h-full 2xl:w-auto 2xl:shadow-none ${CARD}`}
                >
                  <RestaurantPanel
                    fixture={fixture}
                    sim={sim}
                    lastWeek={lastWeek}
                    range={range}
                    snapshot={current}
                    seconds={seconds}
                    rank={byRevenue.indexOf(current) + 1}
                    networkShare={networkShare}
                    onClose={close}
                  />
                </aside>
              </>
            )}
          </div>

          <section className={`flex min-h-0 flex-col lg:col-span-2 2xl:col-span-3 ${CARD}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-5 pb-2 pt-4">
              <h2 className="font-display text-lg font-medium">Classement du jour</h2>
              <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
                <span>Délai : en ce moment</span>
                <span aria-hidden className="text-faint">·</span>
                <span aria-hidden className="size-2 rounded-full border border-foreground/50" />
                nouveau
              </p>
            </div>
            <Ranking
              fixture={fixture}
              snapshots={snapshots}
              rushOrder={rushOrder}
              selected={selected}
              onSelect={select}
            />
          </section>
        </div>

        <section
          ref={closing}
          className={`p-5 2xl:hidden ${CARD}`}
        >
          <h2 className="font-display text-lg font-medium">Ce que le réseau reçoit</h2>
          <p className="mt-1 text-sm text-pretty text-muted">
            Dans chaque restaurant, sans changer de caisse : un menu QR aux couleurs de l’enseigne, le paiement
            en ligne et des tickets numérotés avec l’heure de retrait, imprimés sur les imprimantes de cuisine en
            place. Pour le siège, cette vue du réseau.
          </p>
          <div className="mt-5">
            <Terms
              rate={rate}
              aside={
                <div className="flex shrink-0 flex-col gap-2 sm:items-start lg:items-end">
                  <a
                    href={mail}
                    className="flex min-h-11 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
                  >
                    En parler avec Ominin
                  </a>
                  <p className="text-[0.8125rem] text-faint max-sm:text-center lg:text-right">
                    Un appel de 30 minutes, puis le choix du pilote.
                  </p>
                </div>
              }
            />
          </div>
        </section>
      </main>

      <Popover id="reseau-hypotheses" title="Hypothèses de la simulation">
        <ul className="flex flex-col divide-y divide-hairline [&>li]:py-2.5 [&>li:first-child]:pt-0 [&>li:last-child]:pb-0">
          {assumptions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Popover>
      <Popover id="reseau-conditions" title="Les conditions">
        <Terms rate={rate} />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <p>Un appel de 30 minutes, puis le choix du pilote.</p>
          <a
            href={mail}
            className="flex min-h-10 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background"
          >
            En parler avec Ominin
          </a>
        </div>
      </Popover>

      <a
        href={mail}
        aria-hidden={!floatingCta}
        tabIndex={floatingCta ? undefined : -1}
        className={`fixed inset-x-4 bottom-4 z-30 flex min-h-11 items-center justify-center rounded-full border border-foreground/30 bg-surface text-sm font-semibold shadow-lg shadow-black/60 transition-[opacity,translate] duration-300 motion-reduce:transition-none sm:hidden ${
          floatingCta ? "" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        En parler avec Ominin
      </a>
    </div>
  );
}
