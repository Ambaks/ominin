import { NextResponse } from "next/server";
import { commercialAccount } from "@/lib/commercial/session";
import { visitDetails, visitMessage, type VisitInput } from "@/lib/commercial/visit";
import { postDiscord } from "@/lib/discord";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/*
 * Enregistre une visite (commercial_visit vérifie le compte et le restaurant),
 * puis l'annonce dans #terrain ; tout ce qu'elle a noté part dans
 * #inscriptions. Un Discord muet ne défait pas la visite.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { restaurantId?: string; visit?: VisitInput } | null;
  if (!body?.restaurantId || !body.visit) {
    return NextResponse.json({ error: "Visite incomplète." }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("commercial_visit", {
    p_restaurant: body.restaurantId,
    p: body.visit as unknown as Json,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const [account, { data: place }] = await Promise.all([
    commercialAccount(),
    supabase.rpc("commercial_map", { p_restaurant: body.restaurantId }).maybeSingle(),
  ]);
  if (account && place) {
    const commercial = account.first_name ?? account.email;
    const posts = [
      postDiscord("terrain", visitMessage(commercial, place.name, body.visit.outcome)),
      postDiscord("inscriptions", visitDetails(commercial, place.name, place.address, body.visit)),
    ];
    for (const result of await Promise.allSettled(posts)) {
      if (result.status === "rejected") console.error("[discord] visite non annoncée", result.reason);
    }
  }
  return NextResponse.json({ ok: true });
}
