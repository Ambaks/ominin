import { NextResponse } from "next/server";
import { reconcileAll } from "@/lib/popina/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/*
 * Filet du workflow popina-reconcile.yml : relit les ventes récentes de
 * chaque caisse. L'échec du workflow EST le canal d'alerte : la route répond
 * 500 si une relecture a échoué.
 */

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const result = await reconcileAll(createAdminClient());
  return NextResponse.json(result, { status: result.failures.length ? 500 : 200 });
}
