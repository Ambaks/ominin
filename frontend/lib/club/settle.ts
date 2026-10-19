import type Stripe from "stripe";
import {
  sendBookingConfirmed,
  sendPaymentRefunded,
  sendShareConfirmed,
  sendSharePaid,
  type BookingMail,
} from "@/lib/club/mail";
import { connectedAccount, type SettleOutcome } from "@/lib/stripe/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Règlement des paiements d'une table : la table entière, ou chaque part
 * d'une table partagée — un Payment Intent par paiement, sur le compte
 * connecté du club. Même contrat que settlePayment (menus QR) : idempotent
 * (webhook, vérification de la feuille et route de paiement peuvent s'y
 * croiser), et un paiement qui ne peut plus compter — table reprise,
 * soirée annulée, part qui dépasserait le prix — est remboursé, frais
 * Ominin compris. Les comptes se font en base (regler_paiement).
 */

const MAIL_SELECT =
  "name, email, token, share_token, party_size, price_cents, total_cents, paid_cents, club_tables(club_zones(name)), club_events(title, starts_at, ends_at), etablissements(slug, name, address), club_payments(total_cents, organiser, status, method)";

type MailBooking = {
  name: string;
  email: string | null;
  token: string;
  share_token: string | null;
  party_size: number;
  price_cents: number;
  total_cents: number;
  paid_cents: number;
  club_tables: { club_zones: { name: string } | null } | null;
  club_events: { title: string; starts_at: string; ends_at: string } | null;
  etablissements: { slug: string; name: string; address: string | null } | null;
  club_payments: { total_cents: number; organiser: boolean; status: string; method: string }[];
};

type Payer = { name: string; email: string | null; amountCents: number; organiser: boolean };

function mailFor(data: MailBooking, payer?: Payer): BookingMail | null {
  const to = payer ? payer.email : data.email;
  if (!to || !data.club_tables?.club_zones || !data.club_events || !data.etablissements) {
    return null;
  }
  return {
    to,
    name: payer?.name ?? data.name,
    organiser: payer?.organiser ?? true,
    organiserName: data.name,
    token: data.token,
    shareToken: data.share_token,
    club: data.etablissements,
    event: {
      title: data.club_events.title,
      startsAt: data.club_events.starts_at,
      endsAt: data.club_events.ends_at,
    },
    zone: data.club_tables.club_zones.name,
    partySize: data.party_size,
    // L'organisateur : ce qu'il a payé en ligne (acompte ou part, frais
    // compris), à défaut la table entière.
    amountCents:
      payer?.amountCents ??
      (data.club_payments
        .filter((p) => p.organiser && p.method === "en_ligne" && p.status === "payee")
        .reduce((sum, p) => sum + p.total_cents, 0) ||
        data.total_cents),
    totalCents: data.total_cents,
    remainingCents: data.price_cents - data.paid_cents,
  };
}

/** Une table vue par une personne qui l'a réservée ou y a payé sa part. */
export async function bookingMail(
  admin: Admin,
  bookingId: string,
  payer?: Payer
): Promise<BookingMail | null> {
  const { data } = await admin
    .from("club_bookings")
    .select(MAIL_SELECT)
    .eq("id", bookingId)
    .maybeSingle();
  return data ? mailFor(data, payer) : null;
}

/**
 * Tous ceux à prévenir d'un changement : l'organisateur et chaque ami qui a
 * payé, chacun avec ce qu'il a payé (la table entière pour une réservation
 * saisie par le club).
 */
export async function bookingRecipients(admin: Admin, bookingId: string): Promise<BookingMail[]> {
  const [{ data: booking }, { data: payments }] = await Promise.all([
    admin.from("club_bookings").select(MAIL_SELECT).eq("id", bookingId).maybeSingle(),
    admin
      .from("club_payments")
      .select("name, email, total_cents, organiser")
      .eq("booking_id", bookingId)
      .eq("method", "en_ligne")
      .in("status", ["payee", "remboursee"]),
  ]);
  if (!booking) return [];
  const organiserPaid = (payments ?? []).find((payment) => payment.organiser);
  const mails = [
    mailFor(
      booking,
      organiserPaid
        ? { name: booking.name, email: booking.email, amountCents: organiserPaid.total_cents, organiser: true }
        : undefined
    ),
    ...(payments ?? [])
      .filter((payment) => !payment.organiser)
      .map((payment) =>
        mailFor(booking, {
          name: payment.name,
          email: payment.email,
          amountCents: payment.total_cents,
          organiser: false,
        })
      ),
  ];
  return mails.filter((mail) => mail !== null);
}

