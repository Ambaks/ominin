import { raiseAlert } from "@/lib/admin/alerts";
import { SQUARE_CURRENCY } from "@/lib/square/config";
import {
  capturedTender,
  getMerchantToken,
  refundPayment,
  retrieveOrder,
  withFreshToken,
} from "@/lib/square/server";
import { connectedAccount, getStripe, refundIntent } from "@/lib/stripe/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Refusée ou annulée par la caisse après un paiement en ligne : l'argent est
 * rendu chez le prestataire qui l'a pris, en entier (pourboire compris).
 * Chaque prestataire reçoit une clé d'idempotence qui suit le paiement :
 * HubRise renvoie le callback sur un échec, le remboursement est rejoué sans
 * jamais partir deux fois.
 */

export type RefundableOrder = Pick<
  Tables<"orders">,
  | "id"
  | "etablissement_id"
  | "stripe_payment_intent_id"
  | "square_payment_id"
  | "square_order_id"
  | "sumup_checkout_id"
>;

/**
 * Rend le paiement chez le prestataire de la commande — celui qui l'a
 * encaissée, lu sur la commande : l'établissement a pu changer de
 * prestataire depuis. Renvoie l'id du remboursement (null s'il n'y en a pas :
 * déjà rendu, ou démonstration), ou false si rien ne peut se rendre d'ici
 * (SumUp : la permission de rembourser n'a jamais été accordée).
 */
async function refundAtProvider(
  admin: Admin,
  order: RefundableOrder
): Promise<string | null | false> {
  if (order.stripe_payment_intent_id) {
    const account = await connectedAccount(admin, order.etablissement_id);
    if (!account) throw new Error("Compte Stripe délié : remboursement impossible.");
    return refundIntent(getStripe(), order.stripe_payment_intent_id, account.id);
  }

  if (order.square_payment_id && order.square_order_id) {
    const { square_payment_id: paymentId, square_order_id: squareOrderId } = order;
    const merchant = await getMerchantToken(admin, order.etablissement_id);
    if (!merchant) throw new Error("Compte Square délié : remboursement impossible.");
    const { refund } = await withFreshToken(admin, order.etablissement_id, merchant, async (token) => {
      // Le montant se lit dans la commande Square (ORDERS_READ) : le paiement
      // lui-même exigerait PAYMENTS_READ.
      const { order: squareOrder } = await retrieveOrder(token, squareOrderId);
      const tender = capturedTender(squareOrder);
      if (tender?.payment_id !== paymentId) throw new Error("Paiement Square introuvable.");
      const amount = (tender.amount_money?.amount ?? 0) + (tender.tip_money?.amount ?? 0);
      return refundPayment(token, {
        idempotency_key: `order-refund-${paymentId}`,
        payment_id: paymentId,
        amount_money: { amount, currency: SQUARE_CURRENCY },
        reason: "Commande refusée par la caisse",
      });
    });
    return refund.id;
  }

  if (order.sumup_checkout_id) return false;

  // Sans trace d'un prestataire, la commande n'a été réglée qu'en
  // démonstration : il n'y a rien à rendre.
  const { data: etab } = await admin
    .from("etablissements")
    .select("payment_provider")
    .eq("id", order.etablissement_id)
    .maybeSingle();
  return etab?.payment_provider === "demo" ? null : false;
}

async function alertRefund(admin: Admin, order: RefundableOrder, body: string) {
  const { data: etab } = await admin
    .from("etablissements")
    .select("name")
    .eq("id", order.etablissement_id)
    .maybeSingle();
  await raiseAlert("backend", `hubrise-remboursement:${order.id}`, {
    title: `${etab?.name ?? "Un client"} : commande payée refusée par la caisse`,
    body,
    url: "/clients",
    urgent: true,
  }).catch(() => false);
}

/**
 * Rembourse une commande payée en ligne que la caisse a refusée ou annulée,
 * et le note (refunded_at). Un échec alerte puis remonte : le callback
 * répond 500, HubRise le renvoie et le remboursement est retenté.
 */
export async function refundTillCancelled(admin: Admin, order: RefundableOrder): Promise<void> {
  let refundId: string | null | false;
  try {
    refundId = await refundAtProvider(admin, order);
  } catch (error) {
    await alertRefund(
      admin,
      order,
      "Le remboursement a échoué. HubRise renvoie l'événement et il sera retenté ; s'il échoue encore, à rembourser à la main."
    );
    throw error;
  }
  if (refundId === false) {
    await alertRefund(admin, order, "Ce paiement ne se rembourse pas automatiquement : à rembourser à la main.");
    return;
  }
  const { error } = await admin
    .from("orders")
    .update({ refunded_at: new Date().toISOString(), refund_id: refundId })
    .eq("id", order.id)
    .is("refunded_at", null);
  if (error) throw new Error(error.message);
}
