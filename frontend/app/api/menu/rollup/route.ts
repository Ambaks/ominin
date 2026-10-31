import { NextResponse } from "next/server";
import {
  ITEM_CLICK_RETENTION_DAYS,
  SESSION_RETENTION_DAYS,
} from "@/lib/menu/analytics/constants";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Consolidation nocturne de l'analytique du menu (workflow menu-rollup.yml) :
 * les visites des jours révolus passent dans menu_stats_daily avant que la
 * purge ne les retire. Sans ce passage, l'entonnoir d'un restaurant ne remonte
 * pas au-delà de la rétention des visites.
 */

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const { data: days, error } = await createAdminClient().rpc("menu_rollup", {
    p_session_ttl_days: SESSION_RETENTION_DAYS,
    p_click_ttl_days: ITEM_CLICK_RETENTION_DAYS,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ days });
}
