import type Stripe from "stripe";
import {
  sendBookingConfirmed,
  sendBookingRefunded,
  type BookingMail,
} from "@/lib/club/mail";
import { connectedAccount, type SettleOutcome } from "@/lib/stripe/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Règlement d'une table réservée en ligne, d'après un Payment Intent abouti
 * sur le compte connecté du club. Même contrat que settlePayment (menus
 * QR) : idempotent — webhook connecté, vérification de la feuille et route
 * de paiement peuvent s'y croiser — et un paiement qui ne peut plus tenir sa
 * table (délai passé et table reprise, soirée annulée, réservation déjà
 * réglée par un autre paiement) est remboursé, frais Ominin compris.
 */

const BOOKING_MAIL_SELECT =
  "name, email, token, party_size, total_cents, club_tables(label, club_zones(name)), club_events(title, starts_at, ends_at), etablissements(slug, name, address)";

/** Les données d'un e-mail client, ou null sans adresse e-mail. */
export async function bookingMail(admin: Admin, bookingId: string): Promise<BookingMail | null> {
  const { data } = await admin
    .from("club_bookings")
    .select(BOOKING_MAIL_SELECT)
    .eq("id", bookingId)
    .maybeSingle();
  if (!data?.email || !data.club_tables?.club_zones || !data.club_events || !data.etablissements) {
    return null;
  }
  return {
    to: data.email,
    name: data.name,
    token: data.token,
    club: data.etablissements,
    event: {
      title: data.club_events.title,
      startsAt: data.club_events.starts_at,
      endsAt: data.club_events.ends_at,
    },
    table: { label: data.club_tables.label, zone: data.club_tables.club_zones.name },
    partySize: data.party_size,
    totalCents: data.total_cents,
  };
}

async function confirm(admin: Admin, bookingId: string) {
  const mail = await bookingMail(admin, bookingId);
  if (mail) await sendBookingConfirmed(mail);
}

async function refundIntent(stripe: Stripe, paymentIntentId: string, accountId: string) {
  try {
    await stripe.refunds.create(
      { payment_intent: paymentIntentId, refund_application_fee: true },
      { stripeAccount: accountId, idempotencyKey: `refund-${paymentIntentId}` }
    );
  } catch (error) {
    if ((error as { code?: string }).code !== "charge_already_refunded") throw error;
  }
}

export async function settleBookingIntent(
  admin: Admin,
  stripe: Stripe,
  intent: Stripe.PaymentIntent,
  accountId: string
): Promise<SettleOutcome> {
  const bookingId = intent.metadata?.booking_id;
  if (!bookingId || intent.status !== "succeeded") return "unpaid";

  const refund = async (reason: string): Promise<SettleOutcome> => {
    await refundIntent(stripe, intent.id, accountId);
    console.error(`[club] paiement remboursé : ${reason}`, { bookingId, paymentIntentId: intent.id });
    return "refunded";
  };

  const readBooking = () =>
    admin
      .from("club_bookings")
      .select("etablissement_id, status, stripe_payment_intent_id, total_cents, club_events(cancelled_at)")
      .eq("id", bookingId)
      .maybeSingle();
  const { data: booking } = await readBooking();
  if (!booking) return refund("réservation disparue");

  const account = await connectedAccount(admin, booking.etablissement_id);
  if (account?.id !== accountId) {
    console.error("[club] paiement sur un autre compte connecté", { bookingId });
    return "unpaid";
  }

  if (booking.status === "payee" || booking.status === "arrivee") {
    return booking.stripe_payment_intent_id === intent.id
      ? "already_paid"
      : refund("table déjà réglée par un autre paiement");
  }
  if (booking.status !== "en_attente") return refund("réservation annulée ou table reprise");
  if (booking.club_events?.cancelled_at) return refund("soirée annulée");
  if (intent.amount !== booking.total_cents) return refund("montant différent du total");

  // Un délai passé ne suffit pas à perdre la table : tant qu'aucune autre
  // réservation ne l'a annulée, le paiement la tient.
  const { data: claimed, error } = await admin
    .from("club_bookings")
    .update({
      status: "payee",
      paid_at: new Date().toISOString(),
      hold_expires_at: null,
      stripe_payment_intent_id: intent.id,
    })
    .eq("id", bookingId)
    .eq("status", "en_attente")
    .select("id");
  if (error) throw new Error(error.message);
  if (!claimed?.length) {
    const { data: now } = await readBooking();
    return now?.stripe_payment_intent_id === intent.id && now.status !== "en_attente"
      ? "already_paid"
      : refund("table reprise pendant le paiement");
  }
  await confirm(admin, bookingId);
  return "paid";
}

