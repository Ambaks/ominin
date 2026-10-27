import { NextResponse } from "next/server";
import { notifyCommercial } from "@/lib/commercial/push";
import { commercialPrefix } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Rappel push d'un rendez-vous de commercial, APPOINTMENT_REMINDER_MINUTES
 * (réglage) avant son heure, une fois : commercial_appointment_reminders
 * choisit et marque les rendez-vous (déclaration active, contrat en cours).
 * À appeler souvent, avec X-Cron-Secret : la fréquence du déclencheur est à
 * décider (voir docs/espace-commercial-suivi.md).
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: due, error } = await admin.rpc("commercial_appointment_reminders");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const rdv of due) {
    await notifyCommercial(admin, rdv.commercial_id, "rdv", {
      title: `${new Date(rdv.start_at).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} · ${rdv.name}`,
      body: rdv.title,
      tag: `commercial-rdv-${rdv.id}`,
      url: `${commercialPrefix}/espace/restaurants/${rdv.restaurant_id}`,
    });
  }
  return NextResponse.json({ reminded: due.length });
}
