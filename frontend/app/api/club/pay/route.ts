import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { settleClubIntent, settleDemoPayment } from "@/lib/club/settle";
import { connectedAccount, getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement d'une table, ou d'une part de table partagée, tenu par
 * /api/club/reserve ou /api/club/contribute. Sur le compte Stripe connecté
 * du club (paiement direct : l'argent va au club, pas dans un portefeuille
 * Ominin), les frais de service d'Ominin prélevés au passage
 * (application_fee_amount). Montant relu en base. Un seul intent par
 * paiement, repris après un refus. Fournisseur « demo » : réglé sans débit.
 * La feuille confirme l'intent dans la page, puis /api/club/verify le fait
 * compter (le webhook connecté reste le filet).
 */
export async function POST(request: Request) {
  const { paymentId } = (await request.json().catch(() => ({}))) as { paymentId?: string };
  if (!paymentId) {
    return NextResponse.json({ error: "Paiement manquant." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("club_payments")
    .select(
      "id, etablissement_id, method, status, total_cents, fee_cents, hold_expires_at, stripe_payment_intent_id, organiser, club_bookings(id, club_tables(label), club_events(title)), etablissements(name, payment_provider, online_payment)"
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.method !== "en_ligne") {
    return NextResponse.json({ error: "Paiement introuvable." }, { status: 404 });
  }
  if (payment.status === "payee") return NextResponse.json({ paid: true });
  if (payment.status !== "en_attente") {
    return NextResponse.json({ error: "Ce paiement n'est plus en cours." }, { status: 409 });
  }

  const etab = payment.etablissements;
  if (etab?.payment_provider === "demo") {
    return NextResponse.json({ paid: await settleDemoPayment(admin, paymentId) });
  }

  const account = await connectedAccount(admin, payment.etablissement_id);
  if (etab?.payment_provider !== "stripe" || !etab.online_payment || !account?.chargesEnabled) {
    return NextResponse.json(
      { error: "Le paiement en ligne n'est pas activé pour ce club." },
      { status: 409 }
    );
  }
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return NextResponse.json({ error: "STRIPE_PUBLISHABLE_KEY manquante." }, { status: 500 });
  }

  const stripe = getStripe();
  const stripeAccount = { stripeAccount: account.id };
  const previous = payment.stripe_payment_intent_id
    ? await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {}, stripeAccount)
    : null;

  // Réglé sans que la confirmation ait été enregistrée : on clôt.
  if (previous?.status === "succeeded") {
    const outcome = await settleClubIntent(admin, stripe, previous, account.id);
    return NextResponse.json({ paid: outcome === "paid" || outcome === "already_paid" });
  }
  if (previous?.status === "processing") {
    return NextResponse.json({ error: "Paiement en cours de traitement." }, { status: 409 });
  }
  // Le délai ne se rallonge pas : passé, la table ou la part peut être
  // prise par un autre — le client recommence depuis le plan ou le lien.
  if (payment.hold_expires_at && Date.parse(payment.hold_expires_at) <= Date.now()) {
    return NextResponse.json(
      { error: "Le délai de paiement est passé : recommencez." },
      { status: 410 }
    );
  }
  // Annulé depuis le tableau de bord Stripe du club : la clé d'idempotence
  // rendrait le même intent annulé, ce paiement ne peut plus aboutir.
  if (previous?.status === "canceled") {
    return NextResponse.json(
      { error: "Ce paiement a été annulé par le club. Recommencez." },
      { status: 409 }
    );
  }

  let intent: Stripe.PaymentIntent;
  if (previous) {
    intent = previous;
  } else {
    const booking = payment.club_bookings;
    const created = await stripe.paymentIntents
      .create(
        {
          amount: payment.total_cents,
          currency: "eur",
          payment_method_types: ["card"],
          description: `${payment.organiser ? "Table" : "Part de la table"} ${booking?.club_tables?.label ?? ""} — ${booking?.club_events?.title ?? ""} — ${etab.name}`,
          metadata: { payment_id: payment.id, booking_id: booking?.id ?? "" },
          ...(payment.fee_cents > 0 ? { application_fee_amount: payment.fee_cents } : {}),
        },
        { ...stripeAccount, idempotencyKey: `club-payment-${payment.id}` }
      )
      .catch((error: { type?: string }) => {
        // Deux onglets qui préparent le même paiement au même instant.
        if (error.type === "StripeIdempotencyError") return null;
        throw error;
      });
    if (!created) {
      return NextResponse.json({ error: "Paiement en cours de préparation." }, { status: 409 });
    }
    intent = created;
    const { error } = await admin
      .from("club_payments")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", payment.id)
      .eq("status", "en_attente");
    if (error) throw new Error(error.message);
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    accountId: account.id,
    publishableKey,
  });
}
