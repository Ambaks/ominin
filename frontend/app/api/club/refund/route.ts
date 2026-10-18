import { NextResponse } from "next/server";
import { requireClubGerant } from "@/lib/club/server";
import { refundBooking, refundPayment } from "@/lib/club/settle";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * « Rembourser » depuis la gestion : toute la table (bookingId) — chaque
 * paiement en ligne rendu, frais Ominin compris, et chaque payeur prévenu —
 * ou une seule part d'une table partagée (paymentId), quand un ami se
 * désiste. Une table saisie par le club est simplement annulée.
 */
export async function POST(request: Request) {
  const { bookingId, paymentId } = (await request.json().catch(() => ({}))) as {
    bookingId?: string;
    paymentId?: string;
  };
  if (!bookingId && !paymentId) {
    return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: target } = paymentId
    ? await admin.from("club_payments").select("etablissement_id").eq("id", paymentId).maybeSingle()
    : await admin.from("club_bookings").select("etablissement_id").eq("id", bookingId!).maybeSingle();
  if (!target) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }
  const guard = await requireClubGerant(target.etablissement_id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  if (paymentId) {
    const refunded = await refundPayment(admin, getStripe(), paymentId, { notify: true });
    if (!refunded) {
      return NextResponse.json({ error: "Cette part n'est plus à rembourser." }, { status: 409 });
    }
    return NextResponse.json({ outcome: "refunded" });
  }
  const outcome = await refundBooking(admin, getStripe(), bookingId!, { notify: true });
  if (outcome === "not_refundable") {
    return NextResponse.json({ error: "Cette réservation n'est plus active." }, { status: 409 });
  }
  return NextResponse.json({ outcome });
}
