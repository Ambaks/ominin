import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Un rendez-vous du commercial au format iCalendar, servi en fichier : Safari
 * iOS ouvre ainsi l'ajout à l'agenda, ce qu'il ne fait pas d'un lien data:.
 * Lu par commercial_appointment (sa déclaration active seulement).
 */

interface Appointment {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  restaurant: string;
}

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export async function GET(_request: Request, { params }: RouteContext<"/api/commercial/rdv/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commercial_appointment", { p_appointment: id });
  if (error) return NextResponse.json({ error: "Réservé au commercial qui suit ce restaurant." }, { status: 403 });
  if (!data) return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  const rdv = data as unknown as Appointment;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ominin//Espace commercial//FR",
    "BEGIN:VEVENT",
    `UID:${rdv.id}@ominin`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(rdv.start_at)}`,
    `DTEND:${icsDate(rdv.end_at ?? rdv.start_at)}`,
    `SUMMARY:${icsText(`${rdv.title} · ${rdv.restaurant}`)}`,
    ...(rdv.location ? [`LOCATION:${icsText(rdv.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rendez-vous-${rdv.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
