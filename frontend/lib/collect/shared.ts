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
  /** « Prête vers » (ISO) — posée par le restaurateur à l'acceptation. */
  estimatedReadyAt: string | null;
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
 * Itinéraire vers le restaurant : origine omise = position actuelle de
 * l'appareil (aucune géolocalisation à gérer côté app). Sur mobile, l'URL
 * ouvre l'application Maps installée.
 */
export const MAPS_DIRECTIONS_BASE = "https://www.google.com/maps/dir/?api=1";

export function mapsDirectionsHref(destination: string): string {
  return `${MAPS_DIRECTIONS_BASE}&destination=${encodeURIComponent(destination)}`;
}

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

/** Même logique d'hôte pour la démo plein écran de la landing. */
export function collectDemoHref(): string {
  return collectHref("demo");
}

/** Racine de la landing Collect : « / » sur le sous-domaine, /collect ailleurs. */
export function collectLandingHref(): string {
  if (
    typeof window !== "undefined" &&
    window.location.host === process.env.NEXT_PUBLIC_COLLECT_HOST
  ) {
    return "/";
  }
  return "/collect";
}
