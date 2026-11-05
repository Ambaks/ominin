import { NextResponse } from "next/server";
import { flushClubNotifications } from "@/lib/club/notify-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Appelée par la gestion après un geste sur une réservation (saisie,
 * annulation, changement de table), une fois la fonction SQL passée. Les
 * événements sont déjà écrits en base par les déclencheurs : cette route ne
 * fait que relever la file du club et envoyer. Elle ne croit le navigateur
 * sur rien (ni l'événement, ni son contenu) : la rappeler n'envoie rien de
 * plus. Réservée à un membre du club de la réservation.
 */
export async function POST(request: Request) {
  const { bookingId } = (await request.json().catch(() => ({}))) as { bookingId?: string };
  if (!bookingId) {
    return NextResponse.json({ error: "Réservation manquante." }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  // La policy de lecture des réservations ne laisse voir que celles de ses clubs.
  const { data: booking } = await supabase
    .from("club_bookings")
    .select("etablissement_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });

  await flushClubNotifications(createAdminClient(), booking.etablissement_id);
  return NextResponse.json({ ok: true }, { status: 202 });
}
