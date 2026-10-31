"use client";

import { Chip } from "@/components/gestion/ui";
import { useGestion } from "@/lib/gestion/store";
import type { Order } from "@/lib/gestion/types";
import { ClockIcon } from "../icons";

type Ref = Pick<Order, "hubriseOrderId"> & Partial<Pick<Order, "status" | "paidOnline" | "fromTill">>;

/**
 * Réglée et encore ouverte, sans id : son envoi est en file. Une commande
 * close n'en dit rien : celle d'avant la connexion n'a jamais eu d'id à
 * attendre, et une vente de la caisse en vient.
 */
const awaitsSend = (order: Ref) =>
  !order.hubriseOrderId &&
  !order.fromTill &&
  (order.status === "payee" ||
    order.status === "prete" ||
    order.status === "en_preparation" ||
    (order.status === "en_attente" && order.paidOnline === true));

/**
 * L'id HubRise des commandes transmises à la caisse : c'est par lui qu'on
 * les retrouve dans la caisse ou les journaux HubRise. Rien si aucune n'y est
 * partie. `sendState`, sur les cartes du service d'un restaurant relié : dit
 * aussi que c'est parti, ou que l'envoi attend, avant que la caisse ne le
 * demande. `className` remplace la marge haute par défaut.
 */
export function HubriseRef({
  orders,
  className = "mt-1",
  sendState = false,
}: {
  orders: Ref[];
  className?: string;
  sendState?: boolean;
}) {
  const connected = useGestion()?.etablissement.hubriseConnected ?? false;
  const shown = sendState && connected;
  const ids = orders.flatMap((order) => (order.hubriseOrderId ? [order.hubriseOrderId] : []));
  const pending = shown && orders.some(awaitsSend);
  if (!ids.length && !pending) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      {pending && <Chip icon={<ClockIcon />}>En attente d’envoi à la caisse</Chip>}
      {ids.length > 0 && (
        <p className="text-g-axis tabular-nums text-muted" title="Identifiant chez HubRise">
          {shown && "Envoyée à la caisse · "}HubRise · {ids.join(", ")}
        </p>
      )}
    </div>
  );
}
