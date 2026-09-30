"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { formatTime } from "@/lib/gestion/format";
import { can } from "@/lib/gestion/permissions";
import { earlierNumberingDay } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { LineLabel, LineOptions } from "./order-line";

/*
 * Une commande fast food dans l'onglet À servir : son numéro, en grand — c'est
 * ce que le comptoir appelle —, ce qu'elle contient, et le geste suivant.
 * Payée, elle est en préparation : « Prête » prévient le client sur son
 * téléphone (s'il a commandé depuis le menu). Prête, elle attend son client :
 * « Remettre » la clôt. Un « Prête » touché trop tôt se reprend.
 */
export function CounterCard({
  order,
  resetHour,
  readOnly = false,
}: {
  order: Order;
  /** Heure où les numéros repartent de 1 ; inconnue, pas de jour affiché. */
  resetHour: number | null;
  /** Vue cuisine : la file du comptoir, sans ses gestes. */
  readOnly?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const ready = order.status === "prete";
  const earlierDay = earlierNumberingDay(order, resetHour);

  const move = async (target: OrderStatus, message: string) => {
    setBusy(true);
    try {
      await api.updateOrderStatus(order.id, target);
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  const next: { target: "prete" | "servie"; label: string; done: string } = ready
    ? { target: "servie", label: "Remettre", done: `N° ${order.orderNumber} remise au client.` }
    : { target: "prete", label: "Prête", done: `N° ${order.orderNumber} prête.` };
  const actionable = !readOnly && can(role, `orders.setStatus:${next.target}`);

  return (
    <article
      data-ready={ready || undefined}
      className="counter-card flex flex-col rounded-2xl border border-hairline bg-surface p-5 data-ready:border-ember-2/50"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
            Commande
          </span>
          <span className="counter-number font-display text-5xl font-medium leading-none tabular-nums">
            {order.orderNumber}
          </span>
        </p>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              ready
                ? "ember-text border-ember-2/35 bg-background/60"
                : "border-ember-1/40 bg-ember-1/10 text-ember-1"
            }`}
          >
            {ready ? "Prête" : "En préparation"}
          </span>
          <span className="text-xs tabular-nums text-faint">
            {earlierDay && (
              <span className="font-semibold text-ember-3">{earlierDay} · </span>
            )}
            {formatTime(order.createdAt)}
          </span>
        </div>
      </div>

      <ul className="mt-4 flex flex-1 flex-col gap-2 border-t border-hairline pt-3">
        {order.items.map((line) => (
          <li key={line.id} className="flex flex-col gap-0.5">
            <LineLabel line={line} />
            <LineOptions line={line} />
          </li>
        ))}
      </ul>

      {actionable && (
        <div className="mt-4 flex items-center gap-2">
          {ready && can(role, "orders.setStatus:payee") && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void move("payee", `N° ${order.orderNumber} repasse en préparation.`)
              }
              className="min-h-11 rounded-full px-3 text-xs font-semibold text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              Pas encore
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void move(next.target, next.done)}
            className={`min-h-11 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              ready
                ? "border border-ember-2/50 text-foreground transition-colors hover:bg-ember-2/10"
                : "ember-gradient text-background"
            }`}
          >
            {next.label}
          </button>
        </div>
      )}
    </article>
  );
}
