import { NextResponse } from "next/server";
import { menuSiteUrl } from "@/lib/site";
import { connectedAccount, getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement en ligne d'une commande passée depuis le menu QR (appelant
 * anonyme). Le montant n'est JAMAIS fourni par le client : les lignes sont
 * relues en base (elles-mêmes figées par place_order). La session Checkout
 * est créée sur le compte Stripe connecté du restaurant — l'argent va au
 * restaurateur. Une seule session ouverte par commande : la précédente
 * (annulée, onglet fermé) est expirée avant d'en ouvrir une neuve, pour
 * qu'un onglet oublié ne puisse pas régler deux fois. Le webhook connecté
 * ou /api/stripe/verify marque ensuite la commande payée.
 */

/**
 * Durée de vie d'une session Checkout : le minimum accordé par Stripe est
 * 30 min, mesurées à la réception de la requête — une minute de marge
 * absorbe la latence. Une addition non réglée en ligne dans ce délai l'a été
 * au comptoir.
 */
const CHECKOUT_TTL_S = 31 * 60;

export async function POST(request: Request) {
  const { orderId, tipAmount } = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    tipAmount?: unknown;
  };
  if (!orderId) {
    return NextResponse.json({ error: "Commande manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, etablissement_id, table_id, status, paid_online, stripe_session_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status !== "en_attente" || order.paid_online) {
    return NextResponse.json(
      { error: "Cette commande n'est plus à régler." },
      { status: 409 }
    );
  }

  const [{ data: etab }, { data: lines }, { data: table }, account] =
    await Promise.all([
      admin
        .from("etablissements")
        .select("name, slug, online_payment")
        .eq("id", order.etablissement_id)
        .single(),
      admin
        .from("order_items")
        .select("name, quantity, unit_price")
        .eq("order_id", orderId),
      order.table_id
        ? admin.from("tables").select("number").eq("id", order.table_id).single()
        : Promise.resolve({ data: null }),
      connectedAccount(admin, order.etablissement_id),
    ]);

  if (!etab?.online_payment || !account?.chargesEnabled) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce restaurant." },
      { status: 409 }
    );
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Commande vide." }, { status: 409 });
  }

  // Pourboire choisi par le client — la seule part du montant qui vienne de
  // lui. Borné au total de la commande : au-delà, c'est une erreur de saisie
  // ou un abus.
  const orderTotal = lines.reduce(
    (sum, line) => sum + line.unit_price * line.quantity,
    0
  );
  const tip =
    typeof tipAmount === "number" && Number.isFinite(tipAmount) && tipAmount > 0
      ? Math.min(Math.round(tipAmount * 100) / 100, orderTotal)
      : 0;

  const stripe = getStripe();
  const stripeAccount = { stripeAccount: account.id };
  if (order.stripe_session_id) {
    // Déjà réglée ou expirée : Stripe refuse, sans conséquence.
    await stripe.checkout.sessions
      .expire(order.stripe_session_id, {}, stripeAccount)
      .catch(() => {});
  }

  // Retour sur le menu de la table, avec la commande à confirmer.
  const returnUrl = new URL(`${menuSiteUrl}/m/${etab.slug}`);
  if (table) returnUrl.searchParams.set("table", String(table.number));
  returnUrl.searchParams.set("commande", orderId);
  const withOutcome = (outcome: "succes" | "annule") => {
    const url = new URL(returnUrl);
    url.searchParams.set("paiement", outcome);
    return url.toString();
  };
  const description = table
    ? `Table ${table.number} — ${etab.name}`
    : `Commande — ${etab.name}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        ...lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(line.unit_price * 100),
            product_data: { name: line.name },
          },
        })),
        ...(tip
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "eur",
                  unit_amount: Math.round(tip * 100),
                  product_data: { name: "Pourboire" },
                },
              },
            ]
          : []),
      ],
      metadata: tip
        ? { order_id: orderId, tip_amount: tip.toFixed(2) }
        : { order_id: orderId },
      // Sur le relevé Stripe du restaurant : la table et la commande, pour la
      // ressaisie en caisse.
      payment_intent_data: { description, metadata: { order_id: orderId } },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_TTL_S,
      locale: "fr",
      success_url: withOutcome("succes"),
      cancel_url: withOutcome("annule"),
    },
    stripeAccount
  );

  const { error } = await admin
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", orderId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
