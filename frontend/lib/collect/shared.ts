import type { OrderItemOption, OrderStatus } from "@/lib/gestion/types";

/*
 * Types et helpers partagés entre la page click & collect (client) et les
 * routes serveur. Le client n'envoie que des références (ids + quantités) :
 * noms et prix sont refigés côté serveur depuis la base.
 */

export interface CartChoice {
  groupId: string;
  choiceId: string;
}

export interface CartLinePayload {
  itemId: string;
  quantity: number;
  choices: CartChoice[];
}

export interface CollectCheckoutPayload {
  slug: string;
  customer: { name: string; phone: string };
  /** ISO ; null = dès que possible. */
  pickupAt: string | null;
  lines: CartLinePayload[];
}

/** Commande telle qu'exposée au client sur la page de confirmation. */
export interface CollectOrderView {
  status: OrderStatus;
  createdAt: string;
  pickupAt: string | null;
  customerName: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    options: OrderItemOption[];
  }[];
  total: number;
}

/** Relecture du statut de commande (le webhook écrit avec un léger différé). */
export const COLLECT_ORDER_POLL_MS = 3000;

/**
 * Chemin de la page collect d'un établissement : à la racine sur le
 * sous-domaine dédié (réécriture du proxy), préfixé /collect ailleurs.
 */
export function collectHref(slug: string): string {
  if (
    typeof window !== "undefined" &&
    window.location.host === process.env.NEXT_PUBLIC_COLLECT_HOST
  ) {
    return `/${slug}`;
  }
  return `/collect/${slug}`;
}
