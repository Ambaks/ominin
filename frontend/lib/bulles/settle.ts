import { after } from "next/server";
import { raiseAlert } from "@/lib/admin/alerts";
import {
  sendBulleConfirmed,
  sendPlacesPaid,
  sendPlacesRefunded,
  type BulleMail,
} from "@/lib/bulles/mail";
import { SQUARE_CURRENCY } from "@/lib/square/config";
import { getMerchantToken, refundPayment, withFreshToken } from "@/lib/square/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Règlement des places d'une bulle, payées par la caisse Square du
 * restaurant (ou en démonstration, sans débit). Les comptes se font en base
 * (regler_part_bulle) : la part est comptée, la réservation se confirme au
 * minimum de places, et les groupes qui perdent leur bulle sans en trouver
 * d'autre sont fermés. L'application rembourse ce que la base désigne :
 * le paiement qui ne pouvait plus compter, et les parts des groupes fermés.
 */

/**
 * Pourquoi un paiement est rendu : « closed », la réservation n'a plus de
 * bulle (tout ce qui y est payé est rendu) ; « full », les places étaient
 * déjà toutes payées ; « mismatch », le paiement ne correspond plus à la
 * part (montant, part abandonnée, second débit).
 */
export type RefundReason = "closed" | "full" | "mismatch";

export type PartOutcome = {
  paid: boolean;
  confirmed: boolean;
  /** Rendu au client, et pourquoi ; null quand le paiement compte. */
  refunded: RefundReason | null;
};

const MAIL_SELECT =
  "name, email, token, share_token, starts_at, ends_at, party_size, places_paid, status, bulles(name), etablissements(slug, name, address, bulle_reglages(min_party))";

type MailReservation = {
  name: string;
  email: string | null;
  token: string;
  share_token: string;
  starts_at: string;
  ends_at: string;
  party_size: number;
  places_paid: number;
  status: string;
  bulles: { name: string } | null;
  etablissements: {
    slug: string;
    name: string;
    address: string | null;
    bulle_reglages: { min_party: number } | null;
  } | null;
};

type Payer = {
  name: string;
  email: string | null;
  organiser: boolean;
  places: number;
  amount_cents: number;
};

function mailFor(data: MailReservation, payer: Payer): BulleMail | null {
  if (!payer.email || !data.bulles || !data.etablissements?.bulle_reglages) return null;
  const { slug, name, address } = data.etablissements;
  return {
    to: payer.email,
    name: payer.name,
    organiser: payer.organiser,
    organiserName: data.name,
    token: data.token,
    shareToken: data.share_token,
    etablissement: { slug, name, address },
    bulle: data.bulles.name,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    partySize: data.party_size,
    minParty: data.etablissements.bulle_reglages.min_party,
    placesPaid: data.places_paid,
    places: payer.places,
    amountCents: payer.amount_cents,
  };
}

/** Les e-mails d'une part payée : à son payeur, et à tout le groupe si la bulle vient d'être confirmée. */
async function announcePaid(admin: Admin, partId: string, confirmedNow: boolean) {
  const { data: part } = await admin
    .from("bulle_parts")
    .select("reservation_id")
    .eq("id", partId)
    .single();
  if (!part) return;
  const [{ data: reservation }, { data: payers }] = await Promise.all([
    admin.from("bulle_reservations").select(MAIL_SELECT).eq("id", part.reservation_id).single(),
    admin
      .from("bulle_parts")
      .select("id, name, email, organiser, places, amount_cents")
      .eq("reservation_id", part.reservation_id)
      .eq("method", "en_ligne")
      .eq("status", "payee"),
  ]);
  if (!reservation || reservation.status === "remboursee") return;
  const targets = confirmedNow ? payers ?? [] : (payers ?? []).filter((payer) => payer.id === partId);
  await Promise.all(
    targets.map((payer) => {
      const mail = mailFor(reservation, payer);
      if (!mail) return null;
      return confirmedNow ? sendBulleConfirmed(mail) : sendPlacesPaid(mail);
    })
  );
}

/** Rembourse un paiement Square du restaurant. La clé suit le paiement : un second appel n'en fait pas un second. */
async function refundSquare(admin: Admin, etablissementId: string, paymentId: string, amountCents: number) {
  const merchant = await getMerchantToken(admin, etablissementId);
  if (!merchant) throw new Error("Compte Square délié : remboursement impossible.");
  return withFreshToken(admin, etablissementId, merchant, (token) =>
    refundPayment(token, {
      idempotency_key: `bulle-refund-${paymentId}`,
      payment_id: paymentId,
      amount_money: { amount: amountCents, currency: SQUARE_CURRENCY },
      reason: "Place de bulle rendue",
    })
  );
}

async function sendRefundMail(admin: Admin, part: Payer & { reservation_id: string }) {
  const { data: reservation } = await admin
    .from("bulle_reservations")
    .select(MAIL_SELECT)
    .eq("id", part.reservation_id)
    .single();
  const mail = reservation && mailFor(reservation, part);
  if (mail) await sendPlacesRefunded(mail);
}

/**
 * Rend chez Square une part déjà marquée rendue en base (bulle_rembourser_part,
 * ou regler_part_bulle pour un paiement qui ne pouvait plus compter), puis
 * pose square_refund_id. Une erreur remonte : la part reste sans
 * square_refund_id et le passage périodique la rejoue, sous la même clé
 * d'idempotence — jamais deux remboursements.
 */
