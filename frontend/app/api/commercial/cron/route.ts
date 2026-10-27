import { NextResponse } from "next/server";
import { runDaily } from "@/lib/commercial/daily";
import { createAdminClient } from "@/lib/supabase/admin";

/** Tâche quotidienne de l'espace commercial (workflow commercial-daily). */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }
  return NextResponse.json(await runDaily(createAdminClient()));
}
