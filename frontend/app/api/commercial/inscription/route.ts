import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Le commercial lance l'inscription d'un restaurant (ou reprend la sienne) : rend le jeton du questionnaire. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { restaurantId?: string } | null;
  if (!body?.restaurantId) return NextResponse.json({ error: "Restaurant manquant." }, { status: 400 });
  const { data, error } = await (await createClient()).rpc("commercial_start_signup", { p_restaurant: body.restaurantId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data });
}
