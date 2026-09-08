import { NextResponse } from "next/server";
import { requireShopMember } from "@/lib/shop/api-auth";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/shop/constants";
import { formatPrice } from "@/lib/shop/format";
import { addOrderEvent, resendConfirmationMail, sendShippedMail } from "@/lib/shop/orders";
import type { ShopOrderStatus } from "@/lib/shop/types";
import { getStripe } from "@/lib/stripe/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Actions de gestion sur une commande qui exigent le serveur : changement
 * de statut (e-mail d'expédition), suivi, remboursement Stripe, renvoi de
 * la confirmation. La commande doit appartenir à la boutique du membre.
 */
const STATUS_MESSAGES: Record<ShopOrderStatus, string> = {
  pending: "Commande en attente de paiement",
  paid: "Commande remise en attente de préparation",
  preparing: "Préparation commencée",
  shipped: "Commande expédiée",
  delivered: "Commande livrée",
  cancelled: "Commande annulée",
  refunded: "Commande remboursée",
};

interface Body {
  orderId?: string;
  action?: "status" | "tracking" | "refund" | "resend";
  status?: ShopOrderStatus;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  notify?: boolean;
  amountCents?: number | null;
}

export async function POST(request: Request) {
  const session = await requireShopMember();
  if (session instanceof NextResponse) return session;
  const body = (await request.json().catch(() => ({}))) as Body;
  if (typeof body.orderId !== "string") return NextResponse.json({ error: "Commande manquante." }, { status: 400 });

  const admin = createAdminClient();
  const { data: order } = await admin.from("shop_orders").select("*").eq("id", body.orderId).eq("shop_id", session.shop.id).maybeSingle();
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  const shop = session.shop;

  switch (body.action) {
    case "status": {
      const status = body.status;
      if (!status || !ORDER_STATUS_FLOW[order.status].includes(status)) {
        return NextResponse.json({ error: `Passage de « ${ORDER_STATUS_LABELS[order.status]} » à « ${status ? ORDER_STATUS_LABELS[status] : "?"} » impossible.` }, { status: 409 });
      }
      const now = new Date().toISOString();
      const patch: TablesUpdate<"shop_orders"> = { status };
      if (status === "shipped") {
        patch.shipped_at = now;
        patch.tracking_number = body.trackingNumber?.trim() || order.tracking_number;
        patch.tracking_url = body.trackingUrl?.trim() || order.tracking_url;
        patch.carrier = body.carrier?.trim() || order.carrier;
      }
      if (status === "delivered") patch.delivered_at = now;
      if (status === "cancelled") patch.cancelled_at = now;
      const { data: updated, error } = await admin.from("shop_orders").update(patch).eq("id", order.id).select("*").single();
      if (error || !updated) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
      await addOrderEvent(admin, order.id, status, `${STATUS_MESSAGES[status]}${status === "shipped" && updated.tracking_number ? ` · suivi ${updated.tracking_number}` : ""}`, session.userId);
      let warning: string | undefined;
      if (status === "shipped" && body.notify !== false) {
        const sent = await sendShippedMail(shop, updated);
        if (sent) await addOrderEvent(admin, order.id, "email", "E-mail d'expédition envoyé à la cliente", session.userId);
        else warning = "Statut enregistré, mais l'e-mail d'expédition n'a pas pu partir.";
      }
      return NextResponse.json({ ok: true, warning });
    }
    case "tracking": {
      const { error } = await admin
        .from("shop_orders")
        .update({ tracking_number: body.trackingNumber?.trim() || null, tracking_url: body.trackingUrl?.trim() || null, carrier: body.carrier?.trim() || null })
        .eq("id", order.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await addOrderEvent(admin, order.id, "tracking", `Suivi mis à jour${body.trackingNumber ? ` : ${body.trackingNumber.trim()}` : ""}`, session.userId);
      return NextResponse.json({ ok: true });
    }
    case "refund": {
      if (session.role !== "proprietaire") return NextResponse.json({ error: "Seule la propriétaire peut rembourser." }, { status: 403 });
      if (order.payment_status !== "paid" && order.payment_status !== "partially_refunded") return NextResponse.json({ error: "Cette commande n'est pas payée ou a déjà été remboursée." }, { status: 409 });
      if (!order.stripe_payment_intent_id || !order.stripe_account_id) return NextResponse.json({ error: "Aucun paiement Stripe associé." }, { status: 409 });
      const amount = body.amountCents ?? null;
      if (amount != null && (!Number.isInteger(amount) || amount <= 0 || amount > order.total_cents)) return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
      try {
        const refund = await getStripe().refunds.create(
          { payment_intent: order.stripe_payment_intent_id, ...(amount != null && { amount }), metadata: { order_number: order.order_number, shop_id: shop.id } },
          { stripeAccount: order.stripe_account_id }
        );
        const full = amount == null || amount >= order.total_cents;
        await admin.from("shop_orders").update({ payment_status: full ? "refunded" : "partially_refunded", status: full ? "refunded" : order.status }).eq("id", order.id);
        await addOrderEvent(admin, order.id, "refunded", `${full ? "Remboursement total" : "Remboursement partiel"} de ${formatPrice(refund.amount)} via Stripe`, session.userId);
        return NextResponse.json({ ok: true });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur Stripe." }, { status: 502 });
      }
    }
    case "resend": {
      const { data: items } = await admin.from("shop_order_items").select("*").eq("order_id", order.id);
      const sent = await resendConfirmationMail(shop, order, items ?? []);
      if (!sent) return NextResponse.json({ error: "L'e-mail n'a pas pu être envoyé." }, { status: 502 });
      await addOrderEvent(admin, order.id, "email", "E-mail de confirmation renvoyé", session.userId);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }
}
