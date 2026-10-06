"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  COUNTER_WAIT_LATE_MINUTES,
  COUNTER_WAIT_WARN_MINUTES,
} from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import { can } from "@/lib/gestion/permissions";
import { earlierNumberingDay } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Order, OrderStatus } from "@/lib/gestion/types";
import { formatWait, minutesSince } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu-data";

/*
 * Une commande fast food dans l'onglet À servir : son numéro, en grand — c'est
 * ce que le comptoir appelle —, ce qu'elle contient, et le geste suivant.
 * Payée, elle est en préparation : « Prête » prévient le client sur son
 * téléphone (s'il a commandé depuis le menu). Prête, elle attend son client :
 * « Remettre » la clôt. Un « Prête » touché trop tôt se reprend.
 *
 * Lue de loin, en plein coup de feu : la carte prête est la plus visible
 * (en-tête en dégradé, comme le ticket du client quand sa commande est
 * prête), celle en préparation reste sobre. Le temps écoulé depuis la
 * commande dit qui attend depuis le plus longtemps ; le contenu se lit en
 * clair pour vérifier le sac, et une quantité au-delà de 1 ressort. Les
 * lignes ont leur rendu à elles : celui de l'addition (order-line) reste
 * dense.
 */
export function CounterCard({
  order,
  now,
  resetHour,
  readOnly = false,
  setStatus = api.updateOrderStatus,
}: {
  order: Order;
  /** L'heure de la page : une seule horloge pour toutes les cartes (et le
   *  résumé de la file), sinon deux commandes du même âge passaient « en
   *  retard » à des moments différents. */
  now: Date;
  /** Heure où les numéros repartent de 1 ; inconnue, pas de jour affiché. */
  resetHour: number | null;
  /** Vue cuisine : la file du comptoir, sans ses gestes. */
  readOnly?: boolean;
  /** Démonstration : le geste reste dans l'onglet au lieu d'écrire en base. */
  setStatus?: (orderId: string, status: OrderStatus) => Promise<unknown>;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const ready = order.status === "prete";
  const waited = minutesSince(order.createdAt, now);
  // En préparation seulement : une commande prête n'a pas l'heure où elle l'est devenue.
  const late = !ready && waited >= COUNTER_WAIT_LATE_MINUTES;
  // Arrivée dans la minute (« à l'instant ») : elle se signale parmi les autres.
  const fresh = !ready && waited < 1;
  // Plus l'attente est longue, plus elle se voit : discrète d'abord, puis
  // pastille pleine, ambre puis rouge (crème à l'arrivée). Les pastilles
  // débordent dans la marge : le texte reste aligné sur l'heure en dessous.
  const waitTone = ready
    ? ""
    : late
      ? "-mr-2 px-2 bg-ember-3 text-background"
      : waited >= COUNTER_WAIT_WARN_MINUTES
        ? "-mr-2 px-2 bg-ember-1 text-background"
        : fresh
          ? "-mr-2 px-2 bg-foreground text-background"
          : "text-muted";
  const earlierDay = earlierNumberingDay(order, resetHour);

  const move = async (target: OrderStatus, message: string) => {
    setBusy(true);
    try {
      await setStatus(order.id, target);
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
    ? // Le numéro sur le geste qui clôt : on le vérifie là où l'on touche.
      { target: "servie", label: `Remettre N° ${order.orderNumber}`, done: `N° ${order.orderNumber} remise au client.` }
    : { target: "prete", label: "Marquer prête", done: `N° ${order.orderNumber} prête.` };
  const actionable = !readOnly && can(role, `orders.setStatus:${next.target}`);

  return (
    <article
      data-ready={ready || undefined}
      data-late={late || undefined}
      data-fresh={fresh || undefined}
      className="counter-card flex flex-col overflow-hidden rounded-2xl border border-hairline bg-surface pb-4 data-fresh:border-foreground/25 data-late:border-ember-3 data-late:ring-1 data-late:ring-ember-3 data-ready:border-ember-2/60"
    >
      <div
        className={`flex items-start justify-between gap-3 px-5 pb-2.5 pt-3 ${
          ready ? "ember-gradient text-background" : late ? "bg-ember-3/30" : ""
        }`}
      >
        <h3 className="flex flex-col gap-0.5">
          {/* L'état en toutes lettres : le retard ne tient pas qu'à une couleur. */}
          {/* Même hauteur de ligne que la pastille d'attente : les deux se
              lisent sur une seule ligne. */}
          <span
            className={`text-sm font-semibold uppercase leading-6 tracking-[0.16em] ${
              ready
                ? "text-background/75"
                : late
                  ? // Éclairci : le mot le plus urgent reste lisible sur la bande sombre.
                    "text-[color-mix(in_srgb,var(--ember-3)_70%,var(--foreground))]"
                  : fresh
                    ? "text-foreground"
                    : "text-muted"
            }`}
          >
            {ready
              ? "Prête · à remettre"
              : late
                ? "En retard"
                : fresh
                  ? "Nouvelle commande"
                  : "En préparation"}
          </span>
          <span className="flex items-baseline gap-1.5 font-semibold leading-none tabular-nums">
            <span className="text-2xl opacity-60">N°</span>
            <span className="counter-number text-6xl tracking-tight">
              {order.orderNumber}
            </span>
          </span>
        </h3>
        {/* Attente en haut, heure calée sur le bas du numéro. */}
        <p className="flex flex-col items-end justify-between gap-1.5 self-stretch text-right tabular-nums">
          {/* Pastille : l'attente qui s'allonge se voit de loin. */}
          <span
            className={`rounded-full py-0.5 text-base font-semibold leading-5 ${waitTone}`}
          >
            {formatWait(waited)}
          </span>
          <span
            className={`text-[13px] ${ready ? "text-background/85" : "text-muted"}`}
          >
            {earlierDay && (
              <span className={`font-semibold ${ready ? "" : "text-ember-3"}`}>
                {earlierDay} ·{" "}
              </span>
            )}
            {formatTime(order.createdAt)}
          </span>
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-2 border-t border-hairline px-5 pt-3">
        {order.items.map((line) => (
          // Quantités en pastilles de même largeur, sur le bord de la carte :
          // noms et options partent tous du même bord.
          <li key={line.id} className="grid grid-cols-[2.25rem_1fr] gap-x-2">
            <span
              className={`self-start rounded-md text-center text-base leading-snug tabular-nums ${
                line.quantity > 1
                  ? "bg-ember-1/15 font-semibold text-ember-1"
                  : "bg-surface-raised text-muted"
              }`}
            >
              {line.quantity}×
            </span>
            <div className="flex flex-col">
              <p className="text-base leading-snug">
                {line.name}
                {line.loyaltyPoints && (
                  <span className="ml-1.5 whitespace-nowrap rounded-full border border-ember-2/40 px-1.5 py-px text-[10px] font-semibold text-ember-1">
                    Offert · {line.loyaltyPoints * line.quantity} pts
                  </span>
                )}
              </p>
              {line.options?.map((option, index) => (
                <p key={index} className="text-sm text-muted">
                  {option.groupName}
                  {"\u00a0: "}
                  {/* Le choix et son supplément d'un bloc : passé à la ligne entier, pas
                      coupé au milieu (« Frites / épicées »), le supplément jamais seul. */}
                  <span className="inline-block max-w-full">
                    <span className="text-foreground">{option.choiceName}</span>
                    {option.supplement > 0 && `\u00a0(+${formatPrice(option.supplement)})`}
                  </span>
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {actionable && (
        <div className="mt-3 flex items-center gap-5 px-5">
          {ready && can(role, "orders.setStatus:payee") && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void move("payee", `N° ${order.orderNumber} repasse en préparation.`)
              }
              className="min-h-11 rounded-full border border-foreground/15 px-3 text-[13px] font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-60"
            >
              Pas encore prête
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void move(next.target, next.done)}
            className={`min-h-11 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              ready
                ? "ember-gradient text-background"
                : `border text-foreground transition-colors hover:bg-ember-2/10 ${
                    late ? "border-ember-3" : "border-ember-2/50"
                  }`
            }`}
          >
            {next.label}
          </button>
        </div>
      )}
    </article>
  );
}
