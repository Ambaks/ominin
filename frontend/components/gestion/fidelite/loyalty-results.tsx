"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useWide } from "@/components/gestion/soirees/use-wide";
import {
  Bars,
  CompareChart,
  ErrorNotice,
  Plate,
  SectionHeading,
  Segmented,
  Sheet,
  Shimmer,
  StatTile,
  niceTicks,
  type DeltaTone,
} from "@/components/gestion/ui";
import type { Entity } from "@/components/gestion/ui/entity";
import { ANALYTICS_PERIOD_DAYS } from "@/lib/gestion/constants";
import { loadLoyaltySeries, type LoyaltyBucket, type LoyaltyStats } from "@/lib/gestion/fidelite";
import { CardIcon, GiftOpenIcon, PeopleIcon, PhoneCheckIcon } from "./icons";

/*
 * Ce que le programme rapporte, sur la période choisie : la part des commandes
 * encaissées qui portent une carte, les clients avec carte, les récompenses
 * servies, les téléphones reconnus. Chaque chiffre a son graphique, sur l'ombre
 * de la période d'avant : à l'écran large il est sous le chiffre ; au téléphone,
 * la tuile l'ouvre dans une feuille, sinon la page ne serait que des courbes.
 * « Depuis le début » se lit par semaine et n'a rien à quoi se comparer.
 */

const ALL = "all";
type Period = `${(typeof ANALYTICS_PERIOD_DAYS)[number]}` | typeof ALL;
const PERIODS: { value: Period; label: string }[] = [
  ...ANALYTICS_PERIOD_DAYS.map((days) => ({ value: `${days}` as Period, label: `${days} jours` })),
  { value: ALL, label: "Tout" },
];

const METRICS = ["cards", "members", "rewards", "phones"] as const;
type Metric = (typeof METRICS)[number];

const GRID_LINES = 2;
/** Au-delà, l'axe des x n'écrit qu'une date sur cinq. */
const DENSE_FROM = 10;
const DENSE_EVERY = 5;

const shortDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateOf = (bucket: string) => shortDay.format(new Date(`${bucket}T00:00:00`));
/** Une date courte, ou le seul numéro du jour quand l'axe en aligne beaucoup. */
const axisDate = (bucket: string, tight: boolean) =>
  tight ? String(new Date(`${bucket}T00:00:00`).getDate()) : dateOf(bucket);
