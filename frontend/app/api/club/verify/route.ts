import { NextResponse } from "next/server";
import { settleBookingIntent } from "@/lib/club/settle";
import { connectedAccount, getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Appelée par la feuille dès que Stripe.js a confirmé le paiement d'une
 * table : l'intent est relu chez Stripe, ce que dit le navigateur ne fait
 * jamais foi. Redondante avec le webhook connecté, à dessein.
 */
export async function POST(request: Request) {
  const { bookingId } = (await request.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("club_bookings")
    .select("etablissement_id, status, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }
  if (booking.status === "payee" || booking.status === "arrivee") {
    return NextResponse.json({ paid: true });
  }
  if (!booking.stripe_payment_intent_id) return NextResponse.json({ paid: false });

  const account = await connectedAccount(admin, booking.etablissement_id);
  if (!account) return NextResponse.json({ paid: false });
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(
    booking.stripe_payment_intent_id,
    {},
    { stripeAccount: account.id }
  );
  const outcome = await settleBookingIntent(admin, stripe, intent, account.id);
  return NextResponse.json({ paid: outcome === "paid" || outcome === "already_paid" });
}