/**
 * Fournisseur « demo » : la réservation est marquée payée sans débit, comme
 * mark_demo_order_paid pour les commandes. Rien ne se passe ailleurs.
 */
export async function settleDemoBooking(admin: Admin, bookingId: string): Promise<boolean> {
  const { data: booking } = await admin
    .from("club_bookings")
    .select("status, source, etablissements(payment_provider), club_events(cancelled_at)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || booking.etablissements?.payment_provider !== "demo") return false;
  if (booking.status === "payee" || booking.status === "arrivee") return true;
  if (booking.status !== "en_attente" || booking.source !== "en_ligne" || booking.club_events?.cancelled_at) {
    return false;
  }
  const { data: claimed, error } = await admin
    .from("club_bookings")
    .update({ status: "payee", paid_at: new Date().toISOString(), hold_expires_at: null })
    .eq("id", bookingId)
    .eq("status", "en_attente")
    .select("id");
  if (error) throw new Error(error.message);
  if (!claimed?.length) return false;
  await confirm(admin, bookingId);
  return true;
}

/**
 * Un remboursement fait ailleurs (tableau de bord Stripe du club) : la
 * réservation suit, sans e-mail — le club a parlé au client.
 */
export async function syncRefundedCharge(admin: Admin, charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId || !charge.refunded) return;
  const { error } = await admin
    .from("club_bookings")
    .update({ status: "remboursee", refunded_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .in("status", ["payee", "arrivee"]);
  if (error) throw new Error(error.message);
}

export type RefundOutcome = "refunded" | "cancelled" | "not_refundable";

/**
 * Rembourse (payée en ligne) ou annule (saisie par le club) une
 * réservation, côté club : bouton « Rembourser » ou soirée annulée. Le
 * client est prévenu par e-mail, sauf quand l'annulation de la soirée
 * l'annonce elle-même (notify: false).
 */
export async function refundBooking(
  admin: Admin,
  stripe: Stripe | null,
  bookingId: string,
  options: { notify: boolean }
): Promise<RefundOutcome> {
  const { data: booking } = await admin
    .from("club_bookings")
    .select("etablissement_id, status, source, paid_at, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking || !["en_attente", "payee", "arrivee"].includes(booking.status)) {
    return "not_refundable";
  }
  const paidOnline = booking.source === "en_ligne" && booking.paid_at !== null;
  if (!paidOnline) {
    const { data: cancelled, error } = await admin
      .from("club_bookings")
      .update({ status: "annulee", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId)
      .in("status", ["en_attente", "payee", "arrivee"])
      .select("id");
    if (error) throw new Error(error.message);
    return cancelled?.length ? "cancelled" : "not_refundable";
  }
  if (booking.stripe_payment_intent_id) {
    const account = await connectedAccount(admin, booking.etablissement_id);
    if (!account || !stripe) throw new Error("Compte Stripe du club introuvable.");
    await refundIntent(stripe, booking.stripe_payment_intent_id, account.id);
  }
  const { data: refunded, error } = await admin
    .from("club_bookings")
    .update({ status: "remboursee", refunded_at: new Date().toISOString() })
    .eq("id", bookingId)
    .in("status", ["payee", "arrivee"])
    .select("id");
  if (error) throw new Error(error.message);
  // Un second clic, ou un appel concurrent, a déjà rendu la table : un seul
  // e-mail part.
  if (!refunded?.length) return "not_refundable";
  if (options.notify) {
    const mail = await bookingMail(admin, bookingId);
    if (mail) await sendBookingRefunded(mail);
  }
  return "refunded";
}
