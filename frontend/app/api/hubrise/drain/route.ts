import { NextResponse } from "next/server";
import { runCron } from "@/lib/hubrise/sync";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Filet HubRise, appelé toutes les 5 minutes par pg_cron (20261029000010)
 * et de temps à autre par le workflow hubrise-drain.yml : renvoie les
 * commandes pas parties, relit catalogue / stocks / horaires, alerte les
 * commandes que la caisse n'a pas reprises, purge les envois anciens.
 * L'échec du workflow EST le canal d'alerte : la route répond 500 si une
 * relecture a échoué.
 */

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const result = await runCron(createAdminClient());
  return NextResponse.json(result, { status: result.failures.length ? 500 : 200 });
}
