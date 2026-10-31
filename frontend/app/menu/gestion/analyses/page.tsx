"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CostsSheet } from "@/components/gestion/analyses/costs-sheet";
import { SalesHeatmap } from "@/components/gestion/analyses/heatmap";
import { MenuMatrix } from "@/components/gestion/analyses/menu-matrix";
import { StaffingCard } from "@/components/gestion/analyses/staffing";
import { Card, Fact, money, percentOf, RangeRows, TargetRow, WEEKDAYS } from "@/components/gestion/analyses/parts";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { BagIcon, ChartIcon, PaymentsIcon, TablesIcon } from "@/components/gestion/icons";
import {
  Bars,
  EmptyState,
  ErrorNotice,
  GlassButton,
  niceTicks,
  Notice,
  Plate,
  RankedList,
  ReserveGerant,
  SectionHeading,
  Segmented,
  Shimmer,
  StatTile,
} from "@/components/gestion/ui";
import {
  decompose,
  forecast,
  heatGrid,
  laborViews,
  menuMatrix,
  opportunities,
  ratio,
  revenuePerStaffHour,
  targetsOf,
  weekdayNorms,
  type AnalysesData,
  type StaffingData,
  type Opportunity,
} from "@/lib/gestion/analyses";
import { comparison } from "@/lib/gestion/compare";
import { ANALYSES, ANALYSES_DEFAULT_PERIOD_DAYS, ANALYSES_PERIOD_DAYS, SMALL_BASE } from "@/lib/gestion/constants";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useAnalyses } from "@/lib/gestion/use-analyses";
import { useStaffing } from "@/lib/gestion/use-staffing";

type PeriodKey = `${(typeof ANALYSES_PERIOD_DAYS)[number]}`;

const PERIODS = ANALYSES_PERIOD_DAYS.map((days) => ({
  value: `${days}` as PeriodKey,
  label: `${days} jours`,
}));

/** Lignes de grille du CA par heure d'équipe. */
const GRID_LINES = 3;
/** En deçà, le coût n'est pas connu sur tout le CA, arrondi compris. */
const FULL_COVERAGE = 99.5;
/** Les derniers jours lus face à leur fourchette normale. */
const NORM_DAYS = 7;

const signed = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value))}`;

function Block({ i, className = "", children }: { i: number; className?: string; children: ReactNode }) {
  return (
    <div className={`g-rise grid gap-g-gap ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </div>
  );
}

function OpportunityRow({ item }: { item: Opportunity }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-semibold">{item.title}</p>
        <p className="mt-0.5 text-g-meta text-muted">{item.fact}</p>
      </div>
      {item.monthly != null && (
        <p
          className="whitespace-nowrap text-right tabular-nums"
        >
          <small className="text-g-meta text-muted">{item.ceiling ? "jusqu’à " : "≈ "}</small>
          <b className="font-semibold">{money(item.monthly)}</b>
          <small className="text-g-meta text-muted"> {item.basis === "ca" ? "de CA HT" : "de marge"} /mois</small>
        </p>
      )}
      <GlassButton href={item.href} aria-label={`${item.action} : ${item.title}`}>{item.action}</GlassButton>
    </li>
  );
}

