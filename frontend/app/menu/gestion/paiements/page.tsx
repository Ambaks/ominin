"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { describeError } from "@/lib/gestion/errors";
import { EditPaymentDialog } from "@/components/gestion/paiements/edit-payment-dialog";
import { CoinsIcon } from "@/components/gestion/paiements/icons";
import { PaymentRow, paymentHeading } from "@/components/gestion/paiements/payment-row";
import { StripeDashboardButton } from "@/components/gestion/paiements/stripe-dashboard-button";
import {
  ConfirmSheet,
  EmptyState,
  ErrorNotice,
  GlassButton,
  Plate,
  RankedList,
  ReserveGerant,
  SectionHeading,
  Segmented,
  StatTile,
  type DeltaTone,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS, PAYMENTS_PAGE_SIZE, SMALL_BASE } from "@/lib/gestion/constants";
import {
  isCancelledPaid,
  isPaid,
  isPickupShop,
  isServiceToday,
  paidAt,
  orderTotal,
  serviceDate,
  serviceDayKey,
  tipsByStaff,
  totalsByMode,
} from "@/lib/gestion/selectors";
import { fetchPaidOrders, useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Feature, GestionState, Order } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

const MODE_FILTERS = [
  { value: "tous", label: "Tous" },
  { value: "especes", label: "Espèces" },
  { value: "carte", label: "Carte" },
  { value: "en_ligne", label: "En ligne" },
] as const;

type ModeFilter = (typeof MODE_FILTERS)[number]["value"];

/** Le filtre suit les jambes : une addition partagée se retrouve sous Espèces
 *  comme sous Carte, sans avoir à traiter le mixte à part. */
function matchesMode(order: Order, filter: ModeFilter): boolean {
  return order.payments.some((leg) => leg.mode === filter);
}

function dedupeById(orders: Order[]): Order[] {
  const byId = new Map<string, Order>();
  for (const order of orders) byId.set(order.id, order);
  return [...byId.values()];
}

interface DayGroup {
  key: string;
  label: string;
  orders: Order[];
  /** Paiements et montant encaissé : une commande remboursée n'y compte pas. */
  count: number;
  total: number;
}

function groupByDay(orders: Order[], dayEndHour: number): DayGroup[] {
  const days: DayGroup[] = [];
  const index = new Map<string, DayGroup>();
  for (const order of orders) {
    const date = serviceDate(new Date(paidAt(order)), dayEndHour);
    const key = serviceDayKey(paidAt(order), dayEndHour);
    let day = index.get(key);
    if (!day) {
      const label = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      day = {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        orders: [],
        count: 0,
        total: 0,
      };
      index.set(key, day);
      days.push(day);
    }
    day.orders.push(order);
    if (isPaid(order)) {
      day.count += 1;
      day.total += orderTotal(order);
    }
  }
  return days;
}

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

/**
 * Le repère du chiffre du jour : le même jour de la semaine dernière, à la
 * même heure, en écart signé quand la base le permet ; sous une petite base,
 * le montant d'alors ; sans base, rien de plus que ce qu'on sait.
 */
function todayBaseline(
  today: number,
  lastWeek: { total: number; payments: number },
  weekday: string
): { delta?: { text: string; tone: DeltaTone }; baseline: string } {
  const when = `${weekday} dernier à cette heure`;
  if (lastWeek.payments === 0) return { baseline: `rien d'encaissé ${when}` };
  if (lastWeek.payments < SMALL_BASE) {
    return { baseline: `était ${formatPrice(lastWeek.total)} ${when}` };
  }
  const ratio = Math.round(((today - lastWeek.total) / lastWeek.total) * 100);
  return {
    delta: {
      text: `${ratio < 0 ? "−" : "+"}${Math.abs(ratio).toLocaleString("fr-FR")}\u202f%`,
      tone: ratio > 0 ? "better" : ratio < 0 ? "worse" : "neutral",
    },
    baseline: `vs ${when}`,
  };
}

const EMPTY_BY_FILTER: Record<Exclude<ModeFilter, "tous">, string> = {
  especes: "en espèces",
  carte: "par carte",
  en_ligne: "en ligne",
};

function Block({ i, className = "", children }: { i: number; className?: string; children: React.ReactNode }) {
  return (
    <section className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </section>
  );
}