/**
 * Rembourse un paiement, frais Ominin compris. La clé d'idempotence porte
 * la tentative (null : sans clé) : deux appels d'une même tentative n'en font
 * qu'un, mais un remboursement refusé (solde du club insuffisant, panne
 * Stripe) peut être relancé tout de suite — Stripe rejouerait sinon l'échec
 * mémorisé pendant 24 h.
 */
async function refundIntent(
  stripe: Stripe,
  paymentIntentId: string,
  accountId: string,
  attempt: string | null
) {
  try {
    await stripe.refunds.create(
      { payment_intent: paymentIntentId, refund_application_fee: true },
      {
        stripeAccount: accountId,
        ...(attempt ? { idempotencyKey: `refund-${paymentIntentId}-${attempt}` } : {}),
      }
    );
  } catch (error) {
    if ((error as { code?: string }).code !== "charge_already_refunded") throw error;
  }
}

/** Après un paiement compté : l'e-mail de qui a payé, et l'organisateur prévenu d'une part. */
async function announce(admin: Admin, paymentId: string) {
  const { data: payment } = await admin
    .from("club_payments")
    .select("booking_id, name, email, total_cents, organiser")
    .eq("id", paymentId)
    .single();
  if (!payment) return;
  if (payment.organiser) {
    const mail = await bookingMail(admin, payment.booking_id);
    if (mail) await sendBookingConfirmed(mail);
    return;
  }
  const [friend, organiser] = await Promise.all([
    bookingMail(admin, payment.booking_id, {
      name: payment.name,
      email: payment.email,
      amountCents: payment.total_cents,
      organiser: false,
    }),
    bookingMail(admin, payment.booking_id),
  ]);
  await Promise.all([
    friend && sendShareConfirmed(friend),
    organiser && sendSharePaid(organiser, payment.name, payment.total_cents),
  ]);
}

export async function settleClubIntent(
  admin: Admin,
  stripe: Stripe,
  intent: Stripe.PaymentIntent,
  accountId: string
): Promise<SettleOutcome> {
  const paymentId = intent.metadata?.payment_id;
  if (!paymentId || intent.status !== "succeeded") return "unpaid";

  const { data: payment } = await admin
    .from("club_payments")
    .select("etablissement_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (payment) {
    const account = await connectedAccount(admin, payment.etablissement_id);
    if (account?.id !== accountId) {
      console.error("[club] paiement sur un autre compte connecté", { paymentId });
      return "unpaid";
    }
  }

  const { data: outcome, error } = await admin.rpc("regler_paiement", {
    p_payment: paymentId,
    p_intent: intent.id,
    p_total: intent.amount,
  });
  if (error) throw new Error(error.message);
  if (outcome === "already_paid") return "already_paid";
  if (outcome === "refund") {
    // Sans clé : un refus (solde du club insuffisant) se rejoue à la prochaine
    // livraison du webhook ; un doublon se heurte à charge_already_refunded.
    await refundIntent(stripe, intent.id, accountId, null);
    console.error("[club] paiement remboursé : il ne pouvait plus compter", { paymentId });
    return "refunded";
  }
  await announce(admin, paymentId);
  return "paid";
}

/**
 * Fournisseur « demo » : le paiement est compté sans débit, comme
 * mark_demo_order_paid pour les commandes. Rien ne se passe ailleurs.
 */
