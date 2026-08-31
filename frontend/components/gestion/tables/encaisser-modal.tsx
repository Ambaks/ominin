"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { PAYMENT_MODE_LABELS } from "@/lib/gestion/constants";
import { lineTotal } from "@/lib/gestion/selectors";
import type { Order, PaymentMode } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

type Step = "items" | "mode" | "cash";

export function EncaisserModal({
  orders: liveOrders,
  label,
  onClose,
}: {
  orders: Order[];
  label: string;
  onClose: () => void;
}) {
  // Instantané au montage : la répartition en cours ne doit pas bouger si le
  // temps réel met à jour les commandes pendant l'encaissement.
  const [orders] = useState(liveOrders);
  const toast = useToast();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>("items");
  const [payingAll, setPayingAll] = useState(false);
  const [givenRaw, setGivenRaw] = useState("");
  const [tipRaw, setTipRaw] = useState("");

  const allItems = orders.flatMap((order) =>
    order.items.map((item) => ({ ...item, orderId: order.id }))
  );
  const unsettledItems = allItems.filter(
    (item) => !settledIds.has(item.id)
  );
  const selectedItems = allItems.filter((item) => selectedIds.has(item.id));
  const selectionTotal = selectedItems.reduce(
    (sum, item) => sum + lineTotal(item),
    0
  );
  const remainingTotal = unsettledItems.reduce(
    (sum, item) => sum + lineTotal(item),
    0
  );
  const payingTotal = payingAll ? remainingTotal : selectionTotal;

  const toggle = (itemId: string) => {
    if (settledIds.has(itemId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const selectAllUnsettled = () => {
    setSelectedIds(new Set(unsettledItems.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const startPay = (all: boolean) => {
    setPayingAll(all);
    setStep("mode");
  };

  const settle = async (
    mode: PaymentMode,
    cashDetails?: { cashGiven: number; cashChange: number }
  ) => {
    const covered = new Set(settledIds);
    for (const item of payingAll ? unsettledItems : selectedItems)
      covered.add(item.id);

    // Une commande n'est marquée payée en base que lorsque tous ses articles
    // sont réglés ; entre-temps la répartition ne vit que dans ce modal. Le
    // pourboire de l'addition est porté par la première commande encaissée.
    let tipToApply = tip || undefined;
    const next = new Set(settledIds);
    let failed = false;
    for (const order of orders) {
      const ids = order.items.map((item) => item.id);
      if (ids.every((id) => settledIds.has(id))) continue;
      if (!ids.every((id) => covered.has(id))) {
        for (const id of ids) if (covered.has(id)) next.add(id);
        continue;
      }
      try {
        await api.markOrderPaid(order.id, mode, cashDetails, tipToApply);
        tipToApply = undefined;
        for (const id of ids) next.add(id);
      } catch (error) {
        failed = true;
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de l'encaissement."
        );
      }
    }

    setSettledIds(next);
    setSelectedIds(new Set());
    setStep("items");
    setGivenRaw("");
    setTipRaw("");
    setPayingAll(false);

    if (!failed && allItems.every((item) => next.has(item.id))) {
      toast.success("Table encaissée.");
      onClose();
    }
  };

  const parsedTip = parseFloat(tipRaw.replace(",", "."));
  const tip =
    !Number.isNaN(parsedTip) && parsedTip > 0
      ? Math.round(parsedTip * 100) / 100
      : 0;
  // Le pourboire s'ajoute à l'addition : le client le règle avec elle.
  const due = Math.round((payingTotal + tip) * 100) / 100;

  const given = parseFloat(givenRaw.replace(",", "."));
  const validGiven = !Number.isNaN(given) && given >= due;
  const change = validGiven ? Math.round((given - due) * 100) / 100 : 0;

  if (step === "cash") {
    return (
      <Modal
        title={`Espèces · ${label}`}
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setStep("mode");
                setGivenRaw("");
              }}
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={!givenRaw || !validGiven}
              onClick={() =>
                settle("especes", { cashGiven: given, cashChange: change })
              }
              className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
            >
              Encaisser
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">
              Total à régler{tip > 0 && " (pourboire inclus)"}
            </span>
            <span className="font-display text-2xl text-ember-1">
              {formatPrice(due)}
            </span>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Montant reçu</span>
            <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3 focus-within:border-ember-2/60">
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={givenRaw}
                onChange={(e) => setGivenRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && givenRaw && validGiven)
                    settle("especes", {
                      cashGiven: given,
                      cashChange: change,
                    });
                }}
                placeholder={due.toFixed(2).replace(".", ",")}
                className="flex-1 bg-transparent text-lg tabular-nums outline-none placeholder:text-faint"
              />
              <span className="text-sm text-muted">€</span>
            </div>
            {givenRaw && !Number.isNaN(given) && given < due && (
              <span className="text-xs text-ember-3">
                Le montant doit être supérieur ou égal au total.
              </span>
            )}
          </label>

          {validGiven && (
            <div className="flex items-baseline justify-between rounded-xl border border-ember-2/25 bg-ember-2/5 px-4 py-3">
              <span className="text-sm font-medium">Monnaie à rendre</span>
              <span className="font-display text-xl tabular-nums text-ember-1">
                {formatPrice(change)}
              </span>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  if (step === "mode") {
    return (
      <Modal
        title={`Paiement · ${label}`}
        onClose={onClose}
        footer={
          <button
            type="button"
            onClick={() => {
              setStep("items");
              setPayingAll(false);
            }}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
          >
            Retour
          </button>
        }
      >
        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-sm text-muted">
            À encaisser{tip > 0 && " (pourboire inclus)"}
          </span>
          <span className="font-display text-2xl text-ember-1">
            {formatPrice(due)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["especes", "carte"] as PaymentMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() =>
                mode === "especes" ? setStep("cash") : settle(mode)
              }
              className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-surface px-4 py-5 text-sm font-semibold transition-colors hover:border-ember-2/40"
            >
              <span className="text-ember-1">
                {mode === "especes" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.5" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                )}
              </span>
              {PAYMENT_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
          <span className="text-sm text-muted">Pourboire (optionnel)</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={tipRaw}
              onChange={(e) => setTipRaw(e.target.value)}
              placeholder="0"
              aria-label="Pourboire en euros"
              className="w-20 bg-transparent text-right text-sm tabular-nums outline-none placeholder:text-faint"
            />
            <span className="text-sm text-muted">€</span>
          </div>
        </label>
      </Modal>
    );
  }

  return (
    <Modal
      title={`Encaisser · ${label}`}
      onClose={onClose}
      footer={
        unsettledItems.length > 0 ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => startPay(false)}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Encaisser la sélection · {formatPrice(selectionTotal)}
              </button>
            )}
            <button
              type="button"
              onClick={() => startPay(true)}
              className={
                selectedIds.size > 0
                  ? "rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
                  : "ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              }
            >
              {settledIds.size > 0 ? "Encaisser le reste" : "Tout encaisser"}{" "}
              · {formatPrice(remainingTotal)}
            </button>
          </div>
        ) : undefined
      }
    >
      {unsettledItems.length > 1 && (
        <div className="mb-3 flex gap-3">
          <button
            type="button"
            onClick={selectAllUnsettled}
            className="text-xs font-semibold text-ember-2 transition-opacity hover:opacity-80"
          >
            Tout sélectionner
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-muted transition-opacity hover:opacity-80"
            >
              Désélectionner
            </button>
          )}
        </div>
      )}

      <ul className="flex flex-col">
        {allItems.map((item) => {
          const settled = settledIds.has(item.id);
          const selected = selectedIds.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={settled}
                onClick={() => toggle(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  settled
                    ? "opacity-40"
                    : selected
                      ? "bg-ember-2/10"
                      : "hover:bg-surface"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    settled
                      ? "border-hairline bg-surface text-muted"
                      : selected
                        ? "border-ember-2 bg-ember-2 text-background"
                        : "border-hairline"
                  }`}
                >
                  {(settled || selected) && (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-sm ${settled ? "line-through" : ""}`}
                    >
                      <span className="tabular-nums text-muted">
                        {item.quantity}×
                      </span>{" "}
                      {item.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-sm text-muted">
                      {formatPrice(lineTotal(item))}
                    </span>
                  </div>
                  {item.options?.map((opt, i) => (
                    <p key={i} className="pl-1 text-xs text-faint">
                      {opt.groupName} : {opt.choiceName}
                      {opt.supplement > 0 &&
                        ` (+${formatPrice(opt.supplement)})`}
                    </p>
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {(settledIds.size > 0 || selectedIds.size > 0) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-3">
          {settledIds.size > 0 && unsettledItems.length > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Reste à encaisser</span>
              <span className="font-display text-lg text-ember-1">
                {formatPrice(remainingTotal)}
              </span>
            </div>
          )}
          {selectedIds.size > 0 && (
            <div className="flex items-baseline justify-between rounded-xl border border-ember-2/25 bg-ember-2/5 px-4 py-3">
              <span className="text-sm font-medium">Sélection</span>
              <span className="font-display text-xl tabular-nums text-ember-1">
                {formatPrice(selectionTotal)}
              </span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
