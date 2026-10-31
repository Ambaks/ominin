"use client";

import { useState, type CSSProperties } from "react";
import { CounterLines } from "@/components/gestion/commandes/counter-lines";
import { Chip, GlassButton, Plate } from "@/components/gestion/ui";
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
import { ClockIcon } from "../icons";
import { HubriseRef } from "./hubrise-ref";
import { describeError } from "@/lib/gestion/errors";

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
 * clair pour vérifier le sac (CounterLines, partagé avec le scan du retrait
 * au bar) — celui de l'addition (order-line) reste dense.
 */
export function CounterCard({
  order,
  now,
  resetHour,
  table,
  readOnly = false,
  setStatus = api.updateOrderStatus,
  i,
  ready: arrived = false,
}: {
  order: Order;
  /** L'heure de la page : une seule horloge pour toutes les cartes (et le
   *  résumé de la file), sinon deux commandes du même âge passaient « en
   *  retard » à des moments différents. */
  now: Date;
  /** Heure où les numéros repartent de 1 ; inconnue, pas de jour affiché. */
  resetHour: number | null;
  /** Table du QR, quand le gérant l'affiche à côté du numéro. */
  table?: number;
  /** Vue cuisine : la file du comptoir, sans ses gestes. */
  readOnly?: boolean;
  /** Démonstration : le geste reste dans l'onglet au lieu d'écrire en base. */
  setStatus?: (orderId: string, status: OrderStatus) => Promise<unknown>;
  /** Rang d'entrée dans la page. */
  i?: number;
  /** Arrivée en temps réel : l'onde de braise, une fois. */
  ready?: boolean;
}) {
  const { role } = useGestionAccess();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // Rang d'entrée figé au montage : un changement d'onglet ne rejoue rien.
  const [rise] = useState(i);
  const ready = order.status === "prete";
  const waited = minutesSince(order.createdAt, now);
  // En préparation seulement : une commande prête n'a pas l'heure où elle l'est devenue.
  const late = !ready && waited >= COUNTER_WAIT_LATE_MINUTES;
  const warn = !ready && !late && waited >= COUNTER_WAIT_WARN_MINUTES;
  // Arrivée dans la minute (« à l'instant ») : elle se signale parmi les autres.
  const fresh = !ready && waited < 1;
  const earlierDay = earlierNumberingDay(order, resetHour);

  const move = async (target: OrderStatus, message: string) => {
    setBusy(true);
    try {
      await setStatus(order.id, target);
      toast.success(message);
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const next: { target: "prete" | "servie"; label: string; done: string } = ready
    ? // Le numéro sur le geste qui clôt : on le vérifie là où l'on touche.
      { target: "servie", label: `Remettre N° ${order.orderNumber}`, done: `N° ${order.orderNumber} remise au client.` }
    : { target: "prete", label: "Marquer prête", done: `N° ${order.orderNumber} prête.` };
  const actionable = !readOnly && can(role, `orders.setStatus:${next.target}`);
  const stateWord = ready ? "Prête · à remettre" : late ? "En retard" : fresh ? "Nouvelle commande" : "En préparation";

  return (
    <Plate
      data-ready={ready || undefined}
      data-late={late || undefined}
      data-fresh={fresh || undefined}
      className={`${late ? "g-problem" : "g-orders"} ${rise === undefined ? "" : "g-rise"} ${arrived ? "g-ready" : ""} flex flex-col pb-4 data-fresh:ring-1 data-fresh:ring-ember-2 data-late:ring-1 data-late:ring-ember-3 data-ready:ring-1 data-ready:ring-ember-2`}
      style={rise === undefined ? undefined : ({ "--g-i": rise } as CSSProperties)}
    >
      <div
        className={`flex items-start justify-between gap-3 rounded-t-g-card px-5 pb-2.5 pt-3.5 ${
          ready ? "ember-gradient text-background" : late ? "bg-[color-mix(in_srgb,var(--ember-3)_var(--g-chip-tint),transparent)]" : ""
        }`}
      >
        <h3 className="flex flex-col gap-1">
          {/* L'état en toutes lettres : le retard ne tient pas qu'à une couleur. */}
          {/* Jamais de grenat seul en petit texte : en retard, le mot est en clair sur la bande teintée. */}
          <span className={`g-eyebrow ${ready ? "[--g-entity:var(--background)] opacity-75" : late || fresh ? "[--g-entity:var(--foreground)]" : ""}`}>
            {stateWord}
          </span>
          <span className="flex items-baseline gap-1.5 font-semibold leading-none tabular-nums">
            <span className="text-g-h2 opacity-60">N°</span>
            <span className="text-g-counter tracking-tight">{order.orderNumber}</span>
          </span>
          {/* Le numéro reste ce qu'on appelle : la table se lit en second. */}
          {table !== undefined && (
            <span className={`mt-1 text-g-label font-semibold tabular-nums ${ready ? "text-background/75" : "text-muted"}`}>
              Table {table}
            </span>
          )}
        </h3>
        {/* Attente en haut, heure calée sur le bas du numéro. */}
        <div className="flex flex-col items-end justify-between gap-1.5 self-stretch text-right tabular-nums">
          {/* L'attente qui s'allonge se voit de loin : pastille neutre, puis grenat. */}
          {ready ? (
            <span className="text-g-label text-background/85">{formatWait(waited)}</span>
          ) : late || warn ? (
            <Chip tone="problem" icon={<ClockIcon />}>
              {formatWait(waited)}
            </Chip>
          ) : (
            <Chip>{formatWait(waited)}</Chip>
          )}
          <span className={`text-g-label ${ready ? "text-background/85" : "text-muted"}`}>
            {earlierDay && (
              <span className={`font-semibold ${ready ? "" : "text-foreground"}`}>{earlierDay} · </span>
            )}
            {formatTime(order.createdAt)}
          </span>
        </div>
      </div>
      <CounterLines items={order.items} className="flex-1 pt-3" />
      {/* L'identifiant caisse après le contenu du sac : on vérifie le sac d'abord, la caisse ensuite. */}
      <HubriseRef orders={[order]} className="mt-2 px-5" sendState />

      {actionable && (
        <div className="mt-3 flex items-center gap-3 px-5">
          {ready && can(role, "orders.setStatus:payee") && (
            <GlassButton
              disabled={busy}
              onClick={() => void move("payee", `N° ${order.orderNumber} repasse en préparation.`)}
            >
              Pas encore prête
            </GlassButton>
          )}
          <GlassButton
            variant="primary"
            className="flex-1"
            disabled={busy}
            onClick={() => void move(next.target, next.done)}
          >
            {next.label}
          </GlassButton>
        </div>
      )}
    </Plate>
  );
}
