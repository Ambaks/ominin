import { NextResponse } from "next/server";
import { notifyCommercial } from "@/lib/commercial/push";
import { commercialPrefix } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const MINUTE_MS = 60 * 1000;

/*
 * Rappel push d'un rendez-vous de commercial, APPOINTMENT_REMINDER_MINUTES
 * (réglage) avant son heure, une fois (crm_appointments.reminded_at). À
 * appeler souvent, avec X-Cron-Secret : la fréquence du déclencheur est à
 * décider (voir docs/espace-commercial-suivi.md).
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: settings, error } = await admin.from("commercial_settings").select("appointment_reminder_minutes").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!settings.appointment_reminder_minutes) return NextResponse.json({ reminded: 0 });

  const { data: due, error: dueError } = await admin
    .from("crm_appointments")
    .select("id, title, start_at, crm_restaurants(name), commercial_declarations!inner(commercial_id, restaurant_id)")
    .eq("status", "scheduled")
    .is("reminded_at", null)
    .gte("start_at", new Date().toISOString())
    .lte("start_at", new Date(Date.now() + settings.appointment_reminder_minutes * MINUTE_MS).toISOString());
  if (dueError) return NextResponse.json({ error: dueError.message }, { status: 500 });

  for (const rdv of due) {
    const { data: claimed } = await admin
      .from("crm_appointments")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", rdv.id)
      .is("reminded_at", null)
      .select("id");
    if (!claimed?.length) continue;
    await notifyCommercial(admin, rdv.commercial_declarations.commercial_id, "rdv", {
      title: `${new Date(rdv.start_at).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} · ${rdv.crm_restaurants?.name ?? rdv.title}`,
      body: rdv.title,
      tag: `commercial-rdv-${rdv.id}`,
      url: `${commercialPrefix}/espace/restaurants/${rdv.commercial_declarations.restaurant_id}`,
    });
  }
  return NextResponse.json({ reminded: due.length });
}