export default function PaiementsPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
  if (!state) return null;
  const pickupShop = isPickupShop(state);
  // Fermé par le rôle, pas par l'offre : rien à activer, c'est au gérant
  // qu'il faut s'adresser. La sortie mène à l'accueil de l'équipe.
  if (state.role !== "gerant") {
    return (
      <div className="grid justify-items-start gap-4">
        <ReserveGerant ask="consulter les encaissements" />
        <GlassButton href={pickupShop ? "/gestion/retraits" : "/gestion"}>
          {pickupShop ? "Aller aux retraits" : "Retour à l'accueil"}
        </GlassButton>
      </div>
    );
  }
  if (!hasFeature("paiements")) return <FeatureLocked feature="paiements" />;
  return <PaiementsContent state={state} pickupShop={pickupShop} hasFeature={hasFeature} />;
}

function PaiementsContent({
  state,
  pickupShop,
  hasFeature,
}: {
  state: GestionState;
  pickupShop: boolean;
  hasFeature: (feature: Feature) => boolean;
}) {
  const toast = useToast();
  const [filter, setFilter] = useState<ModeFilter>("tous");
  // La liste s'affiche par pages de PAYMENTS_PAGE_SIZE : en rendre d'un coup
  // le mois que l'état contient figeait l'onglet. Au-delà de cette fenêtre,
  // les pages viennent du serveur. Curseur : undefined tant qu'aucune n'est
  // demandée, null une fois tout chargé.
  const [shown, setShown] = useState(PAYMENTS_PAGE_SIZE);
  const [history, setHistory] = useState<Order[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<unknown>(null);
  const [editing, setEditing] = useState<Order | null>(null);
  const [voiding, setVoiding] = useState<Order | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async (before: string | null) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const page = await fetchPaidOrders(before);
      setHistory((current) => [...current, ...page.orders]);
      setCursor(page.nextCursor);
    } catch (error) {
      setHistoryError(error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const listed = dedupeById([
    // Le snapshot en dernier : sa version (realtime) prime sur la page chargée.
    ...history,
    ...state.orders,
  ])
    // Filtré après fusion : une commande à emporter prête n'est réglée que
    // payée en ligne (isPaid) — réglée au retrait, elle ne l'est pas encore.
    // Payée en ligne puis refusée par la caisse, elle reste visible, barrée.
    .filter((order) => isPaid(order) || isCancelledPaid(order))
    .sort((a, b) => paidAt(b).localeCompare(paidAt(a)));

  const visible = filter === "tous" ? listed : listed.filter((order) => matchesMode(order, filter));
  // Seules les lignes s'arrêtent à `shown` : le compte et le total d'un jour
  // portent sur tout ce qui est chargé.
  const wholeDays = new Map(groupByDay(visible, state.dayEndHour).map((day) => [day.key, day]));
  const days = groupByDay(visible.slice(0, shown), state.dayEndHour).map((day) => ({
    ...day,
    whole: wholeDays.get(day.key) ?? day,
  }));
  const hasMore = shown < visible.length || cursor !== null;
  const visibleCount = visible.length;
  const showMore = useCallback(async () => {
    if (loadingHistory) return;
    // La fenêtre s'élargit avant l'appel : un filtre changé pendant le
    // chargement garde son retour à la première page.
    const next = shown + PAYMENTS_PAGE_SIZE;
    setShown(next);
    if (next > visibleCount && cursor !== null) await loadHistory(cursor ?? null);
  }, [loadingHistory, shown, visibleCount, cursor, loadHistory]);
  // Le bas de la liste charge la suite de lui-même (§ 3.14) ; le bouton
  // reste pour le clavier et les lecteurs d'écran. Sous un filtre, seul le
  // bouton va chercher plus loin sur le serveur : un mode rare ne doit pas
  // télécharger tout l'historique à lui seul.
  const autoLoads = filter === "tous" || shown < visibleCount;
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !autoLoads) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void showMore();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [showMore, hasMore, historyError, autoLoads]);

  const todayPaid = listed.filter(
    (order) => isPaid(order) && isServiceToday(paidAt(order), state.dayEndHour)
  );
  const todayTotal = todayPaid.reduce((sum, o) => sum + orderTotal(o), 0);
  const todayByMode = todayPaid.reduce(
    (sums, order) => {
      const modes = totalsByMode(order);
      return {
        especes: sums.especes + modes.especes,
        carte: sums.carte + modes.carte,
        en_ligne: sums.en_ligne + modes.en_ligne,
        caisse: sums.caisse + modes.caisse,
      };
    },
    { especes: 0, carte: 0, en_ligne: 0, caisse: 0 }
  );
  // Le même jour de service, il y a sept jours, jusqu'à la même heure : la
  // fenêtre chargée au démarrage (ANALYTICS_PERIOD_DAYS) le contient.
  const now = new Date();
  const lastWeekAt = new Date(now);
  lastWeekAt.setDate(lastWeekAt.getDate() - 7);
  const lastWeekKey = serviceDayKey(lastWeekAt.toISOString(), state.dayEndHour);
  const lastWeekUntil = lastWeekAt.toISOString();
  const lastWeekPaid = state.orders.filter(
    (order) =>
      isPaid(order) &&
      paidAt(order) <= lastWeekUntil &&
      serviceDayKey(paidAt(order), state.dayEndHour) === lastWeekKey
  );
  const lastWeek = {
    total: lastWeekPaid.reduce((sum, order) => sum + orderTotal(order), 0),
    payments: lastWeekPaid.length,
  };
  const weekday = serviceDate(now, state.dayEndHour).toLocaleDateString("fr-FR", { weekday: "long" });
  const todayRef = todayBaseline(todayTotal, lastWeek, weekday);
  const todayTips = todayPaid.reduce((sum, o) => sum + (o.tipAmount ?? 0), 0);
  const tipShares = tipsByStaff(todayPaid, state.staff);
  const tipItems = tipShares.map(({ staff, tip }) => ({
    label: staff.name,
    value: formatPrice(tip),
    amount: tip,
  }));
  const unattributedTips = todayTips - tipShares.reduce((sum, share) => sum + share.tip, 0);
  const showTips = hasFeature("pourboires") && tipShares.length > 0;
  const modeShares = [
    { label: "Espèces", amount: todayByMode.especes },
    { label: "Carte", amount: todayByMode.carte },
    { label: "En ligne", amount: todayByMode.en_ligne },
    // Réglé à la caisse sans mode connu : ni espèces ni carte.
    ...(todayByMode.caisse > 0 ? [{ label: "Caisse", amount: todayByMode.caisse }] : []),
  ].map(({ label, amount }) => ({ label, value: formatPrice(amount), amount }));

  return (
    <div className="grid gap-5">
      <Block i={0}>
        <SectionHeading
          level={1}
          title="Paiements"
          sub={
            pickupShop
              ? "Ce qui a été réglé chaque jour, en ligne ou au comptoir, quel que soit le jour du retrait"
              : "Tous les encaissements : espèces, carte et en ligne"
          }
          // Un restaurant passé sur Square garde parfois un ancien compte
          // Stripe relié : son espace n'a plus rien à lui montrer.
          right={
            (state.etablissement.paymentProvider ?? "stripe") === "stripe" ? (
              <StripeDashboardButton />
            ) : undefined
          }
        />
      </Block>

      <Block i={1} className="grid gap-g-gap lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div data-visite="paiements-jour" className="grid rounded-g-hero">
          <StatTile
            hero
            entity="money"
            icon={<CoinsIcon />}
            label="Encaissé aujourd'hui"
            value={formatPrice(todayTotal)}
            delta={todayRef.delta}
            baseline={todayRef.baseline}
            title="Encaissé aujourd'hui, pourboires exclus, comparé au même jour de la semaine dernière à la même heure"
          />
        </div>
        <Plate
          className="px-5 pb-4 pt-4.5"
          title="Ce qui est entré aujourd'hui, par moyen de règlement : espèces en caisse, carte au terminal, en ligne depuis le menu ou le site"
        >
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-g-h2">Par mode</h2>
            <small className="whitespace-nowrap text-g-meta text-muted tabular-nums">
              {todayPaid.length ? plural(todayPaid.length, "paiement") : "aucun paiement"}
            </small>
          </div>
          <RankedList
            entity="money"
            size="bar"
            label="Encaissé aujourd'hui par mode de règlement"
            items={modeShares}
          />
        </Plate>
      </Block>

      {showTips && (
        <Block i={2}>
          <Plate
            className="px-5 pb-4 pt-4.5"
            title="Chaque part suit la table encaissée. Une table sans serveur affecté ne compte pour personne."
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-g-h2">Pourboires du jour</h2>
              <small className="whitespace-nowrap text-g-meta text-muted tabular-nums">
                {formatPrice(todayTips)}
              </small>
            </div>
            <RankedList entity="money" label="Pourboires par serveur, aujourd'hui" items={tipItems} />
            {unattributedTips > 0 && (
              <p className="mt-2 text-g-meta text-muted">
                dont {formatPrice(unattributedTips)} sur des tables sans serveur affecté
              </p>
            )}
          </Plate>
        </Block>
      )}

      <Block i={showTips ? 3 : 2} className="grid gap-5">
        <div data-visite="paiements-modes" className="w-fit max-w-full rounded-full">
          <Segmented
            label="Mode de paiement"
            options={MODE_FILTERS}
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setShown(PAYMENTS_PAGE_SIZE);
            }}
          />
        </div>

        {visible.length === 0 ? (
          filter === "tous" ? (
            <EmptyState
              text="Aucun paiement pour l'instant : les commandes encaissées apparaîtront ici, quel que soit le mode de règlement."
              action={
                hasFeature("commandes") ? (
                  <GlassButton href="/gestion/commandes">Voir les commandes</GlassButton>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              text={`Aucun paiement ${EMPTY_BY_FILTER[filter]} ${hasMore ? "parmi ceux déjà chargés" : "pour l'instant"}.`}
              action={<GlassButton onClick={() => setFilter("tous")}>Tout afficher</GlassButton>}
            />
          )
        ) : (
          days.map((day) => (
            <section key={day.key} aria-label={day.label} className="grid gap-2.5">
              <SectionHeading
                title={day.label}
                right={
                  <span className="shrink-0 text-g-meta text-muted tabular-nums">
                    {day.whole.count > 0
                      ? `${plural(day.whole.count, "paiement")} · ${formatPrice(day.whole.total)}`
                      : plural(day.whole.orders.length, "remboursée")}
                  </span>
                }
              />
              <Plate>
                <ul role="list" className="m-0 list-none p-0">
                  {day.orders.map((order) => (
                    <PaymentRow
                      key={order.id}
                      order={order}
                      state={state}
                      onEdit={() => setEditing(order)}
                      onVoid={() => setVoiding(order)}
                    />
                  ))}
                </ul>
              </Plate>
            </section>
          ))
        )}

        {historyError != null && (
          <ErrorNotice error={historyError} onRetry={() => void loadHistory(cursor ?? null)} />
        )}
        {hasMore && historyError == null && (
          <div ref={sentinel} className="flex min-h-g-control items-center justify-center">
            <GlassButton onClick={() => void showMore()} aria-busy={loadingHistory || undefined}>
              {loadingHistory ? "Chargement…" : "Voir plus"}
            </GlassButton>
          </div>
        )}
      </Block>

      {editing && (
        <EditPaymentDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSave={async (correction) => {
            const order = editing;
            setEditing(null);
            try {
              const updated = await api.updateOrderPayment(order.id, correction);
              setHistory((current) => current.map((o) => (o.id === updated.id ? updated : o)));
              toast.success("Encaissement modifié.");
            } catch (error) {
              toast.error(describeError(error).message);
            }
          }}
        />
      )}
      {voiding && (
        <ConfirmSheet
          title={`Annuler l'encaissement de ${paymentHeading(voiding, state)} · ${formatPrice(orderTotal(voiding))} ?`}
          text={`Le règlement${
            voiding.paymentMode ? ` en ${PAYMENT_MODE_LABELS[voiding.paymentMode].toLowerCase()}` : ""
          } est effacé et la commande passe en annulée. Cette action est définitive.`}
          confirmLabel="Annuler l'encaissement"
          cancelLabel="Garder l'encaissement"
          destructive
          onClose={() => setVoiding(null)}
          onConfirm={async () => {
            const order = voiding;
            setVoiding(null);
            try {
              await api.voidPayment(order.id);
              setHistory((current) => current.filter((o) => o.id !== order.id));
              toast.success("Encaissement annulé.");
            } catch (error) {
              toast.error(describeError(error).message);
            }
          }}
        />
      )}
    </div>
  );
}
