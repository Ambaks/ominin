import { NextResponse } from "next/server";
import type { CollectOrderView } from "@/lib/collect/shared";
import type { OrderItemOption } from "@/lib/gestion/types";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Lecture d'une commande collect par session Stripe. La page de
 * confirmation interroge cette route en boucle jusqu'à ce que le webhook
 * ait converti le panier en commande, puis suit le statut.
 * Pas d'auth : la session_id sert de preuve de propriété.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Paramètre session manquant." },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  const { data: order, error } = await db
    .from("orders")
    .select(
      "id, status, created_at, pickup_at, customer_name, order_items(name, quantity, unit_price, options)"
    )
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!order) {
    return NextResponse.json({ found: false });
  }

  const items = (order.order_items ?? []).map((row) => ({
    name: row.name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    options: (row.options ?? []) as unknown as OrderItemOption[],
  }));

  const total = items.reduce(
    (sum, i) =>
      sum +
      i.quantity *
        (i.unitPrice + i.options.reduce((s, o) => s + o.supplement, 0)),
    0
  );

  const view: CollectOrderView = {
    status: order.status,
    createdAt: order.created_at,
    pickupAt: order.pickup_at,
    customerName: order.customer_name ?? "",
    items,
    total,
  };

  return NextResponse.json({ found: true, order: view });
}
