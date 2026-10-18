import { NextResponse } from "next/server";
import { sendEventChanged } from "@/lib/club/mail";
import { requireClubGerant } from "@/lib/club/server";
import { bookingMail } from "@/lib/club/settle";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Appelée par la gestion après un changement d'horaire d'une soirée : chaque
 * client dont la table tient encore reçoit le nouvel horaire. Un client
 * prévenu ne découvre pas le changement à la porte.
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
  if (!event || event.cancelled_at) {
    return NextResponse.json({ error: "Soirée introuvable." }, { status: 404 });
  }
  const guard = await requireClubGerant(event.etablissement_id);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { data: bookings } = await admin
    .from("club_bookings")
    .select("id")
    .eq("event_id", eventId)
    .in("status", ["payee", "arrivee"]);
  let notified = 0;
  for (const booking of bookings ?? []) {
    const mail = await bookingMail(admin, booking.id);
    if (!mail) continue;
    await sendEventChanged(mail);
    notified += 1;
  }
  return NextResponse.json({ notified });
}
