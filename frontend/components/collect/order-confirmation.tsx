"use client";

import { useEffect, useState } from "react";
import { formatClock, formatDayLong, parisDate } from "@/lib/collect/hours";
import {
  COLLECT_ORDER_POLL_MS,
  collectHref,
  mapsDirectionsHref,
  type CollectOrderView,
} from "@/lib/collect/shared";
import type { OrderStatus } from "@/lib/gestion/types";
import { savedCartKey } from "@/lib/menu/cart";
import { formatPrice } from "@/lib/menu-data";

/*
 * Suivi client d'une commande à emporter : interroge /api/collect/order
 * jusqu'à la confirmation du paiement, puis suit son statut jusqu'à un état
 * terminal. Disparue, la commande n'a jamais été payée (paiement expiré).
 */

const STATUS_COPY: Partial<
  Record<OrderStatus, { title: string; hint: string }>
> = {
  en_attente: {
    title: "Commande reçue !",
    hint: "L'équipe va la prendre en charge.",
  },
  en_preparation: {
    title: "En préparation",
    hint: "L'équipe prépare votre commande.",
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
    hint: "Pour toute question, contactez directement l'établissement.",
  },
};

const isTerminal = (status: OrderStatus) =>
  status === "retiree" || status === "annulee";

/** Les étapes que le client voit passer, de la commande au retrait. */
const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "en_attente", label: "Reçue" },
  { status: "en_preparation", label: "Préparation" },
  { status: "prete", label: "Prête" },
  { status: "retiree", label: "Retirée" },
];

/**
 * « aujourd'hui à 18:30 », « le samedi 17 octobre à 10:30 » : une commande
 * prise plusieurs jours à l'avance dit toujours son jour.
 */
function formatDayTime(iso: string): string {
  const day = parisDate(new Date(iso));
  return `${day === parisDate(new Date()) ? "aujourd'hui" : `le ${formatDayLong(day)}`} à\u00a0${formatClock(iso)}`;
}

export function OrderConfirmation({
  orderId,
  slug,
  restaurantName,
  address,
  phone,
  back,
}: {
  orderId: string;
  slug: string;
  restaurantName: string;
  address: string;
  phone?: string | null;
  /** Lien de retour ; absent ⇒ la carte sur collect.ominin.com. */
  back?: { href: string; label: string };
}) {
  const [order, setOrder] = useState<CollectOrderView | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  // Horloge du compte à rebours, avancée à chaque relecture (le polling
  // re-rend déjà le composant : précision à la minute sans timer dédié).
  const [now, setNow] = useState(0);

  useEffect(() => {
    let stopped = false;
    // Arrivé ici, le client a payé (ou payera dans la feuille) : le panier
    // gardé pour un nouvel essai n'a plus lieu d'être.
    try {
      sessionStorage.removeItem(savedCartKey(slug, null));
    } catch {
      // Stockage indisponible : rien n'était gardé.
    }

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/collect/order?commande=${encodeURIComponent(orderId)}`
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
        } else {
          setMissing(true);
          stopped = true;
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
  }, [orderId, slug]);

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

  if (missing) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-8 text-center">
        <h2 className="font-display text-xl font-medium">Commande introuvable</h2>
        {/* Un paiement abandonné efface sa commande : le lien ne mène plus à rien. */}
        <p className="text-sm text-muted">
          Aucune commande réglée ne correspond à ce lien. Un paiement qui
          n&apos;a pas abouti n&apos;est pas transmis à l&apos;établissement,
          et rien n&apos;est débité.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <a
            href={back?.href ?? collectHref(slug)}
            className="ember-gradient rounded-full px-6 py-2.5 text-sm font-semibold text-background"
          >
            Commander à nouveau
          </a>
          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="flex items-center rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
            >
              Appeler le {phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (!order || !order.paid) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-8 text-center">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Paiement en cours
        </p>
        <h2 className="font-display text-xl font-medium">
          Confirmation de votre paiement…
        </h2>
        <p className="text-sm text-muted">
          Quelques secondes, la page se met à jour toute seule.
        </p>
      </div>
    );
  }

  const copy = STATUS_COPY[order.status] ?? STATUS_COPY.en_attente!;
  const cancelled = order.status === "annulee";
  const currentStep = STEPS.findIndex((step) => step.status === order.status);
  const showEta = order.status === "en_preparation" && order.estimatedReadyAt;
  const minutesLeft = order.estimatedReadyAt
    ? Math.round((Date.parse(order.estimatedReadyAt) - now) / 60_000)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div
        // Repères inertes (statut, étapes) pour l'habillage d'un établissement.
        data-status={order.status}
        className={`rounded-2xl border bg-surface p-6 text-center ${
          cancelled ? "border-ember-3/40" : "border-hairline"
        }`}
      >
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          {order.customerName} · commandée {formatDayTime(order.createdAt)}
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
              Prête vers {formatClock(order.estimatedReadyAt!)}
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
              Retrait {order.pickupAt ? formatDayTime(order.pickupAt) : "dès que possible"}
            </p>
          )
        )}
        {!cancelled && (
          <ol aria-label="Avancement de la commande" className="collect-steps mt-5 grid grid-cols-4 gap-1.5 text-left">
            {STEPS.map((step, index) => {
              const reached = index <= currentStep;
              return (
                <li
                  key={step.status}
                  aria-current={index === currentStep ? "step" : undefined}
                  data-state={index < currentStep ? "done" : index === currentStep ? "current" : "todo"}
                  className="flex flex-col gap-1.5"
                >
                  <span aria-hidden className={`h-1 rounded-full ${reached ? "bg-ember-1" : "bg-hairline"}`} />
                  <span className={`text-[11px] font-semibold ${reached ? "text-foreground" : "text-faint"}`}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {cancelled && phone && (
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="mt-4 inline-flex items-center rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
          >
            Appeler le {phone}
          </a>
        )}
      </div>

      {!cancelled && order.status !== "retiree" && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{restaurantName}</p>
            <p className="mt-0.5 text-xs text-muted">{address}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex items-center rounded-full border border-hairline px-4 py-2.5 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
              >
                Appeler
              </a>
            )}
            <a
              href={mapsDirectionsHref(`${restaurantName}, ${address}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-hairline px-4 py-2.5 text-xs font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
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
                  {formatPrice(line.quantity * line.unitPrice)}
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
        {order.note && (
          <p className="mt-3 whitespace-pre-line border-t border-hairline pt-3 text-sm text-muted">
            Votre mot&nbsp;: « {order.note} »
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
          <span className="text-sm font-semibold">
            {order.settlement === "payee"
              ? "Total payé"
              : order.settlement === "au_retrait"
                ? "À régler au retrait"
                : "Total"}
          </span>
          <span className="font-display text-lg text-ember-1">
            {formatPrice(order.total)}
          </span>
        </div>
      </div>

      <a
        href={back?.href ?? collectHref(slug)}
        className="text-center text-sm font-semibold text-ember-1 transition-opacity hover:opacity-80"
      >
        {back?.label ?? "Retour au menu"}
      </a>
    </div>
  );
}
