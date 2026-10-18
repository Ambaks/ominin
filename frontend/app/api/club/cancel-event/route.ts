import { NextResponse } from "next/server";
import { bookingMail, refundBooking } from "@/lib/club/settle";
import { sendEventCancelled } from "@/lib/club/mail";
import { requireClubGerant } from "@/lib/club/server";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le club annule une soirée : elle reste visible, marquée annulée, et
 * chaque table est rendue d'office — remboursée si elle a été payée en
 * ligne, annulée sinon — avec un e-mail au client. Personne n'a à réclamer
 * son argent.
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

  const { data: bookings } = await admin
    .from("club_bookings")
    .select("id, stripe_payment_intent_id")
    .eq("event_id", eventId)
    .in("status", ["en_attente", "payee", "arrivee"]);
  const stripe = bookings?.some((booking) => booking.stripe_payment_intent_id) ? getStripe() : null;
  let refunded = 0;
  for (const booking of bookings ?? []) {
    const outcome = await refundBooking(admin, stripe, booking.id, { notify: false });
    if (outcome === "not_refundable") continue;
    if (outcome === "refunded") refunded += 1;
    const mail = await bookingMail(admin, booking.id);
    if (mail) await sendEventCancelled(mail, outcome === "refunded");
  }
  return NextResponse.json({ refunded, released: bookings?.length ?? 0 });
}
