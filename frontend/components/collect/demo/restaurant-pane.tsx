"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/gestion/commandes/status-badge";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import { useCollectDemo } from "@/lib/collect/demo/provider";
import { COLLECT_ETA_CHOICES_MIN } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

/*
 * Volet dashboard de la démo Collect : la grammaire visuelle du vrai écran
 * Commandes (badge Emporter, chip « Payée en ligne », pilules d'action,
 * puces de délai), sans le store gestion — tout vient du contexte démo.
 */

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-3">
      <div className="rounded-2xl border border-dashed border-hairline p-5 text-center">
        <p className="text-sm text-muted">En attente de commandes…</p>
        <p className="mt-1 text-xs text-faint">
          Passez commande sur le téléphone, elle arrive ici.
        </p>
      </div>
      <div className="shimmer h-24 rounded-2xl border border-hairline" aria-hidden />
    </div>
  );
}

function OrderCardDemo() {
  const demo = useCollectDemo();
  const [choosingEta, setChoosingEta] = useState(false);
  const order = demo.order!;
  const status = demo.step as OrderStatus;
  const pulse = demo.hintActive;

  return (
    <article className="order-pop rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="shrink-0 rounded-full border border-ember-2/30 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
            Emporter
          </span>
          <h3 className="truncate font-display text-lg font-medium">
            {order.customerName}
          </h3>
          <span className="text-xs tabular-nums text-faint">
            {formatTime(order.createdAt)}
          </span>
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="mt-1 text-xs text-muted">
        {order.readyAt && status === "en_preparation"
          ? `Prête vers : ${formatTime(order.readyAt)}`
          : `Retrait : ${order.pickupLabel.toLowerCase()}`}
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {order.lines.map((line) => (
          <li
            key={line.item.id}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span>
              <span className="tabular-nums text-muted">{line.quantity}×</span>{" "}
              {line.item.name}
            </span>
            <span className="tabular-nums text-muted">
              {formatPrice(line.quantity * line.item.price)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-lg text-ember-1">
            {formatPrice(order.total)}
          </span>
          <span className="rounded-full border border-ember-2/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
            Payée en ligne
          </span>
        </div>

        {status === "en_attente" &&
          (choosingEta ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">Prête dans&nbsp;:</span>
              {COLLECT_ETA_CHOICES_MIN.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => demo.accept(minutes)}
                  className={`rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold tabular-nums transition-colors hover:border-ember-2/40 hover:text-ember-1 ${
                    pulse && minutes === COLLECT_ETA_CHOICES_MIN[1]
                      ? "soft-pulse"
                      : ""
                  }`}
                >
                  {minutes} min
                </button>
              ))}
              <button
                type="button"
                onClick={() => setChoosingEta(false)}
                aria-label="Fermer le choix de délai"
                className="px-1 text-sm text-faint transition-colors hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setChoosingEta(true)}
                className={`ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
                  pulse ? "soft-pulse" : ""
                }`}
              >
                Commencer la préparation
              </button>
              <button
                type="button"
                onClick={demo.refuse}
                className="rounded-full border border-ember-3/40 px-4 py-2 text-xs font-semibold text-ember-3 transition-colors hover:bg-ember-3/10"
              >
                Refuser
              </button>
            </div>
          ))}

        {status === "en_preparation" && (
          <button
            type="button"
            onClick={demo.markReady}
            className={`ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
              pulse ? "soft-pulse" : ""
            }`}
          >
            Marquer prête
          </button>
        )}

        {status === "prete" && (
          <button
            type="button"
            onClick={demo.markPickedUp}
            className={`ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background ${
              pulse ? "soft-pulse" : ""
            }`}
          >
            Marquer retirée
          </button>
        )}

        {status === "retiree" && (
          <span className="text-xs font-semibold text-muted">
            Remise au comptoir — commande clôturée.
          </span>
        )}
        {status === "annulee" && (
          <span className="text-xs font-semibold text-ember-3">
            Commande refusée — le client est prévenu.
          </span>
        )}
      </div>
    </article>
  );
}

export function RestaurantPane() {
  const demo = useCollectDemo();
  const hasOrder =
    demo.orderVisible &&
    demo.order &&
    demo.step !== "menu" &&
    demo.step !== "checkout" &&
    demo.step !== "paiement";

  return (
    <div className="flex h-140 w-full flex-col gap-4 bg-background p-5 text-left">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <p className="font-display text-lg font-medium">Commandes</p>
          <p className="text-xs text-muted">{COLLECT_DEMO.restaurant.name}</p>
        </div>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
          En direct
        </span>
      </div>
      {hasOrder ? <OrderCardDemo /> : <EmptyState />}
    </div>
  );
}
