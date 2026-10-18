import { NextResponse } from "next/server";
import { requireClubGerant } from "@/lib/club/server";
import { refundBooking } from "@/lib/club/settle";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * « Rembourser » depuis la gestion : une table payée en ligne est rendue au
 * client (frais Ominin compris) et le client prévenu par e-mail ; une table
 * saisie par le club est simplement annulée.
 */
export async function POST(request: Request) {
  const { bookingId } = (await request.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("club_bookings")
    .select("etablissement_id, stripe_payment_intent_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }
  const guard = await requireClubGerant(booking.etablissement_id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const outcome = await refundBooking(
    admin,
    booking.stripe_payment_intent_id ? getStripe() : null,
    bookingId,
    { notify: true }
  );
  if (outcome === "not_refundable") {
    return NextResponse.json({ error: "Cette réservation n'est plus active." }, { status: 409 });
  }
  return NextResponse.json({ outcome });
}
