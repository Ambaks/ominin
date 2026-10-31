"use client";

import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CuisinierApercu } from "@/components/gestion/apercu/cuisinier-apercu";
import { ArticlesEpuises } from "@/components/gestion/apercu/carte-en-vente";
import { MiseEnRoute, miseEnRouteDue } from "@/components/gestion/apercu/mise-en-route";
import { ServeurApercu } from "@/components/gestion/apercu/serveur-apercu";
import { FermeturesEnCours } from "@/components/gestion/fermetures-en-cours";
import {
  BagIcon,
  ChartIcon,
  CommandesIcon,
  GiftIcon,
  PaymentsIcon,
} from "@/components/gestion/icons";
import { StripePrompt } from "@/components/gestion/stripe-prompt";
import {
  Bars,
  EmptyState,
  GlassButton,
  Plate,
  RankedList,
  SectionHeading,
  Segmented,
  StatTile,
  type DeltaTone,
} from "@/components/gestion/ui";
import { formatPercent } from "@/lib/admin/format";
import { ANALYTICS_PERIOD_DAYS, SMALL_BASE } from "@/lib/gestion/constants";
import { formatPrice } from "@/lib/menu/format";
import {
  awaitsPayment,
  isPaid,
  isPickupShop,
  openOrders,
  orderTotal,
  ordersByHour,
  paidAt,
  periodStats,
  revenueByDay,
  revenueToday,
  serviceDate,
  serviceDayKey,
  tipsTotal,
  topVentes,
  topVentesToday,
  unavailableItems,
  type DayPoint,
  type VenteEntry,
} from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { GestionState } from "@/lib/gestion/types";

type Period = (typeof ANALYTICS_PERIOD_DAYS)[number];
type PeriodKey = `${Period}`;

const PERIODS = ANALYTICS_PERIOD_DAYS.map((days) => ({
  value: `${days}` as PeriodKey,
  label: `${days} jours`,
}));

/*
 * Lignes de grille des graphiques : trois pour le CA par jour, deux pour les
 * heures (24 colonnes serrées). Décision de page, en attendant une place dans
 * constants.ts (gelé pendant la refonte).
 */
const GRID_LINES = 3;
const GRID_LINES_DENSE = 2;
/** Au-delà, l'axe des jours ne garde qu'un numéro sur cinq. */
const DENSE_FROM = 10;
const DENSE_LABEL_EVERY = 5;
/** Repère des heures : toutes les six heures. */
const HOUR_LABEL_EVERY = 6;

/** Graduations « rondes » (1, 2, 5 × 10ⁿ) dont la plus haute couvre le maximum. */
function niceTicks(max: number, lines: number): number[] {
  if (max <= 0) return Array.from({ length: lines + 1 }, (_, i) => i);
  const raw = max / lines;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / magnitude;
  const step = (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10) * magnitude;
  return Array.from({ length: lines + 1 }, (_, i) => i * step);
}

function delta(current: number, previous: number): { text: string; tone: DeltaTone } {
  const ratio = (current - previous) / previous;
  return {
    text: `${ratio > 0 ? "+" : ""}${formatPercent(ratio)}`,
    tone: ratio > 0 ? "better" : ratio < 0 ? "worse" : "neutral",
  };
}

/** Ce qu'on avait encaissé le même jour la semaine dernière, à cette heure-ci. */
function sameHourLastWeek(state: GestionState): { total: number; payments: number } {
  const at = new Date();
  at.setDate(at.getDate() - 7);
  const day = serviceDayKey(at.toISOString(), state.dayEndHour);
  const until = at.toISOString();
  const paid = state.orders.filter(
    (order) =>
      isPaid(order) &&
      serviceDayKey(paidAt(order), state.dayEndHour) === day &&
      paidAt(order) <= until
  );
  return { total: paid.reduce((sum, order) => sum + orderTotal(order), 0), payments: paid.length };
}

/**
 * Le repère d'un chiffre comparé (DESIGN § 8) : un écart signé quand la base
 * le permet, la valeur d'alors sous une petite base, et rien de plus que ce
 * qu'on sait sans base. Jamais un « vs » sans écart en face.
 */