export async function settleDemoPayment(admin: Admin, paymentId: string): Promise<boolean> {
  const { data: payment } = await admin
    .from("club_payments")
    .select("status, total_cents, etablissements(payment_provider)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.etablissements?.payment_provider !== "demo") return false;
  if (payment.status === "payee") return true;
  const { data: outcome, error } = await admin.rpc("regler_paiement", {
    p_payment: paymentId,
    p_intent: null,
    p_total: payment.total_cents,
  });
  if (error) throw new Error(error.message);
  if (outcome !== "paid") return outcome === "already_paid";
  await announce(admin, paymentId);
  return true;
}

export type RefundOutcome = "refunded" | "cancelled" | "not_refundable";

/**
 * Rembourse un paiement en ligne : une part, ou la table entière. Marqué
 * remboursé AVANT l'appel à Stripe (club_rembourser_paiement) : le webhook
 * charge.refunded le trouve déjà rendu, et un second clic n'envoie ni
 * second remboursement ni second e-mail. Stripe en échec : il est rétabli.
 */
export async function refundPayment(
  admin: Admin,
  stripe: Stripe | null,
  paymentId: string,
  options: { notify: boolean }
): Promise<boolean> {
  const { data: claimed, error } = await admin.rpc("club_rembourser_paiement", {
    p_payment: paymentId,
  });
  if (error) throw new Error(error.message);
  if (!claimed?.id) return false;
  if (claimed.stripe_payment_intent_id) {
    try {
      const account = await connectedAccount(admin, claimed.etablissement_id);
      if (!account || !stripe) throw new Error("Compte Stripe du club introuvable.");
      await refundIntent(
        stripe,
        claimed.stripe_payment_intent_id,
        account.id,
        claimed.refunded_at ?? paymentId
      );
    } catch (refundError) {
      const { error: restoreError } = await admin.rpc("club_retablir_paiement", {
        p_payment: paymentId,
      });
      if (restoreError) {
        console.error("[club] remboursement refusé, part non rétablie", { paymentId, restoreError });
      }
      throw refundError;
    }
  }
  if (options.notify) {
    const mail = await bookingMail(admin, claimed.booking_id, {
      name: claimed.name,
      email: claimed.email,
      amountCents: claimed.total_cents,
      organiser: claimed.organiser,
    });
    if (mail) await sendPaymentRefunded(mail);
  }
  return true;
}

/**
 * Rend une table, côté club (« Rembourser », soirée annulée). La table est
 * close d'abord, sous verrou (club_clore_reservation) : une part qui
 * aboutirait pendant les remboursements serait refusée, donc rendue. Puis
 * chaque paiement en ligne encore payé est remboursé — y compris ceux qu'un
 * appel précédent n'a pas pu rendre : relancer reprend là où Stripe a
 * échoué. Une réservation saisie par le club est simplement annulée.
 */
export async function refundBooking(
  admin: Admin,
  stripe: Stripe | null,
  bookingId: string,
  options: { notify: boolean }
): Promise<RefundOutcome> {
  const { data: before } = await admin
    .from("club_bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();
  const { data: status, error } = await admin.rpc("club_clore_reservation", {
    p_booking: bookingId,
  });
  if (error) throw new Error(error.message);
  if (!before || !status) return "not_refundable";

  const { data: payments } = await admin
    .from("club_payments")
    .select("id")
    .eq("booking_id", bookingId)
    .eq("method", "en_ligne")
    .eq("status", "payee");
  // Un échec Stripe interrompt la boucle : la relance reprend les parts encore payées.
  let refunded = 0;
  for (const payment of payments ?? []) {
    if (await refundPayment(admin, stripe, payment.id, options)) refunded += 1;
  }
  if (refunded > 0) return "refunded";
  const wasActive = ["en_attente", "payee", "arrivee"].includes(before.status);
  return wasActive ? (status === "remboursee" ? "refunded" : "cancelled") : "not_refundable";
}

/**
 * Un remboursement fait ailleurs (tableau de bord Stripe du club) : le
 * paiement suit, sans e-mail — le club a parlé au client.
 */
export async function syncRefundedCharge(admin: Admin, charge: Stripe.Charge): Promise<void> {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId || !charge.refunded) return;
  const { data: payment } = await admin
    .from("club_payments")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!payment) return;
  const { error } = await admin.rpc("club_rembourser_paiement", { p_payment: payment.id });
  if (error) throw new Error(error.message);
}
