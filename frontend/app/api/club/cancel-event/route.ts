import { NextResponse } from "next/server";
import { bookingRecipients, refundBooking } from "@/lib/club/settle";
import { sendEventCancelled } from "@/lib/club/mail";
import { requireClubGerant } from "@/lib/club/server";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/*
 * Le club annule une soirée : elle reste visible, marquée annulée, et
 * chaque table est rendue d'office — remboursée si elle a été payée en
 * ligne, annulée sinon — avec un e-mail au client. Personne n'a à réclamer
 * son argent. Rejouable : un remboursement qui échoue (Stripe indisponible)
 * est rapporté, et un nouvel appel ne traite que ce qui reste actif.
 */
export async function POST(request: Request) {
  const { eventId } = (await request.json().catch(() => ({}))) as { eventId?: string };
  if (!eventId) {
    return NextResponse.json({ error: "Soirée manquante." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("club_events")
    .select("etablissement_id, cancelled_at")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Soirée introuvable." }, { status: 404 });
  }
  const guard = await requireClubGerant(event.etablissement_id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  if (!event.cancelled_at) {
    const { error } = await admin
      .from("club_events")
      .update({ cancelled_at: new Date().toISOString(), guest_list_open: false })
      .eq("id", eventId);
    if (error) throw new Error(error.message);
  }

  // Les tables qui tiennent encore — payées, arrivées, saisies par le club,
  // en cours de paiement dans leur délai — et celles déjà closes dont un
  // remboursement a échoué (relance). Un paiement abandonné ne reçoit pas
  // d'e-mail ; s'il aboutissait, settleClubIntent le rendrait.
  const now = new Date().toISOString();
  const [{ data: active }, { data: unrefunded }] = await Promise.all([
    admin
      .from("club_bookings")
      .select("id")
      .eq("event_id", eventId)
      .or(`status.in.(payee,arrivee),and(status.eq.en_attente,or(hold_expires_at.is.null,hold_expires_at.gt.${now}))`),
    admin
      .from("club_payments")
      .select("booking_id, club_bookings!inner(event_id)")
      .eq("club_bookings.event_id", eventId)
      .eq("method", "en_ligne")
      .eq("status", "payee"),
  ]);
  const bookings = [
    ...new Set([...(active ?? []).map((row) => row.id), ...(unrefunded ?? []).map((row) => row.booking_id)]),
  ].map((id) => ({ id }));
  const stripe = bookings.length ? getStripe() : null;

  // En parallèle : au plus une réservation par table du club.
  const results = await Promise.all(
    bookings.map(async (booking) => {
      try {
        // Qui prévenir se lit avant de rendre l'argent : remboursés, leurs
        // paiements ne comptent plus parmi ceux qui tiennent la table.
        const mails = await bookingRecipients(admin, booking.id);
        const outcome = await refundBooking(admin, stripe, booking.id, { notify: false });
        if (outcome !== "not_refundable") {
          await Promise.all(mails.map((mail) => sendEventCancelled(mail, outcome === "refunded")));
        }
        return { id: booking.id, outcome };
      } catch (error) {
        console.error("[club] remboursement à l'annulation", { bookingId: booking.id, error });
        return { id: booking.id, outcome: "failed" as const };
      }
    })
  );
  return NextResponse.json({
    refunded: results.filter((result) => result.outcome === "refunded").length,
    cancelled: results.filter((result) => result.outcome === "cancelled").length,
    failed: results.filter((result) => result.outcome === "failed").map((result) => result.id),
  });
}
