"use client";

import { useState } from "react";
import { Chip, GlassButton } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { SERVICE_LATE_MINUTES } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import type { Order, OrderItem } from "@/lib/gestion/types";
import { formatWait } from "@/lib/gestion/use-now";
import { ClockIcon, TablesIcon } from "../icons";
import { HubriseRef } from "./hubrise-ref";
import { CheckMark, LineLabel, LineOptions, PaymentChip } from "./order-line";
import { ServiceCard } from "./service-card";
import { describeError } from "@/lib/gestion/errors";

/*
 * Le service d'une table, article par article : chaque ligne payée attend
 * son « Servi », les lignes servies restent cochées. L'état vit en base
 * (order_items.served_at) ; une commande dont la dernière ligne arrive à
 * table se clôt d'elle-même.
 */

/** Articles encore à apporter : les quantités, boissons comprises. */
export const articlesToServe = (orders: Order[]) =>
  orders
    .flatMap((order) => order.items)
    .reduce((sum, line) => (line.servedAt ? sum : sum + line.quantity), 0);

/**
 * Le nom du « Servi » d'une ligne pour un lecteur d'écran : la ligne, et ses
 * choix quand une autre ligne à servir porte le même nom (deux Menu Midi).
 */
function serveLabel(line: OrderItem, pending: OrderItem[]): string {
  const twin = pending.some((other) => other !== line && other.name === line.name);
  const choices = twin && line.options ? `, ${line.options.map((option) => option.choiceName).join(", ")}` : "";
  return `Servi : ${line.quantity}× ${line.name}${choices}`;
}

/**
 * La confirmation d'un « Servi », nommée, la table d'abord — elle reste lisible
 * quand la bulle manque de place : « Table 4 servie. », « Table 2 · Servi :
 * Kimchi. » Le plat après « Servi : », qui ne s'accorde pas avec lui (une
 * salade, un menu).
 */
function servedMessage(itemIds: string[], pending: OrderItem[], title?: string): string {
  // La table d'un bloc : « Table / 12 » ne se coupe pas.
  const table = title?.replaceAll(" ", " ");
  if (itemIds.length === pending.length) return `${table ?? "Table"} servie.`;
  const line = pending.find((candidate) => candidate.id === itemIds[0]);
  const dish = line ? `${line.quantity > 1 ? `${line.quantity}× ` : ""}${line.name}` : "";
  return `${table ? `${table} · ` : ""}Servi : ${dish}.`;
}

