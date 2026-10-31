"use client";

import { useState } from "react";
import { ConfirmSheet, GlassButton } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { lineTotal } from "@/lib/gestion/selectors";
import { useGestion } from "@/lib/gestion/store";
import type {
  CashDetails,
  EncaissementMode,
  Order,
  OrderItem,
  PaymentLeg,
} from "@/lib/gestion/types";
import { counterWords, formatPrice } from "@/lib/menu/format";
import { PaymentsIcon, XIcon } from "../icons";
import { HubriseRef } from "./hubrise-ref";
import { CheckMark, LineLabel, LineOptions } from "./order-line";
import { PaymentDialog } from "./payment-dialog";
import { PaymentPinDialog } from "./payment-pin-dialog";
import { ServiceCard } from "./service-card";
import { describeError } from "@/lib/gestion/errors";

/*
 * L'addition d'une table, article par article : ce qui reste à encaisser se
 * coche et se règle en espèces, en carte, ou en partageant la somme entre les
 * deux ; ce qui l'est déjà reste affiché avec son mode. L'état vit en base
 * (order_items.paid_mode pour les lignes, order_payments pour les montants) :
 * il survit à l'écran et se voit de tout appareil.
 *
 * Une ligne de deux nems se coche deux fois, pas une : chacun règle sa part.
 * Chaque unité est donc une case, et la RPC scinde la ligne quand une partie
 * seulement est réglée.
 */

/** Une unité à encaisser : la ligne d'origine et son rang dans la quantité. */
interface Unit {
  key: string;
  line: OrderItem;
}

/** Quantité réglée par ligne, telle que l'attend la RPC. */
export type PaySelection = { itemId: string; quantity: number }[];

function unitsOf(lines: OrderItem[]): Unit[] {
  return lines.flatMap((line) =>
    Array.from({ length: line.quantity }, (_, index) => ({
      key: `${line.id}#${index}`,
      line,
    }))
  );
}

