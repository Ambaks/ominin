import type { OrderItemOption, OrderStatus } from "@/lib/gestion/types";

/** Commande telle qu'exposée au client sur la page de suivi. */
export interface CollectOrderView {
  status: OrderStatus;
  /**
   * La commande est entre les mains de l'établissement : payée en ligne, ou
   * prise au comptoir (réglée au retrait).
   */
  paid: boolean;
  /**
   * Où en est le règlement : payé (en ligne ou au comptoir), à régler au
   * retrait (commande du comptoir), ou ni l'un ni l'autre (annulée impayée).
   */
  settlement: "payee" | "au_retrait" | "aucun";
  createdAt: string;
  pickupAt: string | null;
  /** « Prête vers » (ISO) — posée par le restaurateur à l'acceptation. */
  estimatedReadyAt: string | null;
  customerName: string;
  /** Le mot laissé à la commande (inscription, allergie), s'il y en a un. */
  note: string | null;
  items: {
    name: string;
    quantity: number;
    /** Suppléments d'options compris. */
    unitPrice: number;
    options: OrderItemOption[];
  }[];
  total: number;
}

/**
 * Un numéro joignable : français (0X, +33, 0033) remis en paires
 * « 06 12 34 56 78 », ou international (+ ou 00, puis 9 à 15 chiffres)
 * écrit « +41… ». Null pour tout le reste — « 123 » ne rappelle personne.
 */
export function normalizePhone(raw: string): string | null {
  // « +33 (0)6… » : le (0) ne se compose pas ; « 0041… » s'écrit « +41… ».
  const compact = raw
    .replace(/\(0\)/g, "")
    .replace(/[\s.\-/()]/g, "")
    .replace(/^00/, "+");
  // « +33 06… » garde parfois le 0 national : il ne se compose pas après +33.
  const national = compact.replace(/^\+330?/, "0");
  if (/^0[1-9]\d{8}$/.test(national)) return national.replace(/(\d{2})(?=\d)/g, "$1 ");
  // L'international hors France : un numéro français à qui il manque un
  // chiffre ne passe pas pour un numéro étranger.
  if (/^\+\d{9,15}$/.test(compact) && !compact.startsWith("+33")) return compact;
  return null;
}

/** Un identifiant de commande bien formé : un lien tronqué n'en est pas un. */
export function isOrderId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Longueur du mot du client (miroir de la contrainte SQL orders.customer_note). */
export const CUSTOMER_NOTE_MAX_LENGTH = 280;

/** Relecture du statut de commande par la page de suivi. */
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
