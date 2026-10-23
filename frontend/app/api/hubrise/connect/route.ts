import { NextResponse } from "next/server";
import { HUBRISE_STATE_COOKIE, hubriseAuthorizeUrl, revokeToken } from "@/lib/hubrise/client";
import { HUBRISE } from "@/lib/hubrise/config";
import { callHubrise, getConnection } from "@/lib/hubrise/connection";
import { publicRequestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Connexion du lieu HubRise du restaurant (pendant HubRise de
 * /api/square/connect). GET → statut, POST → URL d'autorisation OAuth avec
 * state anti-CSRF en cookie httpOnly, PATCH → réglages de la caisse,
 * DELETE → déconnexion (callback retiré, jeton révoqué). Le jeton ne
 * transite jamais par le navigateur.
 */

const TILL_FIELDS = {
  paymentRef: "payment_ref",
  paymentName: "payment_name",
  paymentRefCash: "payment_ref_cash",
  paymentRefCard: "payment_ref_card",
  serviceTypeRefEatIn: "service_type_ref_eat_in",
  serviceTypeRefCollection: "service_type_ref_collection",
  tipChargeRef: "tip_charge_ref",
} as const;

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const connection = await getConnection(admin, auth.etablissementId);
  if (!connection) return NextResponse.json({ connected: false });

  const [{ data: outbox }, { count: items }, { count: mapped }] = await Promise.all([
    admin
      .from("hubrise_outbox")
      .select("status")
      .eq("etablissement_id", auth.etablissementId)
      .in("status", ["pending", "blocked", "dead"]),
    admin
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("etablissement_id", auth.etablissementId),
    admin
      .from("hubrise_ref_map")
      .select("id", { count: "exact", head: true })
      .eq("etablissement_id", auth.etablissementId)
      .is("choice_id", null),
  ]);
  const count = (status: string) =>
    (outbox ?? []).filter((row) => row.status === status).length;

  return NextResponse.json({
    connected: true,
    blocked: connection.last_failed_at !== null,
    accountName: connection.account_name,
    locationName: connection.location_name,
    locationId: connection.location_id,
    catalogName: connection.catalog_name,
    catalogId: connection.catalog_id,
    customerListName: connection.customer_list_name,
    customerListId: connection.customer_list_id,
    callbackRegistered: connection.callback_registered_at !== null,
    syncedAt: {
      catalog: connection.catalog_synced_at,
      inventory: connection.inventory_synced_at,
      hours: connection.hours_synced_at,
    },
    hoursNote: connection.hours_note,
    till: {
      paymentRef: connection.payment_ref,
      paymentName: connection.payment_name,
      paymentRefCash: connection.payment_ref_cash,
      paymentRefCard: connection.payment_ref_card,
      serviceTypeRefEatIn: connection.service_type_ref_eat_in,
      serviceTypeRefCollection: connection.service_type_ref_collection,
      tipChargeRef: connection.tip_charge_ref,
    },
    outbox: {
      pending: count("pending"),
      blocked: count("blocked"),
      dead: count("dead"),
    },
    mapping: { mapped: mapped ?? 0, total: items ?? 0 },
  });
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const origin = publicRequestOrigin(request);
  const state = crypto.randomUUID();
  const response = NextResponse.json({
    url: hubriseAuthorizeUrl(state, `${origin}/api/hubrise/callback`),
  });
  response.cookies.set(HUBRISE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    maxAge: HUBRISE.oauthStateTtlS,
    path: "/api/hubrise",
  });
  return response;
}

/** Codes que la caisse du restaurant attend : un champ vide efface le réglage. */
export async function PATCH(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: TablesUpdate<"hubrise_connections"> = {};
  for (const [field, column] of Object.entries(TILL_FIELDS)) {
    const value = body[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return NextResponse.json({ error: "Réglage invalide." }, { status: 400 });
    }
    update[column] = value?.trim() ? value.trim() : null;
  }
  const { error } = await createAdminClient()
    .from("hubrise_connections")
    .update(update)
    .eq("etablissement_id", auth.etablissementId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const connection = await getConnection(admin, auth.etablissementId);
  if (!connection) return NextResponse.json({ ok: true });

  // Retirer le callback puis révoquer : au mieux, la ligne disparaît quoi qu'il arrive.
  await callHubrise(admin, connection, "/callback", { method: "DELETE" }).catch(() => null);
  await revokeToken(connection.access_token).catch(() => null);
  const { error } = await admin
    .from("hubrise_connections")
    .delete()
    .eq("etablissement_id", auth.etablissementId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
