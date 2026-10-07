import { NextResponse } from "next/server";
import type { CollectOrderView } from "@/lib/collect/shared";
import type { OrderItemOption } from "@/lib/gestion/types";
import {
  connectedAccount,
  getStripe,
  settleCheckoutSession,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Suivi d'une commande à emporter par son identifiant (non devinable : il
 * sert de preuve, comme pour le ticket du menu). Tant qu'elle attend son
 * paiement Stripe, la session est relue chez Stripe à chaque passage — même
 * marquage que le webhook connecté, qui peut arriver après le client.
 * Disparue : le paiement a expiré sans aboutir, la commande n'existe plus.
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("commande");
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const read = () =>
    admin
      .from("orders")
      .select(
        "status, paid_online, stripe_session_id, etablissement_id, created_at, pickup_at, estimated_ready_at, customer_name, order_items(name, quantity, unit_price, options)"
      )
      .eq("id", orderId)
      .eq("type", "collect")
      .maybeSingle();

  let { data: order, error } = await read();
  if (error) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order && !order.paid_online && order.stripe_session_id) {
    const account = await connectedAccount(admin, order.etablissement_id);
    if (account) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(
        order.stripe_session_id,
        {},
        { stripeAccount: account.id }
      );
      if ((await settleCheckoutSession(admin, stripe, session, account.id)) === "paid") {
        ({ data: order, error } = await read());
        if (error) throw new Error(error.message);
      }
    }
  }
  if (!order) return NextResponse.json({ found: false });

  // unit_price porte déjà les suppléments d'options (place_order).
  const items = order.order_items.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    options: (row.options ?? []) as unknown as OrderItemOption[],
  }));
  const view: CollectOrderView = {
    status: order.status,
    paid: order.paid_online,
    createdAt: order.created_at,
    pickupAt: order.pickup_at,
    estimatedReadyAt: order.estimated_ready_at,
    customerName: order.customer_name ?? "",
    items,
    total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  };
  return NextResponse.json({ found: true, order: view });
}
