import type { ShopDiscountCode, ShopShippingMethod } from "./types";
import { formatPrice } from "./format";

/*
 * Règles de prix partagées entre l'affichage (récapitulatif du tunnel) et
 * le serveur (création de la session Stripe, qui refait tous les calculs
 * depuis la base : le client n'envoie que des identifiants et quantités).
 */

/** Frais de port : gratuits dès le seuil du mode, sinon dès le seuil global de la boutique. */
export function computeShippingCents(
  method: Pick<ShopShippingMethod, "price_cents" | "free_above_cents">,
  subtotalCents: number,
  shopThresholdCents: number | null
): number {
  const threshold = method.free_above_cents ?? shopThresholdCents;
  if (threshold != null && subtotalCents >= threshold) return 0;
  return method.price_cents;
}

export type DiscountResult =
  | { ok: true; code: string; discountCents: number; description: string }
  | { ok: false; error: string };

export function computeDiscount(
  code: ShopDiscountCode,
  subtotalCents: number,
  now = Date.now()
): DiscountResult {
  if (!code.is_active) return { ok: false, error: "Ce code n'est plus actif." };
  if (code.starts_at && new Date(code.starts_at).getTime() > now) {
    return { ok: false, error: "Ce code n'est pas encore valable." };
  }
  if (code.ends_at && new Date(code.ends_at).getTime() < now) {
    return { ok: false, error: "Ce code a expiré." };
  }
  if (code.max_uses != null && code.uses >= code.max_uses) {
    return { ok: false, error: "Ce code a déjà été utilisé le nombre maximum de fois." };
  }
  if (code.min_subtotal_cents != null && subtotalCents < code.min_subtotal_cents) {
    return {
      ok: false,
      error: `Ce code s'applique à partir de ${formatPrice(code.min_subtotal_cents)} d'achat.`,
    };
  }
  const raw =
    code.type === "percent" ? Math.round((subtotalCents * code.value) / 100) : code.value;
  return {
    ok: true,
    code: code.code,
    discountCents: Math.min(raw, subtotalCents),
    description: code.type === "percent" ? `-${code.value} %` : `-${formatPrice(code.value)}`,
  };
}

export function shippingDelayLabel(
  method: Pick<ShopShippingMethod, "delay_min_days" | "delay_max_days">
): string | null {
  const { delay_min_days: min, delay_max_days: max } = method;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min} à ${max} jours ouvrés`;
  const days = max ?? min ?? 0;
  return `${days} jour${days > 1 ? "s" : ""} ouvré${days > 1 ? "s" : ""}`;
}

/** Commission plateforme figée à la commande, en centimes. */
export function platformFeeCents(totalCents: number, feePercent: number): number {
  return feePercent > 0 ? Math.round((totalCents * feePercent) / 100) : 0;
}
