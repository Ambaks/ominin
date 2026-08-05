"use client";

import { useEffect, useState } from "react";
import {
  COLLECT_ORDER_POLL_MS,
  collectHref,
  mapsDirectionsHref,
  type CollectOrderView,
} from "@/lib/collect/shared";
import { formatTime } from "@/lib/gestion/format";
import type { OrderStatus } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu-data";

/*
 * Suivi client d'une commande à emporter, par session Stripe : interroge
 * /api/collect/order jusqu'à l'apparition de la commande (créée par le
 * webhook) puis suit son statut jusqu'à un état terminal.
 */

const STATUS_COPY: Partial<
  Record<OrderStatus, { title: string; hint: string }>
> = {
  en_attente: {
    title: "Commande reçue !",
    hint: "Le restaurant va la prendre en charge.",
  },
  en_preparation: {
    title: "En préparation",
    hint: "Votre commande est en cuisine.",
  },
  prete: {
    title: "C'est prêt !",
    hint: "Votre commande vous attend au comptoir.",
  },
  retiree: {
    title: "Commande retirée",
    hint: "Merci et à bientôt !",
  },
  annulee: {
    title: "Commande annulée",
    hint: "Le restaurant n'a pas pu honorer votre commande. Pour toute question — remboursement compris — contactez-le directement.",
  },
};

const isTerminal = (status: OrderStatus) =>
  status === "retiree" || status === "annulee";

export function OrderConfirmation({
  sessionId,
  slug,
  restaurantName,
  address,
  phone,
}: {
  sessionId: string;
  slug: string;
  restaurantName: string;
  address: string;
  phone?: string | null;
}) {
  const [order, setOrder] = useState<CollectOrderView | null>(null);
  const [failed, setFailed] = useState(false);
  // Horloge du compte à rebours, avancée à chaque relecture (le polling
  // re-rend déjà le composant : précision à la minute sans timer dédié).
  const [now, setNow] = useState(0);

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/collect/order?session=${encodeURIComponent(sessionId)}`
        );
        if (!response.ok) throw new Error();
        const body = (await response.json()) as {
          found: boolean;
          order?: CollectOrderView;
        };
        if (stopped) return;
        if (body.found && body.order) {
          setOrder(body.order);
          setNow(Date.now());
          if (isTerminal(body.order.status)) stopped = true;
        }
      } catch {
        if (!stopped) setFailed(true);
      }
      if (!stopped) timer = setTimeout(poll, COLLECT_ORDER_POLL_MS);
    };

    let timer = setTimeout(poll, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  if (failed && !order) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6 text-center">
        <p className="text-sm text-muted">
          Impossible de vérifier votre commande pour le moment. Rechargez la
          page dans quelques instants — votre paiement est bien enregistré par
          Stripe.
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-8 text-center">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Paiement confirmé
        </p>
        <h2 className="font-display text-xl font-medium">
          Enregistrement de votre commande…
        </h2>
        <p className="text-sm text-muted">
          Quelques secondes, la page se met à jour toute seule.
        </p>
      </div>
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.en_attente!;
  const cancelled = order.status === "annulee";
  const showEta = order.status === "en_preparation" && order.estimatedReadyAt;
  const minutesLeft = order.estimatedReadyAt
    ? Math.round((Date.parse(order.estimatedReadyAt) - now) / 60_000)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`rounded-2xl border bg-surface p-6 text-center ${
          cancelled ? "border-ember-3/40" : "border-hairline"
        }`}
      >
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          {order.customerName} · {formatTime(order.createdAt)}
        </p>
        {/* aria-live sur le seul bloc de statut : les changements d'état sont
            annoncés, pas le compte à rebours qui bouge à chaque relecture. */}
        <div aria-live="polite">
          <h2 className="mt-2 font-display text-2xl font-medium">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted">{copy.hint}</p>
        </div>
        {showEta ? (
          <>
            <p className="mt-3 font-display text-lg font-semibold">
              Prête vers {formatTime(order.estimatedReadyAt!)}
            </p>
            <p className="mt-0.5 text-xs tabular-nums text-muted">
              {minutesLeft > 0
                ? `dans ~${minutesLeft} min`
                : "Plus que quelques instants"}
            </p>
          </>
        ) : (
          !cancelled && (
            <p className="mt-3 text-sm font-semibold">
              Retrait :{" "}
              {order.pickupAt ? formatTime(order.pickupAt) : "dès que possible"}
            </p>
          )
        )}
        {cancelled && phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="mt-4 inline-flex items-center rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
          >
            Appeler le restaurant
          </a>
        )}
      </div>

      {!cancelled && order.status !== "retiree" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{restaurantName}</p>
            <p className="mt-0.5 text-xs text-muted">{address}</p>
          </div>
          <a
            href={mapsDirectionsHref(`${restaurantName}, ${address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 11 21 3l-8 18-2.5-7.5L3 11z" />
            </svg>
            Itinéraire
          </a>
        </div>
      )}

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <ul className="flex flex-col gap-1.5">
          {order.items.map((line, index) => (
            <li key={index} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span>
                  <span className="tabular-nums text-muted">
                    {line.quantity}×
                  </span>{" "}
                  {line.name}
                </span>
                <span className="tabular-nums text-muted">
                  {formatPrice(
                    line.quantity *
                      (line.unitPrice +
                        line.options.reduce(
                          (sum, option) => sum + option.supplement,
                          0
                        ))
                  )}
                </span>
              </div>
              {line.options.map((option, optionIndex) => (
                <p key={optionIndex} className="pl-5 text-xs text-faint">
                  {option.groupName} : {option.choiceName}
                </p>
              ))}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-sm font-semibold">Total payé</span>
          <span className="font-display text-lg text-ember-1">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      <a
        href={collectHref(slug)}
        className="text-center text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80"
      >
        Retour au menu
      </a>
    </div>
  );
}
