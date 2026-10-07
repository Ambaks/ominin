import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  connectedAccount,
  getStripe,
  settlePaymentIntent,
} from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement en ligne d'une commande passée depuis le menu QR, à table ou en
 * click & collect (appelant anonyme) : prépare le Payment Intent que la
 * feuille de paiement confirme dans la page, par Apple Pay, Google Pay ou
 * carte. Le montant n'est JAMAIS fourni par le client : les lignes sont
 * relues en base (elles-mêmes figées par place_order). L'intent vit sur le
 * compte Stripe connecté du restaurant — l'argent va au restaurateur, la
 * commission Ominin est prélevée au passage. Un seul intent par commande :
 * celui d'une tentative refusée est repris (montant et pourboire remis à
 * jour) ; un intent qui ne peut plus l'être est annulé une fois le neuf
 * enregistré, pour qu'un onglet oublié ne puisse pas régler deux fois. Le
 * webhook connecté ou /api/stripe/verify marque ensuite la commande payée.
 * Tant que l'intent n'aboutit pas, la commande attend hors de la caisse :
 * l'heure de la tentative est (re)posée ici ; abandonnée, /api/square/expire
 * l'écarte.
 */

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
    .select("id, etablissement_id, table_id, order_number, type, status, paid_online, stripe_payment_intent_id, stripe_session_id")
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
  // Ouverte sur une page Stripe Checkout avant le paiement dans la page :
  // elle s'y règle, un second encaissement la ferait payer deux fois.
  if (order.stripe_session_id) {
    return NextResponse.json(
      { error: "Cette commande se règle sur la page Stripe déjà ouverte." },
      { status: 409 }
    );
  }

  const [{ data: etab }, { data: lines }, { data: table }, account] =
    await Promise.all([
      admin
        .from("etablissements")
        .select("name, online_payment, platform_fee_percent, collect_fee_percent")
        .eq("id", order.etablissement_id)
        .single(),
      admin
        .from("order_items")
        .select("quantity, unit_price")
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
  // Publique, mais lue ici plutôt que figée au build : elle est toujours du
  // même mode (test ou live) que la clé secrète qui crée l'intent.
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return NextResponse.json(
      { error: "STRIPE_PUBLISHABLE_KEY manquante." },
      { status: 500 }
    );
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

  // Commission d'Ominin : celle du click & collect sur une commande à
  // emporter, celle de l'offre sur une commande à table.
  const collect = order.type === "collect";
  const feePercent =
    (collect ? etab.collect_fee_percent : etab.platform_fee_percent) ?? 0;
  const feeCents =
    feePercent > 0 ? Math.round((orderTotal * 100 * feePercent) / 100) : 0;

  const stripe = getStripe();
  const stripeAccount = { stripeAccount: account.id };

  // Sur le relevé Stripe du restaurant : la table ou la commande, pour la
  // ressaisie en caisse.
  const description = collect
    ? `À emporter — ${etab.name}`
    : table
      ? `Table ${table.number} — ${etab.name}`
      : order.order_number
        ? `Commande n° ${order.order_number} — ${etab.name}`
        : `Commande — ${etab.name}`;
  const amount =
    lines.reduce(
      (sum, line) => sum + Math.round(line.unit_price * 100) * line.quantity,
      0
    ) + Math.round(tip * 100);
  const fee = feeCents > 0 ? { application_fee_amount: feeCents } : {};

  const previous = order.stripe_payment_intent_id
    ? await stripe.paymentIntents.retrieve(
        order.stripe_payment_intent_id,
        {},
        stripeAccount
      )
    : null;

  // Réglée sans que la confirmation ait été enregistrée (onglet fermé,
  // webhook en retard) : on clôt, sans débiter une seconde fois.
  if (previous?.status === "succeeded") {
    const outcome = await settlePaymentIntent(admin, stripe, previous, account.id);
    return NextResponse.json({
      paid: outcome === "paid" || outcome === "already_paid",
    });
  }

  // Un débit en cours de traitement aboutira ou échouera de lui-même : en
  // lancer un second risquerait de faire payer deux fois.
  if (previous?.status === "processing") {
    return NextResponse.json(
      { error: "Paiement en cours de traitement." },
      { status: 409 }
    );
  }

  let intent: Stripe.PaymentIntent;
  if (previous?.status === "requires_payment_method") {
    // Carte refusée, ou jamais saisie : le même intent resert. Le pourboire
    // peut avoir changé — « » l'efface.
    intent = await stripe.paymentIntents.update(
      previous.id,
      {
        amount,
        description,
        metadata: { tip_amount: tip ? tip.toFixed(2) : "" },
        ...fee,
      },
      stripeAccount
    );
  } else {
    intent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "eur",
        // Carte seule : Apple Pay et Google Pay en sont des portefeuilles et
        // restent proposés ; Link, qui demande l'e-mail du client, non.
        payment_method_types: ["card"],
        description,
        metadata: tip
          ? { order_id: orderId, tip_amount: tip.toFixed(2) }
          : { order_id: orderId },
        ...fee,
      },
      stripeAccount
    );
  }

  // Inscrit seulement sur une commande qui attend encore : réglée
  // entre-temps (un autre onglet, l'ancien intent), elle garde l'intent qui
  // l'a réglée, et le neuf ne sert plus.
  const { data: stored, error } = await admin
    .from("orders")
    .update({
      stripe_payment_intent_id: intent.id,
      online_payment_started_at: new Date().toISOString(),
      ...(feeCents > 0 && { platform_fee_cents: feeCents }),
    })
    .eq("id", orderId)
    .eq("status", "en_attente")
    .eq("paid_online", false)
    .select("id");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const cancel = (id: string) =>
    stripe.paymentIntents.cancel(id, {}, stripeAccount);
  if (!stored.length) {
    await cancel(intent.id).catch(() => {});
    return NextResponse.json(
      { error: "Cette commande n'est plus à régler." },
      { status: 409 }
    );
  }

  // L'ancien intent (3-D Secure abandonné dans un autre onglet…) n'est
  // annulé qu'une fois le neuf enregistré. S'il a abouti entre-temps, c'est
  // lui qui règle la commande, et le neuf est annulé à sa place.
  if (previous && previous.id !== intent.id) {
    try {
      await cancel(previous.id);
    } catch {
      const latest = await stripe.paymentIntents.retrieve(
        previous.id,
        {},
        stripeAccount
      );
      if (latest.status === "succeeded") {
        await cancel(intent.id).catch(() => {});
        const outcome = await settlePaymentIntent(admin, stripe, latest, account.id);
        return NextResponse.json({
          paid: outcome === "paid" || outcome === "already_paid",
        });
      }
    }
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    accountId: account.id,
    publishableKey,
  });
}
