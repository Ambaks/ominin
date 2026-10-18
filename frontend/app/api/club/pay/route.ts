import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { settleBookingIntent, settleDemoBooking } from "@/lib/club/settle";
import { connectedAccount, getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Paiement d'une table tenue par /api/club/reserve. Sur le compte Stripe
 * connecté du club (paiement direct : l'argent va au club, pas dans un
 * portefeuille Ominin), les frais de service d'Ominin prélevés au passage
 * (application_fee_amount). Montant relu en base. Un seul intent par
 * réservation, repris après un refus. Fournisseur « demo » : réglée sans
 * débit. La feuille confirme l'intent dans la page, puis /api/club/verify
 * marque la table payée (le webhook connecté reste le filet).
 */
export async function POST(request: Request) {
  const { bookingId } = (await request.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("club_bookings")
    .select(
      "id, etablissement_id, status, source, total_cents, fee_cents, hold_expires_at, stripe_payment_intent_id, club_tables(label), club_events(title), etablissements(name, payment_provider, online_payment)"
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.source !== "en_ligne") {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }
  if (booking.status === "payee" || booking.status === "arrivee") {
    return NextResponse.json({ paid: true });
  }
  if (booking.status !== "en_attente") {
    return NextResponse.json({ error: "Cette réservation n'est plus active." }, { status: 409 });
  }

  const etab = booking.etablissements;
  if (etab?.payment_provider === "demo") {
    return NextResponse.json({ paid: await settleDemoBooking(admin, bookingId) });
  }

  const account = await connectedAccount(admin, booking.etablissement_id);
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
  const previous = booking.stripe_payment_intent_id
    ? await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id, {}, stripeAccount)
    : null;

  // Réglée sans que la confirmation ait été enregistrée : on clôt.
  if (previous?.status === "succeeded") {
    const outcome = await settleBookingIntent(admin, stripe, previous, account.id);
    return NextResponse.json({ paid: outcome === "paid" || outcome === "already_paid" });
  }
  if (previous?.status === "processing") {
    return NextResponse.json({ error: "Paiement en cours de traitement." }, { status: 409 });
  }
  // Le délai ne se rallonge pas : passé, la table peut être choisie par un
  // autre — le client la reprend depuis le plan.
  if (booking.hold_expires_at && Date.parse(booking.hold_expires_at) <= Date.now()) {
    return NextResponse.json(
      { error: "Le délai de paiement est passé : choisissez à nouveau votre table." },
      { status: 410 }
    );
  }

  let intent: Stripe.PaymentIntent;
  if (previous && previous.status !== "canceled") {
    intent = previous;
  } else {
    const created = await stripe.paymentIntents
      .create(
        {
          amount: booking.total_cents,
          currency: "eur",
          payment_method_types: ["card"],
          description: `Table ${booking.club_tables?.label ?? ""} — ${booking.club_events?.title ?? ""} — ${etab.name}`,
          metadata: { booking_id: booking.id },
          ...(booking.fee_cents > 0 ? { application_fee_amount: booking.fee_cents } : {}),
        },
        { ...stripeAccount, idempotencyKey: `club-booking-${booking.id}` }
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
      .from("club_bookings")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", booking.id)
      .eq("status", "en_attente");
    if (error) throw new Error(error.message);
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    accountId: account.id,
    publishableKey,
  });
}
