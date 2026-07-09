import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement en ligne d'une commande passée depuis le menu QR (appelant
 * anonyme). Le montant n'est JAMAIS fourni par le client : les lignes sont
 * relues en base (elles-mêmes figées par place_order). La session Checkout
 * est créée sur le compte Stripe connecté du restaurant — l'argent va au
 * restaurateur. Le webhook connecté marque ensuite la commande payée en ligne.
 */

interface OrderLine {
  name: string;
  quantity: number;
  unit_price: number;
}

export async function POST(request: Request) {
  const { orderId } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, table_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status === "payee" || order.status === "annulee") {
    return NextResponse.json(
      { error: "Cette commande n'est plus à régler." },
      { status: 409 }
    );
  }

  // online_payment / payment_accounts arrivent avec la migration
  // 20260709000002 — accès non typés en attendant la régénération des types.
  const untyped = admin as unknown as {
    from: (t: string) => ReturnType<typeof admin.from>;
  };
  const [{ data: etab }, { data: lines }, { data: table }, { data: account }] =
    await Promise.all([
      untyped
        .from("etablissements")
        .select("slug, online_payment")
        .eq("id", order.etablissement_id)
        .single(),
      admin
        .from("order_items")
        .select("name, quantity, unit_price")
        .eq("order_id", orderId),
      admin.from("tables").select("number").eq("id", order.table_id).single(),
      untyped
        .from("payment_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("etablissement_id", order.etablissement_id)
        .maybeSingle(),
    ]);
  const etabRow = etab as unknown as {
    slug: string;
    online_payment?: boolean;
  } | null;
  const accountRow = account as unknown as {
    stripe_account_id: string;
    charges_enabled: boolean;
  } | null;

  if (!etabRow?.online_payment || !accountRow?.charges_enabled) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }

  const origin = new URL(request.url).origin;
  const menuUrl = `${origin}/m/${etabRow.slug}?table=${table?.number ?? ""}`;
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: (lines as OrderLine[]).map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(line.unit_price * 100),
          product_data: { name: line.name },
        },
      })),
      metadata: { order_id: orderId },
      locale: "fr",
      success_url: `${menuUrl}&paiement=succes`,
      cancel_url: `${menuUrl}&paiement=annule`,
    },
    { stripeAccount: accountRow.stripe_account_id }
  );

  return NextResponse.json({ url: session.url });
}