export function ServirPanel({
  orders,
  readOnly = false,
  onServe = api.serveOrderItems,
  title,
}: {
  /** Commandes payées d'une même table. */
  orders: Order[];
  /** Vue cuisine : ce qui reste à apporter, sans les gestes de la salle. */
  readOnly?: boolean;
  /** Le geste « Servi » ; la démo de salle le joue sur son store, sans base. */
  onServe?: (itemIds: string[]) => Promise<void>;
  /** La table, nommée par « Tout servir » pour un lecteur d'écran et par la confirmation. */
  title?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const lines = [...orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .flatMap((order) => order.items);
  const pending = lines.filter((line) => !line.servedAt);
  const served = lines.filter((line) => line.servedAt);
  const articles = articlesToServe(orders);

  const serve = async (itemIds: string[]) => {
    setBusy(new Set(itemIds));
    try {
      await onServe(itemIds);
      toast.success(servedMessage(itemIds, pending, title));
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(new Set());
    }
  };

  return (
    <div className="g-orders flex flex-col gap-3">
      {pending.length > 0 && (
        <div>
          {/* La hauteur de « Tout servir » réservée même sans lui : les listes
              de cartes voisines partent à la même hauteur. */}
          <div className="flex min-h-g-control items-center justify-between gap-3">
            {/* Des articles, pas des lignes : « 2× Ice Tea » en compte deux. */}
            <p className="text-g-label font-semibold text-g-entity">
              {`${articles} ${articles > 1 ? "articles" : "article"} à servir`}
            </p>
            {pending.length > 1 && !readOnly && (
              <GlassButton
                disabled={busy.size > 0}
                onClick={() => void serve(pending.map((line) => line.id))}
                aria-label={title && `Tout servir : ${title}`}
              >
                Tout servir
              </GlassButton>
            )}
          </div>
          <ul className="mt-1 flex flex-col">
            {pending.map((line) => (
              <li key={line.id} className="flex min-h-g-control items-center gap-3 py-1.5">
                <div className="flex flex-1 flex-col gap-0.5">
                  <LineLabel line={line} />
                  <LineOptions line={line} prices={false} />
                </div>
                {!readOnly && (
                  <GlassButton
                    variant="primary"
                    disabled={busy.has(line.id)}
                    onClick={() => void serve([line.id])}
                    aria-label={serveLabel(line, pending)}
                  >
                    Servi
                  </GlassButton>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {served.length > 0 && (
        <div>
          <p className="text-g-label font-semibold text-muted">Déjà servi</p>
          <ul className="mt-1 flex flex-col text-muted">
            {served.map((line) => (
              // Le texte au bord des lignes à servir, la coche à la place du
              // bouton : nue, sans le cadre d'une case qu'on croirait à cocher.
              <li key={line.id} className="flex items-start gap-3 py-2.5">
                <div className="flex flex-1 flex-col gap-0.5">
                  <LineLabel line={line} settled />
                  <LineOptions line={line} prices={false} />
                </div>
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted">
                  <CheckMark />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Une table dans l'onglet À servir : depuis quand elle attend — « En retard »
 * passé SERVICE_LATE_MINUTES —, comment elle a réglé, et ce qui reste à lui
 * apporter.
 */
export function ServirCard({
  orders,
  title,
  headingId,
  now,
  readOnly = false,
  onServe,
  i,
  tag,
}: {
  orders: Order[];
  title: string;
  /** Un mot devant le surtitre (« Exemple »). */
  tag?: string;
  /** L'id du titre, pour qu'un conteneur se nomme d'après lui (aria-labelledby). */
  headingId?: string;
  /** L'heure de l'écran, qui fait courir l'attente. */
  now: Date;
  readOnly?: boolean;
  onServe?: (itemIds: string[]) => Promise<void>;
  /** Rang d'entrée dans la page. */
  i?: number;
}) {
  const oldest = orders.reduce(
    (min, order) => (order.createdAt < min ? order.createdAt : min),
    orders[0].createdAt
  );
  // En minutes d'horloge, comme les heures affichées : commandée à 12:43,
  // la table attend depuis 2 min à 12:45, quelle que soit la seconde.
  const waited = Math.max(0, Math.floor(now.getTime() / 60_000) - Math.floor(Date.parse(oldest) / 60_000));
  const late = waited >= SERVICE_LATE_MINUTES;
  const since = waited < 1 ? formatWait(waited) : `il y a ${formatWait(waited)}`;
  return (
    <ServiceCard
      entity={late ? "problem" : "orders"}
      icon={<TablesIcon />}
      eyebrow={`${tag ? `${tag} · ` : ""}À servir · ${since}`}
      title={title}
      headingId={headingId}
      i={i}
      right={
        <span className="flex flex-wrap items-center gap-2">
          {/* Le retard se dit en toutes lettres, pas par la seule teinte. */}
          {late && (
            <Chip tone="problem" icon={<ClockIcon />}>
              En retard
            </Chip>
          )}
          <PaymentChip orders={orders} />
        </span>
      }
      sub={
        <>
          Commandée à {formatTime(oldest)}.
          <HubriseRef orders={orders} />
        </>
      }
    >
      <div className="mt-2">
        <ServirPanel orders={orders} readOnly={readOnly} onServe={onServe} title={title} />
      </div>
    </ServiceCard>
  );
}