function comparison(
  current: number,
  previous: { value: number; count: number },
  when: string,
  nothing: string,
  format: (value: number) => string
): { delta?: { text: string; tone: DeltaTone }; baseline: string } {
  if (previous.count === 0) return { baseline: nothing };
  if (previous.count < SMALL_BASE) return { baseline: `était ${format(previous.value)} ${when}` };
  return { delta: delta(current, previous.value), baseline: `vs ${when}` };
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

function Block({
  i,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { i: number; children: ReactNode }) {
  return (
    <section {...props} className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </section>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <Plate className="px-5 pb-4 pt-4.5">
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="font-display text-g-h2">{title}</h2>
        {sub && <small className="text-g-meta text-muted">{sub}</small>}
      </div>
      {children}
    </Plate>
  );
}

const rankByQuantity = (entries: VenteEntry[], withRevenue: boolean) =>
  entries.map((entry) => ({
    label: entry.name,
    value: `×${entry.quantity}`,
    amount: entry.quantity,
    meta: withRevenue ? formatPrice(entry.revenue) : undefined,
  }));

function RevenueByDay({ points, period }: { points: DayPoint[]; period: Period }) {
  const dense = points.length > DENSE_FROM;
  const max = Math.max(...points.map((point) => point.revenue));
  return (
    <Card title="CA par jour" sub={dense ? "CA encaissé" : "CA · commandes"}>
      <Bars
        entity="money"
        dense={dense}
        data={points.map((point, index) => ({
          label: dense
            ? index % DENSE_LABEL_EVERY === 0
              ? String(point.day)
              : ""
            : point.label,
          value: point.revenue,
          sub: dense ? undefined : String(point.orders),
        }))}
        ticks={niceTicks(max, GRID_LINES)}
        format={formatPrice}
        label={`CA encaissé par jour sur ${period} jours : ${points
          .map((point) => `${point.full} ${formatPrice(point.revenue)}, ${plural(point.orders, "commande")}`)
          .join(" ; ")}`}
      />
    </Card>
  );
}

function PeakHours({ buckets, period }: { buckets: { hour: number; orders: number }[]; period: Period }) {
  const max = Math.max(...buckets.map((bucket) => bucket.orders));
  const total = buckets.reduce((sum, bucket) => sum + bucket.orders, 0);
  const peak = buckets.find((bucket) => bucket.orders === max);
  return (
    <Card title="Heures de pointe" sub={`commandes par heure · ${period} jours`}>
      <Bars
        dense
        entity="orders"
        data={buckets.map((bucket) => ({
          label: bucket.hour % HOUR_LABEL_EVERY === 0 ? `${bucket.hour} h` : "",
          value: bucket.orders,
        }))}
        ticks={niceTicks(max, GRID_LINES_DENSE)}
        format={(value) => plural(value, "commande")}
        label={
          peak && max > 0
            ? `Commandes par heure sur ${period} jours : pointe à ${peak.hour} h avec ${plural(max, "commande")} ; total ${total}`
            : `Commandes par heure sur ${period} jours : aucune`
        }
      />
    </Card>
  );
}

/**
 * L'accueil n'est pas toujours l'aperçu : la salle va droit au service, et un
 * restaurant sans aperçu ouvert n'a pas de tableau de bord à montrer.
 */
function GoTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return null;
}

export default function ApercuPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  const [period, setPeriod] = useState<Period>(ANALYTICS_PERIOD_DAYS[0]);

  if (!state) return null;
  const pickupShop = isPickupShop(state);
  // Écran d'accueil quand l'aperçu ne s'affiche pas : le service s'il est
  // ouvert, les soirées d'un club, la carte sinon — elle ne se retire jamais
  // d'un restaurant.
  const home = pickupShop
    ? "/gestion/retraits"
    : hasFeature("commandes")
      ? "/gestion/commandes"
      : hasFeature("soirees")
        ? "/gestion/soirees"
        : "/gestion/menu";
  // La salle n'a pas d'aperçu par défaut : son écran d'accueil est le service
  // lui-même. Ouvert, elle a le sien. La cuisine garde le sien — c'est là
  // qu'elle tient les disponibilités. En boutique à emporter seule, l'équipe
  // vit sur Retraits : seul le gérant a un aperçu.
  if (!hasFeature("apercu") || (pickupShop && state.role !== "gerant")) {
    return <GoTo href={home} />;
  }
  if (state.role === "serveur") {
    return hasFeature("apercu_serveur") ? (
      <ServeurApercu state={state} />
    ) : (
      <GoTo href={home} />
    );
  }
  if (state.role !== "gerant") return <CuisinierApercu state={state} />;

  const indispo = unavailableItems(state);
  const hasCommandes = hasFeature("commandes");
  const topVentesJour = hasCommandes ? topVentesToday(state) : [];
  const serviceToday = serviceDate(new Date(), state.dayEndHour);
  const todayLabel = serviceToday.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const weekday = serviceToday.toLocaleDateString("fr-FR", { weekday: "long" });

  // Le jour : commandes ouvertes et CA encaissé, comparé au même jour de la
  // semaine passée à la même heure : une journée en cours ne se mesure pas à
  // une journée finie.
  const open = hasCommandes ? openOrders(state) : [];
  const toPay = open.filter(awaitsPayment).length;
  const toServe = open.length - toPay;
  const caJour = hasCommandes ? revenueToday(state) : 0;
  const lastWeek = hasCommandes ? sameHourLastWeek(state) : { total: 0, payments: 0 };

  const stats = hasCommandes ? periodStats(state, period) : null;
  const byDay = hasCommandes ? revenueByDay(state, period) : [];
  const ventesTop = hasCommandes ? topVentes(state, period) : [];
  const hours = hasCommandes ? ordersByHour(state, period) : [];
  const tips = hasCommandes ? tipsTotal(state, period) : 0;
  const hasAnalyticsData = stats ? stats.orders > 0 || ventesTop.length > 0 : false;
  // La période précédente n'est comparable que si l'espace l'a chargée : la
  // fenêtre de commandes couvre la plus longue période d'analytique.
  const comparable = period * 2 <= Math.max(...ANALYTICS_PERIOD_DAYS);
  const previous =
    stats && comparable
      ? (() => {
          const both = periodStats(state, period * 2);
          const orders = both.orders - stats.orders;
          const revenue = both.revenue - stats.revenue;
          return {
            revenue,
            orders,
            avgTicket: orders > 0 ? revenue / orders : 0,
            tips: tipsTotal(state, period * 2) - tips,
          };
        })()
      : null;
  // Trente jours : la période d'avant n'est pas chargée, on dit juste la durée.
  const versus = (current: number, value: number, format: (value: number) => string) =>
    previous
      ? comparison(
          current,
          { value, count: previous.orders },
          `les ${period} jours d’avant`,
          `aucune vente les ${period} jours d’avant`,
          format
        )
      : { baseline: `sur ${period} jours` };
  const otherPeriodWithData = ANALYTICS_PERIOD_DAYS.find(
    (days) => days !== period && periodStats(state, days).orders > 0
  );

  let block = 0;
  return (
    <div className="grid gap-5">
      <Block i={block++}>
        <SectionHeading
          level={1}
          title="Aujourd’hui"
          sub={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        />
      </Block>

      {/* La carte de mise en route porte déjà ce geste : deux invites à relier se contrediraient. */}
      {!miseEnRouteDue(state) && <StripePrompt />}

      <Block i={block++} className="empty:hidden">
        <MiseEnRoute state={state} />
      </Block>

      {hasCommandes && (
        <Block i={block++} data-visite="apercu-jour" className="grid gap-g-gap rounded-g-hero sm:grid-cols-2">
          <StatTile
            hero
            entity="orders"
            icon={<CommandesIcon />}
            label="Commandes en cours"
            value={String(open.length)}
            baseline={`${toPay} à encaisser · ${toServe} à servir`}
            href="/gestion/commandes"
            title="Commandes ouvertes en ce moment : à encaisser ou à servir"
          />
          <StatTile
            hero
            entity="money"
            icon={<PaymentsIcon />}
            label="CA du jour"
            value={formatPrice(caJour)}
            {...comparison(
              caJour,
              { value: lastWeek.total, count: lastWeek.payments },
              `${weekday} dernier à cette heure`,
              `rien d’encaissé ${weekday} dernier à cette heure`,
              formatPrice
            )}
            href={hasFeature("paiements") ? "/gestion/paiements" : "/gestion/commandes"}
            title="Chiffre d’affaires encaissé sur la journée de service, TTC"
          />
        </Block>
      )}

      {hasCommandes && (
        <Block i={block++} className="empty:hidden">
          <FermeturesEnCours state={state} />
        </Block>
      )}

      {(topVentesJour.length > 0 || indispo.length > 0) && (
        <Block
          i={block++}
          className={`grid gap-g-gap ${topVentesJour.length > 0 && indispo.length > 0 ? "lg:grid-cols-[7fr_5fr]" : ""}`}
        >
          {topVentesJour.length > 0 && (
            <Card title="Top ventes du jour" sub="quantités">
              <RankedList
                items={rankByQuantity(topVentesJour, false)}
                entity="orders"
                label="Plats les plus commandés aujourd’hui"
              />
            </Card>
          )}
          {indispo.length > 0 && (
            <Card title="À remettre en vente" sub={plural(indispo.length, "article")}>
              <ArticlesEpuises state={state} wide={topVentesJour.length === 0} />
              <div className="mt-2 flex justify-end">
                <GlassButton href="/gestion/menu">Voir la carte</GlassButton>
              </div>
            </Card>
          )}
        </Block>
      )}

      {hasCommandes && stats && (
        <Block i={block++} className="grid gap-g-gap">
          <SectionHeading
            title="Analytique"
            right={
              <Segmented
                label="Période"
                options={PERIODS}
                value={`${period}` as PeriodKey}
                onChange={(value) => setPeriod(Number(value) as Period)}
              />
            }
          />
          <div className="grid gap-g-gap sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              entity="money"
              icon={<PaymentsIcon />}
              label="CA encaissé"
              value={stats.orders > 0 ? formatPrice(stats.revenue) : "—"}
              {...versus(stats.revenue, previous?.revenue ?? 0, formatPrice)}
              title={`Commandes payées sur ${period} jours, TTC`}
            />
            <StatTile
              entity="orders"
              icon={<ChartIcon />}
              label="Commandes payées"
              value={stats.orders > 0 ? String(stats.orders) : "—"}
              {...versus(stats.orders, previous?.orders ?? 0, String)}
              title={`Commandes payées sur ${period} jours`}
            />
            <StatTile
              entity="money"
              icon={<BagIcon />}
              label="Panier moyen"
              value={stats.orders > 0 ? formatPrice(stats.avgTicket) : "—"}
              {...versus(stats.avgTicket, previous?.avgTicket ?? 0, formatPrice)}
              title="CA encaissé ÷ commandes payées"
            />
            <StatTile
              entity="money"
              icon={<GiftIcon />}
              label="Pourboires"
              value={stats.orders > 0 ? formatPrice(tips) : "—"}
              {...versus(tips, previous?.tips ?? 0, formatPrice)}
              title={`Pourboires laissés sur ${period} jours, en ligne comme au comptoir`}
            />
          </div>

          {hasAnalyticsData ? (
            <>
              <RevenueByDay points={byDay} period={period} />

              <div className="grid gap-g-gap lg:grid-cols-2">
                <Card title="Top ventes" sub={`${period} jours · quantités · CA`}>
                  {ventesTop.length > 0 ? (
                    <RankedList
                      items={rankByQuantity(ventesTop, true)}
                      entity="orders"
                      size="bar"
                      label={`Plats les plus commandés sur ${period} jours`}
                    />
                  ) : (
                    <p className="text-g-body text-muted">Aucune vente sur la période.</p>
                  )}
                </Card>
                <PeakHours buckets={hours} period={period} />
              </div>

              <Plate>
                <details>
                  <summary className="cursor-pointer px-5 py-4 text-g-label font-medium text-muted">
                    Données détaillées (tableau)
                  </summary>
                  <div className="overflow-x-auto border-t border-hairline">
                    <table className="w-full whitespace-nowrap text-g-body tabular-nums">
                      <thead>
                        <tr className="text-left text-g-meta text-muted">
                          <th scope="col" className="px-5 py-3 font-medium">Jour</th>
                          <th scope="col" className="px-5 py-3 text-right font-medium">Commandes payées</th>
                          <th scope="col" className="px-5 py-3 text-right font-medium">CA encaissé</th>
                          <th scope="col" className="px-5 py-3 text-right font-medium">Panier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byDay.map((point) => (
                          <tr key={point.full} className="border-t border-hairline">
                            <td className="px-5 py-2.5 capitalize">{point.full}</td>
                            <td className="px-5 py-2.5 text-right">{point.orders > 0 ? point.orders : "—"}</td>
                            <td className="px-5 py-2.5 text-right">
                              {point.orders > 0 ? formatPrice(point.revenue) : "—"}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              {point.orders > 0 ? formatPrice(point.revenue / point.orders) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-hairline font-semibold">
                          <td className="px-5 py-3">{period} jours</td>
                          <td className="px-5 py-3 text-right">{stats.orders}</td>
                          <td className="px-5 py-3 text-right">{formatPrice(stats.revenue)}</td>
                          <td className="px-5 py-3 text-right">{formatPrice(stats.avgTicket)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              </Plate>
            </>
          ) : (
            <EmptyState
              text={`Aucune vente sur les ${period} derniers jours.`}
              action={
                otherPeriodWithData ? (
                  <GlassButton onClick={() => setPeriod(otherPeriodWithData)}>
                    Voir {otherPeriodWithData} jours
                  </GlassButton>
                ) : (
                  <GlassButton href="/gestion/menu">Voir ma carte</GlassButton>
                )
              }
            />
          )}
        </Block>
      )}
    </div>
  );
}
