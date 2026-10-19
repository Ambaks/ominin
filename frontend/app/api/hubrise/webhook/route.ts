import { NextResponse } from "next/server";
import { verifyCallbackSignature } from "@/lib/hubrise/client";
import { handleEvent, type HubriseEvent } from "@/lib/hubrise/events";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Callbacks HubRise : statut et heure confirmée de nos commandes, puis
 * catalogue, stocks et horaires. La signature (X-HubRise-Hmac-SHA256) se
 * vérifie sur le corps BRUT avant tout parse. HubRise attend une réponse 200
 * à 499 sous 20 s ; sur 5xx ou délai dépassé il renvoie (6 fois, puis
 * abandonne) — les traitements sont donc rejouables. Un événement inconnu ou
 * orphelin reçoit 200 : rien à rejouer.
 */

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyCallbackSignature(rawBody, request.headers.get("x-hubrise-hmac-sha256"))) {
    console.error("[hubrise] signature de callback invalide");
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let event: HubriseEvent;
  try {
    event = JSON.parse(rawBody) as HubriseEvent;
  } catch {
    return NextResponse.json({ error: "Corps illisible." }, { status: 400 });
  }

  try {
    await handleEvent(createAdminClient(), event);
  } catch (error) {
    console.error("[hubrise] callback non traité", {
      resource: event.resource_type,
      message: error instanceof Error ? error.message : String(error),
    });
    // 500 : HubRise renverra, ce qu'on veut d'un échec transitoire.
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