function Sections({
  data,
  days,
  from,
  to,
  previousFrom,
  dayEndHour,
  staffing,
  canDraft,
  openCosts,
}: {
  data: AnalysesData;
  days: number;
  from: string;
  to: string;
  previousFrom: string;
  dayEndHour: number;
  staffing: { from: string; to: string; data: StaffingData } | null;
  /** Le brouillon s'ouvre dans Équipe → Planning : sans ce volet, la carte mènerait nulle part. */
  canDraft: boolean;
  openCosts: () => void;
}) {
  const { current, previous } = data.summary;
  const when = `les ${days} jours d’avant`;
  const nothing = `aucune vente les ${days} jours d’avant`;
  const targets = targetsOf(data.settings);
  const margin = current.costed_revenue_ht - current.cost;
  const previousMargin = previous.costed_revenue_ht - previous.cost;
  const coverage = ratio(current.costed_revenue_ht * 100, current.revenue_ht);
  const hasCosts = current.costed_revenue_ht > 0;
  const estimated = current.cost > current.cost_exact;
  const partial = coverage != null && coverage < FULL_COVERAGE;
  const foodPercent = ratio(current.cost * 100, current.costed_revenue_ht);
  const labor = laborViews(data, from, to, previousFrom);
  const hasLabor = labor.current.hours > 0;
  const primePercent =
    foodPercent != null && labor.current.percent != null ? foodPercent + labor.current.percent : null;

  const found = opportunities(data, days, from, to, money);
  const split = decompose(current, previous);
  const norms = weekdayNorms(data.days, NORM_DAYS, to);
  const ahead = forecast(data.days, to);
  const cells = heatGrid(data, from, to);
  const matrix = menuMatrix(data);
  const perHour = revenuePerStaffHour(data, from, to);
  const perHourMax = Math.max(...perHour.map((row) => row.value ?? 0));

  const funnel = data.funnel.current;
  const cancelled = data.cancelled.current;
  const memberTicket = ratio(data.loyalty.member_revenue, data.loyalty.member_orders);
  const otherTicket = ratio(data.loyalty.other_revenue, data.loyalty.other_orders);
  const accordRevenue = data.accords.reduce((sum, row) => sum + row.revenue, 0);
  const secondRound = ratio(current.repeat_visits * 100, current.table_visits);
  const previousSecondRound = ratio(previous.repeat_visits * 100, previous.table_visits);
  let block = 2;

  return (
    <>
      <Block i={block++} className="sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          entity="money"
          icon={<PaymentsIcon />}
          label="CA encaissé TTC"
          value={money(current.revenue)}
          {...comparison(current.revenue, { value: previous.revenue, count: previous.orders }, when, nothing, money)}
        />
        <StatTile
          entity="orders"
          icon={<TablesIcon />}
          label="Passages"
          value={String(current.visits)}
          {...comparison(current.visits, { value: previous.visits, count: previous.visits }, when, nothing, String)}
        />
        <StatTile
          entity="money"
          icon={<BagIcon />}
          label="Dépense par passage"
          value={current.visits > 0 ? money(current.revenue / current.visits) : "—"}
          title="CA encaissé ÷ passages, TTC"
          {...comparison(
            current.visits > 0 ? current.revenue / current.visits : 0,
            { value: previous.visits > 0 ? previous.revenue / previous.visits : 0, count: previous.visits },
            when,
            nothing,
            money
          )}
        />
        <StatTile
          entity="money"
          icon={<ChartIcon />}
          label={estimated ? "Marge brute HT estimée" : "Marge brute HT"}
          value={hasCosts ? money(margin) : "—"}
          title="CA HT − coût matière, sur les ventes dont le coût est connu"
          onClick={hasCosts ? undefined : openCosts}
          {...(!hasCosts
            ? { baseline: "coûts à renseigner" }
            : partial
              ? { baseline: `sur ${percentOf(coverage)} du CA HT` }
              : comparison(margin, { value: previousMargin, count: previous.orders }, when, nothing, money))}
        />
      </Block>

      <Block i={block++}>
        <SectionHeading
          title="Pistes"
          sub={`Ordres de grandeur d’après ces ${days} jours, ramenés à un mois${days < ANALYSES.monthDays ? ", donc très variables" : ""}. Elles se recoupent : ne les additionnez pas. « Jusqu’à » : si tout se récupère.`}
        />
        {found.length > 0 ? (
          <Plate className="px-5 py-1">
            <ol className="m-0 list-none divide-y divide-hairline p-0" aria-label="Pistes, de la plus grosse à la plus petite">
              {found.map((item) => (
                <OpportunityRow key={item.id} item={item} />
              ))}
            </ol>
          </Plate>
        ) : (
          <EmptyState
            text={
              current.visits < ANALYSES.minVisits
                ? `Pas assez de passages pour chiffrer des pistes : ${ANALYSES.minVisits} au minimum, ${current.visits} sur la période.`
                : "Aucune piste sur cette période."
            }
          />
        )}
      </Block>

      <Block i={block++}>
        <SectionHeading title="Ventes" sub="Un passage : une table sur un service, ou une commande sans table." />
        <div className="grid gap-g-gap lg:grid-cols-2">
          <Card title="D’où vient l’écart" sub={`face aux ${days} jours d’avant`}>
            {split ? (
              <>
                <Fact label="Écart de CA" value={signed(split.revenueDelta)} />
                <Fact label="Dû au nombre de passages" value={signed(split.fromVisits)} />
                <Fact label="Dû à la dépense par passage" value={signed(split.fromSpend)} />
              </>
            ) : (
              <p className="text-g-meta text-muted">Pas assez de passages avant pour comparer.</p>
            )}
            {secondRound != null && (
              <Fact
                label="Tables avec une 2ᵉ commande"
                value={percentOf(secondRound)}
                title={previousSecondRound == null ? undefined : `${percentOf(previousSecondRound)} ${when}`}
              />
            )}
          </Card>
          {norms.length > 0 ? (
            <Card title="Derniers jours" sub="bande : habituel · trait : jour type · ↓ ↑ hors de la bande">
              <RangeRows rows={norms} label="Les derniers jours face à leur fourchette normale" />
            </Card>
          ) : null}
          {ahead.length > 0 ? (
            <Card title="7 prochains jours" sub={`estimation d’après les ${ANALYSES.forecastWeeks} derniers mêmes jours, hors fêtes`}>
              <RangeRows rows={ahead} entity="orders" label="Prévision de CA sur 7 jours" />
            </Card>
          ) : null}
          <SalesHeatmap
            cells={cells}
            dayEndHour={dayEndHour}
            htShare={ratio(current.revenue_ht, current.revenue) ?? 0}
            hasLabor={hasLabor}
          />
        </div>
      </Block>

      <Block i={block++}>
        <SectionHeading
          title="Carte"
          sub={hasCosts ? "populaire : part de sa catégorie · rentable : marge par portion HT" : undefined}
        />
        {matrix.rows.length > 0 ? (
          <MenuMatrix rows={matrix.rows} tooFew={matrix.tooFew} />
        ) : (
          <EmptyState
            text="La matrice demande un coût : une part par catégorie suffit pour démarrer."
            action={<GlassButton variant="primary" onClick={openCosts}>Renseigner mes coûts</GlassButton>}
          />
        )}
        {current.visits >= SMALL_BASE && data.categories.some((row) => row.visits > 0) && (
          <Card title="Présence par catégorie" sub="part des passages">
            <RankedList
              size="bar"
              entity="orders"
              label="Part des passages avec au moins un article de chaque catégorie"
              items={data.categories
                .filter((row) => row.visits > 0)
                .sort((a, b) => b.visits - a.visits)
                .map((row) => ({
                  label: row.name,
                  value: percentOf((row.visits / current.visits) * 100),
                  amount: row.visits,
                  meta: money(row.revenue / row.visits),
                }))}
            />
          </Card>
        )}
      </Block>

      <Block i={block++}>
        <SectionHeading title="Marge" sub="hors taxes" />
        <div className="grid gap-g-gap lg:grid-cols-2">
          <Card
            title="Face aux objectifs"
            sub={[
              data.settings?.food_cost_target == null ? "objectifs par défaut" : null,
              hasCosts && partial ? `coût connu sur ${percentOf(coverage)} du CA` : null,
              hasLabor ? `${labor.current.daysCovered}/${labor.current.daysWithSales} jours pointés` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {hasCosts ? (
              <TargetRow
                label="Matière"
                value={foodPercent}
                target={targets.food}
                title={estimated ? "Estimée : une part de catégorie remplace les coûts exacts manquants" : undefined}
              />
            ) : null}
            {hasLabor && labor.current.percent != null ? (
              <TargetRow
                label="Équipe"
                value={labor.current.percent}
                target={targets.labor}
                title={`${Math.round(labor.current.hours)} h pointées, sur ${labor.current.daysCovered} jours de vente sur ${labor.current.daysWithSales}`}
              />
            ) : null}
            {primePercent != null ? (
              <TargetRow label="Matière + équipe" value={primePercent} target={targets.prime} />
            ) : null}
            {!hasCosts || !hasLabor || labor.current.percent == null ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-g-meta text-muted">
                  {!hasCosts ? "Coût matière à renseigner." : !hasLabor ? "Aucune heure pointée sur la période." : "Coût horaire à renseigner."}
                </p>
                <GlassButton onClick={openCosts}>Mes coûts</GlassButton>
              </div>
            ) : null}
            {current.free_units > 0 && <Fact label="Articles offerts" value={String(current.free_units)} />}
          </Card>
          {hasLabor && perHourMax > 0 && (
            <Card title="CA HT par heure d’équipe" sub={`${labor.current.daysCovered} jours pointés`}>
              <Bars
                entity="money"
                data={perHour.map((row) => ({
                  label: WEEKDAYS[row.dow - 1],
                  value: row.value ?? 0,
                  sub: row.value == null ? "—" : undefined,
                }))}
                ticks={niceTicks(perHourMax, GRID_LINES)}
                format={money}
                label={`CA hors taxes par heure d’équipe : ${perHour
                  .map((row) => `${WEEKDAYS[row.dow - 1]} ${row.value == null ? "pas de donnée" : money(row.value)}`)
                  .join(" ; ")}`}
              />
            </Card>
          )}
        </div>
        {canDraft && staffing && staffing.data.staff.length > 0 && (
          <StaffingCard
            data={staffing.data}
            to={staffing.to}
          />
        )}
      </Block>

      <Block i={block++}>
        <SectionHeading title="Pertes" />
        <div className="grid gap-g-gap lg:grid-cols-2">
          <Card title="Annulations" sub={`non refaites sous ${ANALYSES.replacedMinutes} min`}>
            <Fact label="Commandes annulées" value={String(cancelled.orders)} />
            <Fact label="Dont non refaites" value={`${cancelled.lost_orders} · ${money(cancelled.lost_revenue)}`} />
            {data.payments.attempts > 0 && (
              <>
                <Fact label="Paiements en ligne réussis" value={`${data.payments.succeeded} / ${data.payments.attempts}`} />
                <Fact label="Refusés sans reprise" value={String(data.payments.failed)} />
              </>
            )}
          </Card>
          {funnel.sessions > 0 && (
            <Card title="Du menu QR à la commande" sub="visites jusqu’à hier">
              <RankedList
                size="bar"
                entity="orders"
                label="Parcours du menu QR"
                items={[
                  { label: "Visites", amount: funnel.sessions },
                  { label: "Panier", amount: funnel.paniers },
                  { label: "Commande", amount: funnel.commandes },
                  { label: "Paiement", amount: funnel.paiements },
                ].map((step) => ({
                  label: step.label,
                  value: String(step.amount),
                  amount: step.amount,
                  meta: percentOf((step.amount / funnel.sessions) * 100),
                }))}
              />
            </Card>
          )}
        </div>
      </Block>

      {(data.loyalty.member_orders > 0 || data.accords.length > 0 || data.after_meal.shown > 0) && (
        <Block i={block++}>
          <SectionHeading title="Clients" />
          <div className="grid gap-g-gap lg:grid-cols-2">
            {data.loyalty.member_orders > 0 && (
              <Card title="Fidélité">
                <Fact label="Part du CA" value={percentOf(ratio(data.loyalty.member_revenue * 100, current.revenue))} />
                <Fact
                  label="Commande moyenne, membres · autres"
                  value={`${memberTicket == null ? "—" : money(memberTicket)} · ${otherTicket == null ? "—" : money(otherTicket)}`}
                />
                <Fact
                  label="Membres revenus sur la période"
                  value={`${data.loyalty.returning} / ${data.loyalty.members}`}
                />
              </Card>
            )}
            {(data.accords.length > 0 || data.after_meal.shown > 0) && (
              <Card title="Suggestions">
                {data.accords.length > 0 && <Fact label="CA des combos suggérés" value={money(accordRevenue)} />}
                {data.after_meal.shown > 0 && (
                  <>
                    <Fact label="Suggestion de fin de repas affichée" value={String(data.after_meal.shown)} />
                    <Fact label="Article ajouté" value={percentOf((data.after_meal.added / data.after_meal.shown) * 100)} />
                    <Fact label="Commande passée" value={percentOf((data.after_meal.ordered / data.after_meal.shown) * 100)} />
                  </>
                )}
              </Card>
            )}
          </div>
        </Block>
      )}
    </>
  );
}

export default function AnalysesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [days, setDays] = useState<number>(ANALYSES_DEFAULT_PERIOD_DAYS);
  const [costsOpen, setCostsOpen] = useState(false);
  const allowed = state?.role === "gerant" && hasFeature("analyses");
  const { loaded, stale, error, reload } = useAnalyses(allowed, days, state?.dayEndHour ?? 0);
  const { loaded: staffing } = useStaffing(allowed, state?.dayEndHour ?? 0);

  if (!state) return null;
  if (!hasFeature("analyses")) return <FeatureLocked feature="analyses" />;
  if (state.role !== "gerant") return <ReserveGerant ask="consulter les analyses" />;

  const data = loaded?.data ?? null;
  const noSales = data != null && data.summary.current.orders === 0 && data.summary.previous.orders === 0;
  const noFoodCost = data != null && !noSales && data.summary.current.costed_revenue_ht === 0;
  const noLaborCost =
    data != null && !noSales && data.labor.length > 0 && data.settings?.hourly_labor_cost == null;

  return (
    <div className="grid gap-[calc(var(--g-gap)*1.5)]">
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Analyses"
          sub="Jours complets, jusqu’à hier"
          right={
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label="Période"
                options={PERIODS}
                value={`${days}` as PeriodKey}
                onChange={(value) => setDays(Number(value))}
              />
              {data != null && <GlassButton onClick={() => setCostsOpen(true)}>Mes coûts</GlassButton>}
            </div>
          }
        />
      </Block>

      {error != null && <ErrorNotice error={error} onRetry={reload} />}

      {(noFoodCost || noLaborCost) && (
        <Notice
          tone="info"
          i={1}
          title={noFoodCost ? "Ajoutez vos coûts pour voir votre marge" : "Ajoutez votre coût horaire"}
          text={
            noFoodCost
              ? "Une part par catégorie suffit, et des pistes s’ajoutent."
              : "Il chiffre le poids de l’équipe et les heures creuses."
          }
          action={<GlassButton variant="primary" onClick={() => setCostsOpen(true)}>Renseigner</GlassButton>}
        />
      )}

      {data == null && error == null && (
        <div className="grid gap-g-gap" aria-busy>
          <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
            <Shimmer className="h-32 rounded-g-frame" />
            <Shimmer className="h-32 rounded-g-frame" />
            <Shimmer className="h-32 rounded-g-frame" />
            <Shimmer className="h-32 rounded-g-frame" />
          </div>
          <Shimmer className="h-64 rounded-g-card" />
        </div>
      )}

      {noSales && <EmptyState text="Aucune vente sur cette période ni sur celle d’avant." />}

      {loaded != null && !noSales && (
        <div className={`grid gap-[calc(var(--g-gap)*1.5)] ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
          <Sections
            data={loaded.data}
            days={loaded.days}
            from={loaded.from}
            to={loaded.to}
            previousFrom={loaded.previousFrom}
            dayEndHour={state.dayEndHour}
            staffing={staffing}
            canDraft={hasFeature("roles") && hasFeature("badgeage")}
            openCosts={() => setCostsOpen(true)}
          />
        </div>
      )}

      {costsOpen && data != null && (
        <CostsSheet data={data} onClose={() => setCostsOpen(false)} onSaved={reload} />
      )}
    </div>
  );
}