async function completeRefund(
  admin: Admin,
  part: { id: string; etablissement_id: string; square_payment_id: string; amount_cents: number }
) {
  const refund = await refundSquare(admin, part.etablissement_id, part.square_payment_id, part.amount_cents);
  const { error } = await admin
    .from("bulle_parts")
    .update({ square_refund_id: refund.refund.id })
    .eq("id", part.id);
  if (error) throw new Error(error.message);
}

/**
 * Rend une part payée en ligne d'une réservation fermée : marquée rendue en
 * base AVANT l'appel à Square, acquise quand Square répond. Une part déjà
 * rendue n'a rien à faire.
 */
export async function refundPart(admin: Admin, partId: string): Promise<void> {
  const { data: part, error } = await admin.rpc("bulle_rembourser_part", { p_part: partId });
  if (error) throw new Error(error.message);
  if (!part?.id) return;
  const paymentId = part.square_payment_id;
  if (paymentId) await completeRefund(admin, { ...part, square_payment_id: paymentId });
  after(() => sendRefundMail(admin, part));
}

/**
 * Rejoue les remboursements restés en route (passage périodique) : les parts
 * payées d'une réservation fermée qu'aucun remboursement n'a encore prises,
 * et celles marquées rendues que Square n'a pas confirmées. Rend les parts
 * qui ont encore échoué.
 */
export async function retryRefunds(admin: Admin): Promise<string[]> {
  const [{ data: unpaid, error: unpaidError }, { data: pending, error: pendingError }] = await Promise.all([
    admin
      .from("bulle_parts")
      .select("id, bulle_reservations!inner(status)")
      .eq("status", "payee")
      .eq("method", "en_ligne")
      .eq("bulle_reservations.status", "remboursee"),
    admin
      .from("bulle_parts")
      .select("id, etablissement_id, square_payment_id, amount_cents")
      .eq("status", "remboursee")
      .not("square_payment_id", "is", null)
      .is("square_refund_id", null),
  ]);
  if (unpaidError) throw new Error(unpaidError.message);
  if (pendingError) throw new Error(pendingError.message);
  const failed: string[] = [];
  const attempt = async (id: string, refund: () => Promise<void>) => {
    try {
      await refund();
    } catch (refundError) {
      const message = refundError instanceof Error ? refundError.message : String(refundError);
      console.error("[bulles] remboursement en attente", { partId: id, message });
      failed.push(id);
    }
  };
  for (const part of unpaid) await attempt(part.id, () => refundPart(admin, part.id));
  for (const part of pending) {
    const paymentId = part.square_payment_id as string;
    await attempt(part.id, () => completeRefund(admin, { ...part, square_payment_id: paymentId }));
  }
  return failed;
}

/**
 * Compte un paiement abouti (squarePaymentId null : démonstration ; paidCents :
 * ce que Square a réellement encaissé). Idempotent : la route de paiement, le
 * webhook et le passage périodique peuvent s'y croiser. Un remboursement que
 * Square refuse ne fait pas échouer le règlement : il reste à rejouer.
 */
export async function settlePart(
  admin: Admin,
  partId: string,
  squarePaymentId: string | null,
  paidCents: number
): Promise<PartOutcome> {
  const { data: before } = await admin
    .from("bulle_parts")
    .select("etablissement_id, bulle_reservations(status)")
    .eq("id", partId)
    .single();
  const { data, error } = await admin.rpc("regler_part_bulle", {
    p_part: partId,
    p_square_payment: squarePaymentId,
    p_amount: paidCents,
  });
  if (error) throw new Error(error.message);
  const result = data as {
    outcome: "paid" | "already_paid" | "refund";
    reason: RefundReason | null;
    confirmed: boolean;
    refunds: string[];
  };

  if (result.outcome === "refund") {
    console.error("[bulles] paiement rendu : il ne pouvait plus compter", { partId, reason: result.reason });
    if (squarePaymentId && before) {
      const part = { id: partId, etablissement_id: before.etablissement_id, square_payment_id: squarePaymentId, amount_cents: paidCents };
      // Un second débit sur une part déjà payée n'a pas de ligne à lui : son
      // remboursement ne se rejoue pas, l'équipe est prévenue s'il échoue.
      await completeRefund(admin, part).catch((refundError: unknown) => {
        const message = refundError instanceof Error ? refundError.message : String(refundError);
        console.error("[bulles] remboursement refusé", { partId, message });
        return raiseAlert("paiement", before.etablissement_id, {
          title: "Bulles : remboursement en attente",
          body: `Paiement ${squarePaymentId} : ${message}`.slice(0, 200),
          url: "/clients",
          urgent: true,
        }).catch(() => false);
      });
    }
    return { paid: false, confirmed: false, refunded: result.reason ?? "mismatch" };
  }

  for (const refund of result.refunds) {
    await refundPart(admin, refund).catch((refundError: unknown) => {
      const message = refundError instanceof Error ? refundError.message : String(refundError);
      console.error("[bulles] remboursement à rejouer", { partId: refund, message });
    });
  }
  const closed = result.reason === "closed";
  const confirmedNow = result.confirmed && before?.bulle_reservations?.status === "en_attente";
  if (result.outcome === "paid" && !closed) after(() => announcePaid(admin, partId, confirmedNow));
  return { paid: !closed, confirmed: result.confirmed, refunded: closed ? "closed" : null };
}
