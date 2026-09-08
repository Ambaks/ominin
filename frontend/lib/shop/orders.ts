import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { formatPrice } from "./format";
import { sendShopMail } from "./mail";
import { newOrderNotificationMail, orderConfirmationMail, orderShippedMail } from "./mail-templates";
import { shopPublicUrl } from "./server";
import type { Address, Shop, ShopOrder, ShopOrderItem } from "./types";

/*
 * Cycle de vie d'une commande côté serveur (clé service) : passage en payée
 * depuis une session Stripe Checkout, expiration, remboursement, e-mails.
 * Le passage en payée est idempotent — le webhook et la page de
 * confirmation peuvent l'appeler en parallèle.
 */

type Admin = ReturnType<typeof createAdminClient>;

export async function addOrderEvent(admin: Admin, orderId: string, type: string, message: string | null, createdBy?: string | null) {
  await admin.from("shop_order_events").insert({ order_id: orderId, type, message, created_by: createdBy ?? null });
}

async function loadShop(admin: Admin, shopId: string): Promise<Shop | null> {
  const { data } = await admin.from("shops").select("*").eq("id", shopId).maybeSingle();
  return data;
}

function addressFromStripe(details: Stripe.Checkout.Session.CustomerDetails | null | undefined): Address | null {
  const a = details?.address;
  if (!a?.line1 || !a.postal_code || !a.city || !a.country) return null;
  return { line1: a.line1, line2: a.line2 ?? null, postal_code: a.postal_code, city: a.city, country: a.country };
}

export async function markOrderPaidFromSession(
  session: Stripe.Checkout.Session,
  connectedAccountId: string | null
): Promise<ShopOrder | null> {
  const admin = createAdminClient();
  const orderId = session.metadata?.order_id;
  const { data: order } = orderId
    ? await admin.from("shop_orders").select("*").eq("id", orderId).maybeSingle()
    : await admin.from("shop_orders").select("*").eq("stripe_checkout_session_id", session.id).maybeSingle();
  if (!order) {
    console.error("[shop] commande introuvable pour la session", session.id);
    return null;
  }
  if (order.payment_status === "paid" || session.payment_status !== "paid") return order;

  // Défense en profondeur : bonne session, bon compte connecté, bon montant.
  if (order.stripe_checkout_session_id && order.stripe_checkout_session_id !== session.id) return order;
  if (connectedAccountId && order.stripe_account_id && connectedAccountId !== order.stripe_account_id) return order;
  if (session.amount_total != null && session.amount_total !== order.total_cents) {
    await addOrderEvent(admin, order.id, "alert", `Montant payé (${formatPrice(session.amount_total)}) différent du total attendu (${formatPrice(order.total_cents)})`);
    return order;
  }

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  const { data: paid } = await admin
    .from("shop_orders")
    .update({
      status: "paid",
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      billing_address: (addressFromStripe(session.customer_details) as unknown as Json | null) ?? order.billing_address,
      phone: order.phone ?? session.customer_details?.phone ?? null,
    })
    .eq("id", order.id)
    .eq("payment_status", "unpaid")
    .select("*")
    .maybeSingle();
  // Une exécution concurrente a déjà traité le paiement.
  if (!paid) {
    const { data: fresh } = await admin.from("shop_orders").select("*").eq("id", order.id).maybeSingle();
    return fresh ?? order;
  }

  const { data: items } = await admin.from("shop_order_items").select("*").eq("order_id", paid.id);
  await addOrderEvent(admin, paid.id, "paid", `Paiement confirmé par Stripe (${formatPrice(paid.total_cents)})`);
  for (const item of items ?? []) {
    if (item.product_id) await admin.rpc("shop_decrement_stock", { p_product_id: item.product_id, p_qty: item.quantity });
  }
  if (paid.discount_code) await admin.rpc("shop_increment_discount_uses", { p_shop: paid.shop_id, p_code: paid.discount_code });

  const shop = await loadShop(admin, paid.shop_id);
  if (shop) await sendOrderMails(shop, paid, items ?? []);
  return paid;
}

async function sendOrderMails(shop: Shop, order: ShopOrder, items: ShopOrderItem[]) {
  const ctx = { shop, shopUrl: shopPublicUrl(shop.slug) };
  const confirmation = orderConfirmationMail(ctx, order, items);
  await sendShopMail({ to: order.email, fromName: shop.name, replyTo: shop.contact_email, ...confirmation });
  if (shop.contact_email) {
    const notification = newOrderNotificationMail(ctx, order, items);
    await sendShopMail({ to: shop.contact_email, fromName: "Ominin Shop", replyTo: order.email, ...notification });
  }
}

export async function resendConfirmationMail(shop: Shop, order: ShopOrder, items: ShopOrderItem[]): Promise<boolean> {
  const mail = orderConfirmationMail({ shop, shopUrl: shopPublicUrl(shop.slug) }, order, items);
  return sendShopMail({ to: order.email, fromName: shop.name, replyTo: shop.contact_email, ...mail });
}

export async function sendShippedMail(shop: Shop, order: ShopOrder): Promise<boolean> {
  const mail = orderShippedMail({ shop, shopUrl: shopPublicUrl(shop.slug) }, order);
  return sendShopMail({ to: order.email, fromName: shop.name, replyTo: shop.contact_email, ...mail });
}

/** Session Checkout expirée sans paiement : le panier abandonné est annulé. */
export async function markSessionExpired(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const orderId = session.metadata?.order_id;
  if (!orderId) return;
  const { data } = await admin
    .from("shop_orders")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending")
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();
  if (data) await addOrderEvent(admin, orderId, "expired", "Session de paiement expirée sans paiement");
}

/** Remboursement constaté côté Stripe (depuis l'espace ou le dashboard Stripe). */
export async function applyRefundFromCharge(charge: Stripe.Charge) {
  const admin = createAdminClient();
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;
  const { data: order } = await admin.from("shop_orders").select("*").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (!order) return;
  const full = charge.amount_refunded >= charge.amount;
  await admin
    .from("shop_orders")
    .update({ payment_status: full ? "refunded" : "partially_refunded", status: full ? "refunded" : order.status })
    .eq("id", order.id);
  await addOrderEvent(admin, order.id, "refunded", `${full ? "Remboursement total" : "Remboursement partiel"} : ${formatPrice(charge.amount_refunded)}`);
}
