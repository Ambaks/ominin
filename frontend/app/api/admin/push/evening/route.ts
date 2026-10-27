import { NextResponse } from "next/server";
import { OWNERS } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Le rappel du soir (workflow admin-evening) : les rendez-vous prévus le
 * lendemain dans le CRM, avec leur heure et leur lieu, pour préparer la démo
 * la veille. Ceux des commerciaux (declaration_id) ne sont pas ceux de l'admin.
 */

const timeZone = "Europe/Paris";
/** « 14h30 ». */
const hour = (iso: string) =>
  new Date(iso)
    .toLocaleTimeString("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");
/** « 2026-10-16 » à Paris, pour la date donnée. */
const parisDay = (date: Date) => date.toLocaleDateString("sv-SE", { timeZone });

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const tomorrow = parisDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  // Large fenêtre UTC, puis filtre sur le jour de Paris.
  const { data, error } = await createAdminClient()
    .from("crm_appointments")
    .select("title, start_at, location, crm_restaurants (name)")
    .eq("status", "scheduled")
    .is("declaration_id", null)
    .gte("start_at", new Date(Date.now()).toISOString())
    .lte("start_at", new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString())
    .order("start_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rdvs = data.filter((rdv) => parisDay(new Date(rdv.start_at)) === tomorrow);
  for (const rdv of rdvs) {
    const name = rdv.crm_restaurants?.name ?? rdv.title;
    await notifyOwners(OWNERS, {
      title: `Demain ${hour(rdv.start_at)} · ${name}`,
      body: [rdv.title !== name && rdv.title, rdv.location].filter(Boolean).join(" — "),
      tag: `rdv-${rdv.start_at}`,
      url: "/restaurants",
    });
  }
  return NextResponse.json({ rdvs: rdvs.length });
}