const count = (n: number) => n.toLocaleString("fr-FR");
const plural = (n: number, one: string, many: string) => `${count(n)} ${n > 1 ? many : one}`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${count(n)}`;
const percent = (value: number) => `${value} %`;
const TONE: Record<DeltaTone, string> = {
  better: "text-status-signed",
  worse: "text-status-lost",
  neutral: "text-muted",
};
/** Des unités entières : jamais une demi-récompense sur l'axe. */
const wholeTicks = (max: number) => niceTicks(Math.max(max, GRID_LINES), GRID_LINES);
const toneOf = (change: number): DeltaTone => (change > 0 ? "better" : change < 0 ? "worse" : "neutral");
const share = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);
const sum = (rows: LoyaltyBucket[], pick: (row: LoyaltyBucket) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

/** La période et celle d'avant, chacune réduite au temps où le programme existait. */
function split(rows: LoyaltyBucket[], period: Period) {
  if (period === ALL) return { current: rows, prior: [] };
  const half = rows.length / 2;
  return { current: rows.slice(half), prior: rows.slice(0, half).filter((row) => row.active) };
}

interface MetricView {
  metric: Metric;
  entity: Entity;
  icon: ReactNode;
  label: string;
  title: string;
  value: string;
  delta?: { text: string; tone: DeltaTone };
  baseline: string;
  chart: ReactNode;
}

/** Une courbe sur l'ombre de la période d'avant, alignées par rang. */
function Curve({
  entity,
  rows,
  prior,
  pick,
  format,
  period,
  label,
}: {
  entity: Entity;
  rows: LoyaltyBucket[];
  prior: LoyaltyBucket[];
  /** Null : la case n'a pas de valeur (aucune commande), la courbe la saute. */
  pick: (row: LoyaltyBucket) => number | null;
  format: (value: number) => string;
  period: Period;
  label: string;
}) {
  const points = (list: LoyaltyBucket[], shift = 0) =>
    list.flatMap((row, index) => {
      const y = row.active ? pick(row) : null;
      return y === null ? [] : [{ x: index + shift, y }];
    });
  const current = points(rows);
  const shadow = points(prior, rows.length - prior.length);
  const named = period === ALL ? "Depuis le début" : `${period} derniers jours`;
  const dense = rows.length > DENSE_FROM;
  return (
    <CompareChart
      entity={entity}
      current={{ label: named, points: current }}
      previous={shadow.length ? { label: `${period} jours d’avant`, points: shadow } : undefined}
      domain={[0, Math.max(rows.length - 1, 1)]}
      ticks={rows.flatMap((row, x) =>
        !dense || x % DENSE_EVERY === 0
          ? [{ x, label: axisDate(row.bucket, dense && period !== ALL), wide: !dense && x % 2 === 1 }]
          : []
      )}
      yTicks={wholeTicks(Math.max(...[...current, ...shadow].map((point) => point.y)))}
      format={format}
      tip={(x) => {
        const row = rows[Math.round(x)];
        const before = prior[Math.round(x) - (rows.length - prior.length)];
        return (
          <>
            <span>{row && dateOf(row.bucket)}</span>
            {before && <span className="text-muted"> / {dateOf(before.bucket)}</span>}
          </>
        );
      }}
      label={label}
    />
  );
}

function buildViews(stats: LoyaltyStats, rows: LoyaltyBucket[], period: Period): MetricView[] {
  const { current, prior } = split(rows, period);
  const compared = prior.length > 0;
  const span = period === ALL ? "depuis le début" : `sur ${period} jours`;
  const before = `les ${period} jours d’avant`;

  const paid = sum(current, (row) => row.paidOrders);
  const withCard = sum(current, (row) => row.cardOrders);
  const priorPaid = sum(prior, (row) => row.paidOrders);
  const overall = share(withCard, paid);
  const overallPrior = share(sum(prior, (row) => row.cardOrders), priorPaid);
  const cardsChange = overall !== null && overallPrior !== null ? overall - overallPrior : null;

  const members = {
    now: sum(current, (row) => row.newMembers),
    before: sum(prior, (row) => row.newMembers),
  };
  const phones = {
    now: sum(current, (row) => row.newPhones),
    before: sum(prior, (row) => row.newPhones),
  };

  const rewards = sum(current, (row) => row.rewardsUsed);
  const rewardsPrior = sum(prior, (row) => row.rewardsUsed);
  const rewardsTop = wholeTicks(Math.max(...current.map((row) => row.rewardsUsed)));
  const dense = current.length > DENSE_FROM;

  const grown = (gain: { now: number; before: number }, unit: string) =>
    compared
      ? { delta: { text: signed(gain.now), tone: toneOf(gain.now - gain.before) }, baseline: `${span}, contre ${signed(gain.before)} ${before}` }
      : { baseline: unit };

  return [
    {
      metric: "cards",
      entity: "orders",
      icon: <CardIcon />,
      label: "Commandes avec carte",
      title: "Part des commandes encaissées où le client a donné son numéro ou son email",
      value: overall === null ? "—" : percent(overall),
      ...(cardsChange !== null
        ? { delta: { text: `${cardsChange > 0 ? "+" : ""}${cardsChange} pts`, tone: toneOf(cardsChange) } }
        : {}),
      baseline: `${count(withCard)} sur ${plural(paid, "encaissée", "encaissées")} ${span}`,
      chart: (
        <Curve
          entity="orders"
          rows={current}
          prior={prior}
          pick={(row) => share(row.cardOrders, row.paidOrders)}
          format={percent}
          period={period}
          label={`Part des commandes encaissées avec une carte ${span} : ${overall === null ? "aucune commande" : percent(overall)}${overallPrior === null ? "" : ` ; ${percent(overallPrior)} ${before}`}.`}
        />
      ),
    },
    {
      metric: "members",
      entity: "orders",
      icon: <PeopleIcon />,
      label: "Clients avec carte",
      title: "Clients qui ont une carte ; ceux qui ont commandé au moins deux fois avec",
      value: count(stats.members),
      ...grown(members, `${count(stats.returningMembers)} ${stats.returningMembers > 1 ? "sont revenus" : "est revenu"} commander`),
      chart: (
        <Curve
          entity="orders"
          rows={current}
          prior={prior}
          pick={(row) => row.members}
          format={count}
          period={period}
          label={`Clients avec carte : ${count(stats.members)}, ${signed(members.now)} ${span}.`}
        />
      ),
    },
    {
      metric: "rewards",
      entity: "money",
      icon: <GiftOpenIcon />,
      label: "Récompenses servies",
      title: "Récompenses offertes depuis le menu ; points gagnés et pas encore dépensés",
      value: count(rewards),
      ...(compared
        ? { delta: { text: signed(rewards - rewardsPrior), tone: toneOf(rewards - rewardsPrior) }, baseline: `contre ${count(rewardsPrior)} ${before}` }
        : { baseline: `${plural(stats.pointsOutstanding, "point", "points")} en circulation` }),
      chart: (
        <Bars
          entity="money"
          dense={dense}
          data={current.map((row, index) => ({
            label: !dense || index % DENSE_EVERY === 0 ? axisDate(row.bucket, dense && period !== ALL) : "",
            value: row.rewardsUsed,
          }))}
          ticks={rewardsTop}
          format={count}
          label={`Récompenses servies ${span} : ${count(rewards)}${compared ? ` ; ${count(rewardsPrior)} ${before}` : ""}.`}
        />
      ),
    },
    {
      metric: "phones",
      entity: "orders",
      icon: <PhoneCheckIcon />,
      label: "Téléphones reconnus",
      title: "Téléphones que le menu reconnaît d'une visite à l'autre : ces clients n'ont plus rien à taper",
      value: count(stats.rememberedPhones),
      ...grown(phones, "reconnus d'une visite à l'autre"),
      chart: (
        <Curve
          entity="orders"
          rows={current}
          prior={prior}
          pick={(row) => row.phones}
          format={count}
          period={period}
          label={`Téléphones reconnus : ${count(stats.rememberedPhones)}, ${signed(phones.now)} ${span}.`}
        />
      ),
    },
  ];
}

export function LoyaltyResults({ etablissementId, stats }: { etablissementId: string; stats: LoyaltyStats }) {
  const wide = useWide();
  const [period, setPeriod] = useState<Period>(PERIODS[0].value);
  const [open, setOpen] = useState<Metric | null>(null);
  // Une période déjà lue ne se recharge pas, tant que les totaux n'ont pas bougé.
  const [cache, setCache] = useState<{
    owner: LoyaltyStats;
    rows: Partial<Record<Period, LoyaltyBucket[]>>;
    failed?: { period: Period; error: unknown };
  }>({ owner: stats, rows: {} });
  const fresh = cache.owner === stats;
  const rows = fresh ? cache.rows[period] : undefined;
  const failure = fresh && cache.failed?.period === period ? cache.failed.error : null;
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (rows || failure) return;
    let cancelled = false;
    loadLoyaltySeries(etablissementId, period === ALL ? null : Number(period)).then(
      (loaded) => {
        if (cancelled) return;
        setCache((previous) => ({
          owner: stats,
          rows: { ...(previous.owner === stats ? previous.rows : {}), [period]: loaded },
        }));
      },
      (error: unknown) => {
        if (cancelled) return;
        setCache((previous) => ({ ...previous, owner: stats, failed: { period, error } }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [etablissementId, stats, period, rows, failure, attempt]);

  const retry = () => {
    setCache((previous) => ({ ...previous, failed: undefined }));
    setAttempt((value) => value + 1);
  };

  const views = rows?.length ? buildViews(stats, rows, period) : null;
  const opened = views?.find((view) => view.metric === open);
  const selector = (glass: boolean) => (
    <Segmented glass={glass} label="Période" options={PERIODS} value={period} onChange={setPeriod} />
  );

  return (
    <section className="grid gap-4" aria-labelledby="fidelite-resultats">
      <SectionHeading id="fidelite-resultats" title="Résultats" right={selector(true)} />
      {failure != null ? (
        <ErrorNotice error={failure} onRetry={retry} />
      ) : !views ? (
        <div aria-busy className="grid gap-g-gap sm:grid-cols-2">
          {METRICS.map((metric) => (
            <Shimmer key={metric} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid gap-g-gap sm:grid-cols-2">
          {views.map((view) => (
            <StatTile
              key={view.metric}
              entity={view.entity}
              icon={view.icon}
              label={view.label}
              value={view.value}
              delta={view.delta}
              baseline={view.baseline}
              title={view.title}
              onClick={wide ? undefined : () => setOpen(view.metric)}
              chart={wide ? <div className="mt-4">{view.chart}</div> : undefined}
            />
          ))}
        </div>
      )}
      {opened && !wide && (
        <Sheet title={opened.label} onClose={() => setOpen(null)}>
          <div className="grid gap-5">
            {selector(false)}
            <Plate className="p-4">
              <p className="text-g-kpi tabular-nums">{opened.value}</p>
              <p className="mt-1 text-g-meta text-muted">
                {opened.delta && <b className={`font-semibold ${TONE[opened.delta.tone]}`}>{opened.delta.text} </b>}
                {opened.baseline}
              </p>
            </Plate>
            {opened.chart}
          </div>
        </Sheet>
      )}
    </section>
  );
}