function sumLines(lines: OrderItem[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

function sumUnits(units: Unit[]): number {
  return units.reduce((sum, unit) => sum + unit.line.unitPrice, 0);
}

/** Sélection d'unités → quantités par ligne. */
function toSelection(units: Unit[]): PaySelection {
  const counts = new Map<string, number>();
  for (const unit of units) {
    counts.set(unit.line.id, (counts.get(unit.line.id) ?? 0) + 1);
  }
  return [...counts].map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function EncaisserPanel({
  orders,
  onPay,
  onCancel,
}: {
  /** Commandes en attente d'encaissement d'une même table. */
  orders: Order[];
  /**
   * Le règlement ; la commande d'exemple le joue sur place, sans base ni
   * code d'encaissement. Absent : la RPC, derrière le code si le restaurant
   * en a un.
   */
  onPay?: (selection: PaySelection, mode: EncaissementMode, cashDetails?: CashDetails, tip?: number) => Promise<void>;
  /** L'annulation d'une unité ; même repli que `onPay`. */
  onCancel?: (itemId: string) => Promise<void>;
}) {
  const toast = useToast();
  const state = useGestion();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [authorizing, setAuthorizing] = useState<{
    units: Unit[];
    total: number;
  } | null>(null);
  const [paying, setPaying] = useState<{
    units: Unit[];
    total: number;
    paymentCode: string | null;
  } | null>(null);
  const [cancelling, setCancelling] = useState<Unit | null>(null);

  const lines = [...orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .flatMap((order) => order.items);
  const unpaid = unitsOf(lines.filter((line) => !line.paidMode));
  const paid = lines.filter((line) => line.paidMode);
  // Un autre appareil peut encaisser entre-temps : la sélection ne retient
  // que les unités encore ouvertes.
  const selection = unpaid.filter((unit) => selected.has(unit.key));
  const partial = selection.length > 0 && selection.length < unpaid.length;
  const remaining = sumUnits(unpaid);
  const paidByMode = new Map<PaymentLeg, number>();
  for (const order of orders) {
    for (const leg of order.payments) {
      paidByMode.set(leg.mode, (paidByMode.get(leg.mode) ?? 0) + leg.amount);
    }
  }

  const toggle = (key: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const requestPayment = (units: Unit[], total: number) => {
    if (!onPay && state?.etablissement.paymentPinSet) setAuthorizing({ units, total });
    else setPaying({ units, total, paymentCode: null });
  };
  const payAll = () => requestPayment(unpaid, remaining);
  const paySelection = () =>
    requestPayment(selection, sumUnits(selection));

  const settle = async (
    mode: EncaissementMode,
    cashDetails?: CashDetails,
    tip?: number
  ) => {
    if (!paying) return;
    const { units, paymentCode } = paying;
    setPaying(null);
    try {
      const picked = toSelection(units);
      if (onPay) await onPay(picked, mode, cashDetails, tip);
      else await api.payOrderItems(picked, mode, paymentCode, cashDetails, tip);
      setSelected(new Set());
      toast.success(
        units.length === unpaid.length
          ? "Addition réglée, la commande part en cuisine."
          : "Sélection encaissée."
      );
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const restLabel = paid.length > 0 ? "Encaisser le reste" : "Tout encaisser";

  return (
    <div className="g-money flex flex-col gap-3">
      {unpaid.length > 0 && (
        <div>
          <div className="flex min-h-g-control items-center justify-between gap-3">
            <p className="text-g-label font-semibold text-g-entity">À encaisser</p>
            {unpaid.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelected(
                    selection.length === unpaid.length
                      ? new Set()
                      : new Set(unpaid.map((unit) => unit.key))
                  )
                }
                className="-mr-3 min-h-g-control rounded-full px-3 text-g-label font-semibold text-ember-1 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
              >
                {selection.length === unpaid.length
                  ? "Désélectionner"
                  : "Tout sélectionner"}
              </button>
            )}
          </div>
          <ul className="mt-1 flex flex-col">
            {unpaid.map((unit) => {
              const isSelected = selected.has(unit.key);
              return (
                <li
                  key={unit.key}
                  className={`-mx-3 flex items-center rounded-g-card ${
                    isSelected ? "bg-[color-mix(in_srgb,var(--ember-2)_var(--g-chip-tint),transparent)]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(unit.key)}
                    aria-pressed={isSelected}
                    className="flex min-h-g-control min-w-0 flex-1 items-start gap-3 rounded-g-card px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-ember-2 bg-ember-2 text-background"
                          : "border-faint"
                      }`}
                    >
                      {isSelected && <CheckMark />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <LineLabel line={unit.line} quantity={1} />
                        <span className="shrink-0 text-g-body tabular-nums text-muted">
                          {formatPrice(unit.line.unitPrice)}
                        </span>
                      </span>
                      <LineOptions line={unit.line} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelling(unit)}
                    aria-label={`Annuler ${unit.line.name}`}
                    className="g-press flex size-g-control shrink-0 items-center justify-center rounded-full text-muted *:size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                  >
                    <XIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {paid.length > 0 && (
        <div>
          <p className="text-g-label font-semibold text-muted">Déjà encaissé</p>
          <ul className="mt-1 flex flex-col">
            {paid.map((line) => (
              <li key={line.id} className="flex items-start gap-3 py-2 text-muted">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                  <CheckMark />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <LineLabel line={line} settled />
                    <span className="flex shrink-0 items-baseline gap-2 text-g-meta">
                      <span>{PAYMENT_MODE_LABELS[line.paidMode!]}</span>
                      <span className="text-g-body tabular-nums">{formatPrice(lineTotal(line))}</span>
                    </span>
                  </div>
                  <LineOptions line={line} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-hairline pt-3">
        {paid.length > 0 && (
          <p className="text-g-meta text-muted">
            Encaissé {formatPrice(sumLines(paid))}
            {[...paidByMode].map(
              ([mode, total]) =>
                ` · ${PAYMENT_MODE_LABELS[mode]} ${formatPrice(total)}`
            )}
          </p>
        )}
        {unpaid.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-baseline gap-2">
              <span className="text-g-label text-muted">
                {partial ? "Sélection" : "Reste à encaisser"}
              </span>
              <span className="text-g-name tabular-nums text-g-entity">
                {formatPrice(partial ? sumUnits(selection) : remaining)}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {partial && (
                <GlassButton onClick={payAll}>
                  {restLabel} · {formatPrice(remaining)}
                </GlassButton>
              )}
              <GlassButton variant="primary" onClick={partial ? paySelection : payAll}>
                {partial ? "Encaisser la sélection" : restLabel}
              </GlassButton>
            </div>
          </div>
        )}
      </div>

      {cancelling && (
        <ConfirmSheet
          title={`Annuler « ${cancelling.line.name} » ?`}
          text="L’article sera retiré de l’addition, définitivement."
          confirmLabel="Annuler l’article"
          cancelLabel="Garder l’article"
          destructive
          onClose={() => setCancelling(null)}
          onConfirm={() => {
            const unit = cancelling;
            setCancelling(null);
            void (onCancel ?? api.cancelOrderItem)(unit.line.id)
              .then(() => {
                setSelected(new Set());
                toast.success("Article annulé.");
              })
              .catch((error: unknown) => toast.error(describeError(error).message));
          }}
        />
      )}

      {authorizing && (
        <PaymentPinDialog
          onClose={() => setAuthorizing(null)}
          onAuthorized={(paymentCode) => {
            setPaying({ ...authorizing, paymentCode });
            setAuthorizing(null);
          }}
        />
      )}

      {paying && (
        <PaymentDialog
          total={paying.total}
          onClose={() => setPaying(null)}
          onSelect={(mode, cashDetails, tip) =>
            void settle(mode, cashDetails, tip)
          }
        />
      )}
    </div>
  );
}

/** Une addition dans l'onglet À encaisser : la table, son heure, son reste dû. */
export function EncaisserCard({
  orders,
  title,
  onPay,
  onCancel,
  i,
  tag,
}: {
  orders: Order[];
  title: string;
  /** Un mot devant le surtitre (« Exemple »). */
  tag?: string;
  onPay?: EncaisserPanelProps["onPay"];
  onCancel?: EncaisserPanelProps["onCancel"];
  /** Rang d'entrée dans la page. */
  i?: number;
}) {
  const etablissement = useGestion()?.etablissement;
  // Retrait au bar : la commande part en préparation, comme le client le lit.
  const barPickup = etablissement?.serviceMode === "fast_food" && etablissement.barPickup;
  const oldest = orders.reduce(
    (min, order) => (order.createdAt < min ? order.createdAt : min),
    orders[0].createdAt
  );
  const remaining = sumLines(
    orders.flatMap((order) => order.items.filter((line) => !line.paidMode))
  );
  return (
    <ServiceCard
      entity="money"
      icon={<PaymentsIcon />}
      eyebrow={`${tag ? `${tag} · ` : ""}Addition · ${formatTime(oldest)}`}
      title={title}
      i={i}
      right={
        <span className="text-g-name tabular-nums text-g-entity">{formatPrice(remaining)}</span>
      }
      sub={
        <>
          Part {counterWords(barPickup).preparation} une fois encaissée.
          <HubriseRef orders={orders} />
        </>
      }
    >
      <div className="mt-2">
        <EncaisserPanel orders={orders} onPay={onPay} onCancel={onCancel} />
      </div>
    </ServiceCard>
  );
}

type EncaisserPanelProps = Parameters<typeof EncaisserPanel>[0];
