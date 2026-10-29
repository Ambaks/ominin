"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { EditPaymentDialog } from "@/components/gestion/paiements/edit-payment-dialog";
import { StripeDashboardButton } from "@/components/gestion/paiements/stripe-dashboard-button";
import { HubriseRef } from "@/components/gestion/commandes/hubrise-ref";
import { TillChip } from "@/components/gestion/commandes/till-chip";
import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { StatCard } from "@/components/gestion/apercu/stat-card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS, PAYMENTS_PAGE_SIZE } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import {
  isCancelledPaid,
  isPaid,
  isPickupShop,
  isServiceToday,
  paidAt,
  orderTotal,
  placeLabel,
  serviceDate,
  serviceDayKey,
  tipsByStaff,
  totalsByMode,
} from "@/lib/gestion/selectors";
import { fetchPaidOrders, useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { GestionState, Order, PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

const MODE_FILTERS = [
  { id: "tous", label: "Tous" },
  { id: "especes", label: "Espèces" },
  { id: "carte", label: "Carte" },
  { id: "en_ligne", label: "En ligne" },
] as const;

type ModeFilter = (typeof MODE_FILTERS)[number]["id"];

/** Mode affiché : un règlement en ligne (Stripe/SumUp) prime sur la colonne. */
function displayMode(order: Order): PaymentMode | undefined {
  return order.paidOnline ? "en_ligne" : order.paymentMode;
}

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
      day = {
        key,
        label: date.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }),
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

function PaymentRow({
  order,
  state,
  onEdit,
  onVoid,
}: {
  order: Order;
  state: GestionState;
  onEdit: () => void;
  onVoid: () => void;
}) {
  const isCollect = order.type === "collect";
  const heading = isCollect
    ? order.customerName ?? "Client"
    : placeLabel(order, state.tables, state.etablissement.showTableNumber);
  const mode = displayMode(order);
  const articleCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  // Tout encaissement au comptoir se corrige et s'annule ; un règlement en
  // ligne, y compris ceux de l'ancien tunnel click & collect (mode
  // « en_ligne »), est une transaction réelle chez le prestataire : il reste
  // tel quel. Une vente de la caisse se corrige sur la caisse.
  const editable =
    order.paymentMode != null &&
    order.paymentMode !== "en_ligne" &&
    order.paymentMode !== "caisse" &&
    !order.paidOnline &&
    !order.fromTill;
  const cancelled = isCancelledPaid(order);
  // Une addition partagée n'a pas de montant unique à afficher : ses deux
  // jambes le disent, et c'est la jambe espèces qui porte la monnaie rendue.
  const split = mode === "mixte" ? totalsByMode(order) : null;
  const cashLeg = split
    ? order.payments.find((leg) => leg.mode === "especes")
    : undefined;
  const received = split ? cashLeg?.cashGiven : order.cashGiven;
  const returned = split ? cashLeg?.cashChange : order.cashChange;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="w-11 shrink-0 text-xs tabular-nums text-faint">
        {formatTime(paidAt(order))}
      </span>
      {/* Le nom d'abord : sur un téléphone, mode, total et gestes passent à
          la ligne plutôt que de le réduire à une lettre. */}
      <div className="min-w-36 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium [overflow-wrap:anywhere]">{heading}</p>
          {isCollect && (
            <span className="shrink-0 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
              Emporter
            </span>
          )}
          {order.fromTill && <TillChip />}
          {cancelled &&
            (order.refundedAt ? (
              <span
                title="Refusée par la caisse : le client a été remboursé."
                className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted"
              >
                Remboursée
              </span>
            ) : (
              <span
                title="Refusée par la caisse : le remboursement n'est pas passé, à faire chez le prestataire."
                className="shrink-0 rounded-full border border-ember-3/40 bg-ember-3/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-3"
              >
                À rembourser
              </span>
            ))}
        </div>
        <p className="text-xs text-faint">
          {articleCount} article{articleCount > 1 ? "s" : ""}
          {split && (
            <>
              {" · "}Espèces {formatPrice(split.especes)} · Carte{" "}
              {formatPrice(split.carte)}
            </>
          )}
          {received != null && (
            <>
              {" · "}Reçu {formatPrice(received)}
              {returned ? ` · Rendu ${formatPrice(returned)}` : ""}
            </>
          )}
        </p>
        <HubriseRef orders={[order]} />
      </div>
      {mode && (
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          {PAYMENT_MODE_LABELS[mode]}
        </span>
      )}
      <span
        className={`shrink-0 font-display text-base ${cancelled ? "text-faint line-through" : "text-ember-1"}`}
      >
        {formatPrice(orderTotal(order))}
      </span>
      {editable && (
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            onClick={onEdit}
            title="Modifier l'encaissement"
            aria-label="Modifier l'encaissement"
          >
            <EditIcon className="size-4" />
          </IconButton>
          <IconButton
            tone="danger"
            onClick={onVoid}
            title="Annuler l'encaissement"
            aria-label="Annuler l'encaissement"
          >
            <TrashIcon className="size-4" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

export default function PaiementsPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();
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
  const [editing, setEditing] = useState<Order | null>(null);
  const [voiding, setVoiding] = useState<Order | null>(null);

  const loadHistory = useCallback(
    async (before: string | null) => {
      setLoadingHistory(true);
      try {
        const page = await fetchPaidOrders(before);
        setHistory((current) => [...current, ...page.orders]);
        setCursor(page.nextCursor);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        );
      } finally {
        setLoadingHistory(false);
      }
    },
    [toast]
  );

  const ready =
    state != null && state.role === "gerant" && hasFeature("paiements");

  if (!state) return null;
  const pickupShop = isPickupShop(state);
  // Fermé par le rôle, pas par l'offre : rien à activer, c'est au gérant
  // qu'il faut s'adresser. La sortie mène à l'accueil de l'équipe.
  if (state.role !== "gerant") {
    return (
      <EmptyState
        title="Réservé au gérant"
        body="Les encaissements se consultent depuis le compte du gérant : adressez-vous à lui."
        action={
          <Link
            href={pickupShop ? "/gestion/retraits" : "/gestion"}
            className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
          >
            {pickupShop ? "Aller aux retraits" : "Retour à l'accueil"}
          </Link>
        }
      />
    );
  }
  if (!ready) return <FeatureLocked feature="paiements" />;

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

  const visible =
    filter === "tous"
      ? listed
      : listed.filter((order) => matchesMode(order, filter));
  // Seules les lignes s'arrêtent à `shown` : le compte et le total d'un jour
  // portent sur tout ce qui est chargé.
  const wholeDays = new Map(
    groupByDay(visible, state.dayEndHour).map((day) => [day.key, day])
  );
  const days = groupByDay(visible.slice(0, shown), state.dayEndHour).map(
    (day) => ({ ...day, whole: wholeDays.get(day.key) ?? day })
  );
  const showMore = async () => {
    const next = shown + PAYMENTS_PAGE_SIZE;
    if (next > visible.length && cursor !== null) await loadHistory(cursor ?? null);
    setShown(next);
  };

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
  const todayTips = todayPaid.reduce((sum, o) => sum + (o.tipAmount ?? 0), 0);
  const tipShares = tipsByStaff(todayPaid, state.staff);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            Paiements
          </h1>
          <p className="mt-1 text-sm text-muted">
            Tous les encaissements — espèces, carte et en ligne.
          </p>
        </div>
        {/* Un restaurant passé sur Square garde parfois un ancien compte
            Stripe relié : son espace n'a plus rien à lui montrer. */}
        {(state.etablissement.paymentProvider ?? "stripe") === "stripe" && (
          <StripeDashboardButton />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div data-visite="paiements-jour" className="grid rounded-2xl">
            <StatCard
              label="Encaissé aujourd'hui"
              value={formatPrice(todayTotal)}
              hint={`${todayPaid.length} paiement${todayPaid.length > 1 ? "s" : ""}${
                // Réglé à la caisse sans mode connu : ni espèces ni carte.
                todayByMode.caisse > 0 ? ` · dont ${formatPrice(todayByMode.caisse)} à la caisse` : ""
              }`}
            />
          </div>
          <StatCard
            label="Espèces"
            value={formatPrice(todayByMode.especes)}
            hint="En caisse"
          />
          <StatCard
            label="Carte"
            value={formatPrice(todayByMode.carte)}
            hint="Au comptoir"
          />
          <StatCard
            label="En ligne"
            value={formatPrice(todayByMode.en_ligne)}
            hint="Payées par le client"
          />
        </div>
        {pickupShop && (
          <p className="text-xs text-muted">
            Ce qui a été réglé aujourd&apos;hui, en ligne ou au comptoir, quel que soit le jour du retrait.
          </p>
        )}
      </div>

      {hasFeature("pourboires") && tipShares.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-lg font-medium">
              Pourboires du jour
            </h2>
            <span className="shrink-0 text-sm tabular-nums text-muted">
              {formatPrice(todayTips)}
            </span>
          </div>
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {tipShares.map(({ staff, tip }) => (
              <div
                key={staff.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <p className="truncate text-sm font-medium">{staff.name}</p>
                <span className="shrink-0 font-display text-base text-ember-1">
                  {formatPrice(tip)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-faint">
            Chaque part suit la table encaissée. Une table sans serveur
            affecté ne compte pour personne.
          </p>
        </section>
      )}
      <PillTabs
        visite="paiements-modes"
        tabs={MODE_FILTERS.map(({ id, label }) => ({ id, label }))}
        activeId={filter}
        onSelect={(id) => {
          setFilter(id as ModeFilter);
          setShown(PAYMENTS_PAGE_SIZE);
        }}
      />

      {visible.length === 0 ? (
        <EmptyState
          title="Aucun paiement"
          body="Les commandes encaissées apparaîtront ici, quel que soit le mode de règlement."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.key} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-lg font-medium capitalize">
                  {day.label}
                </h2>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {day.whole.count} paiement
                  {day.whole.count > 1 ? "s" : ""} ·{" "}
                  {formatPrice(day.whole.total)}
                </span>
              </div>
              <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                {day.orders.map((order) => (
                  <PaymentRow
                    key={order.id}
                    order={order}
                    state={state}
                    onEdit={() => setEditing(order)}
                    onVoid={() => setVoiding(order)}
                  />
                ))}
              </div>
            </section>
          ))}
          {(shown < visible.length || cursor !== null) && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void showMore()}
                disabled={loadingHistory}
                className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
              >
                {loadingHistory ? "Chargement…" : "Voir plus"}
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditPaymentDialog
          order={editing}
          onClose={() => setEditing(null)}
          onSave={async (correction) => {
            const order = editing;
            setEditing(null);
            try {
              const updated = await api.updateOrderPayment(order.id, correction);
              setHistory((current) =>
                current.map((o) => (o.id === updated.id ? updated : o))
              );
              toast.success("Encaissement modifié.");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
      {voiding && (
        <ConfirmDialog
          title="Annuler l'encaissement ?"
          message={`Le règlement ${
            voiding.paymentMode ? `en ${PAYMENT_MODE_LABELS[voiding.paymentMode].toLowerCase()} ` : ""
          }sera effacé et la commande passera en annulée. Cette action est définitive.`}
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
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
    </div>
  );
}
