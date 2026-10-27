import { NextResponse } from "next/server";
import { PopinaError, verifyWebhookSignature } from "@/lib/popina/client";
import { importOne, markBlocked } from "@/lib/popina/sync";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Webhooks Popina. Seules comptent les ventes closes (réglée, annulée,
 * transférée) : la vente est relue par l'API, qui dit aussi si elle vient de
 * nous par HubRise, puis importée. Le webhook apporte la table, que l'API ne
 * rend pas. La signature (x-popina-hmac-signature) se vérifie sur le corps
 * BRUT. Popina attend un 200 sous 30 s, sinon renvoie trois fois : l'import
 * est rejouable. Lieu inconnu, clé refusée, vente introuvable : 200, rien
 * qu'un renvoi réparerait.
 */

const CLOSING_EVENTS = new Set(["order.paid", "order.canceled", "order.transferred"]);

interface WebhookEvent {
  meta?: { event?: string };
  data?: { id?: string; locationId?: string; tableName?: string | null };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-popina-hmac-signature"))) {
    console.error("[popina] signature de webhook invalide");
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Corps illisible." }, { status: 400 });
  }
  const orderId = event.data?.id;
  if (!CLOSING_EVENTS.has(event.meta?.event ?? "") || !orderId || !event.data?.locationId) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: connection, error: lookupError } = await admin
    .from("popina_connections")
    .select("etablissement_id, api_key, last_failed_at")
    .eq("location_id", event.data.locationId)
    .maybeSingle();
  if (lookupError) {
    console.error("[popina] connexion illisible", { message: lookupError.message });
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  if (!connection || connection.last_failed_at) return NextResponse.json({ received: true });

  try {
    await importOne(admin, connection, orderId, event.data.tableName ?? null);
    await admin
      .from("popina_connections")
      .update({ last_sale_at: new Date().toISOString() })
      .eq("etablissement_id", connection.etablissement_id);
  } catch (error) {
    if (error instanceof PopinaError && (error.status === 401 || error.status === 404)) {
      if (error.status === 401) await markBlocked(admin, connection.etablissement_id);
      console.error("[popina] vente non relue", { orderId, message: error.message });
      return NextResponse.json({ received: true });
    }
    console.error("[popina] webhook non traité", {
      event: event.meta?.event,
      message: error instanceof Error ? error.message : String(error),
    });
    // 500 : Popina renverra, ce qu'on veut d'un échec transitoire.
    return NextResponse.json({ error: "Traitement impossible." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
