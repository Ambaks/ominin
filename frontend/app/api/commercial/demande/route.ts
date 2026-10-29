import { NextResponse } from "next/server";
import { announceRequest } from "@/lib/commercial/requests";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Un commercial demande un restaurant suivi par un autre
 * (commercial_request_visit vérifie tout), puis la demande part dans
 * #demandes. Un Discord muet ne défait pas la demande.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { restaurantId?: string } | null;
  if (!body?.restaurantId) return NextResponse.json({ error: "Restaurant manquant." }, { status: 400 });
  const { data: id, error } = await (await createClient()).rpc("commercial_request_visit", { p_restaurant: body.restaurantId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  try {
    await announceRequest(createAdminClient(), id);
  } catch (cause) {
    console.error("[discord] demande non annoncée", cause);
  }
  return NextResponse.json({ ok: true });
}
