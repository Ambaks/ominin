import { NextResponse } from "next/server";
import type { CatalogSnapshot } from "@/lib/hubrise/catalog";
import { syncAll } from "@/lib/hubrise/sync";
import { getConnection } from "@/lib/hubrise/connection";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Correspondances carte ↔ catalogue de la caisse. GET → instantané du
 * catalogue et correspondances. PUT → relie (ou délie) un article ou un
 * choix. POST → relit tout chez HubRise (catalogue, stocks, horaires).
 * Gérant seulement : ces codes décident ce que la caisse reçoit.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const [connection, { data: refs }] = await Promise.all([
    getConnection(admin, auth.etablissementId),
    admin
      .from("hubrise_ref_map")
      .select("item_id, group_id, choice_id, target, ref, hubrise_name, matched_by")
      .eq("etablissement_id", auth.etablissementId),
  ]);
  if (!connection) {
    return NextResponse.json({ error: "HubRise n'est pas relié." }, { status: 409 });
  }
  return NextResponse.json({
    snapshot: (connection.catalog_snapshot as unknown as CatalogSnapshot | null) ?? {
      skus: [],
      options: [],
    },
    syncedAt: connection.catalog_synced_at,
    refs: (refs ?? []).map((row) => ({
      itemId: row.item_id,
      groupId: row.group_id,
      choiceId: row.choice_id,
      ref: row.ref,
      name: row.hubrise_name,
      matchedBy: row.matched_by,
    })),
  });
}

export async function PUT(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const body = (await request.json().catch(() => ({}))) as {
    itemId?: string;
    groupId?: string | null;
    choiceId?: string | null;
    ref?: string | null;
  };
  if (!body.itemId || (body.groupId == null) !== (body.choiceId == null)) {
    return NextResponse.json({ error: "Article ou choix manquant." }, { status: 400 });
  }
  const groupId = body.groupId ?? null;
  const choiceId = body.choiceId ?? null;

  const admin = createAdminClient();
  const [connection, { data: item }] = await Promise.all([
    getConnection(admin, auth.etablissementId),
    admin
      .from("items")
      .select("id")
      .eq("id", body.itemId)
      .eq("etablissement_id", auth.etablissementId)
      .maybeSingle(),
  ]);
  if (!connection || !item) {
    return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
  }

  let query = admin.from("hubrise_ref_map").delete().eq("item_id", body.itemId);
  query = groupId ? query.eq("group_id", groupId).eq("choice_id", choiceId!) : query.is("choice_id", null);
  const { error: deleteError } = await query;
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  if (!body.ref) return NextResponse.json({ ok: true });

  // Le code doit exister dans le catalogue de la caisse : jamais un code saisi à l'aveugle.
  const snapshot = connection.catalog_snapshot as unknown as CatalogSnapshot | null;
  const entry = choiceId
    ? snapshot?.options.find((option) => option.ref === body.ref)
    : snapshot?.skus.find((sku) => sku.ref === body.ref);
  if (!entry) {
    return NextResponse.json({ error: "Code absent du catalogue de la caisse." }, { status: 400 });
  }
  const listName = "listName" in entry ? entry.listName : null;
  const { error } = await admin.from("hubrise_ref_map").insert({
    etablissement_id: auth.etablissementId,
    item_id: body.itemId,
    group_id: groupId,
    choice_id: choiceId,
    target: choiceId ? "option" : "sku",
    ref: body.ref,
    option_list_name: listName,
    hubrise_name:
      "listName" in entry
        ? `${entry.listName} — ${entry.name}`
        : [entry.product, entry.name].filter(Boolean).join(" — "),
    matched_by: "manual",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const connection = await getConnection(admin, auth.etablissementId);
  if (!connection) {
    return NextResponse.json({ error: "HubRise n'est pas relié." }, { status: 409 });
  }
  const failures = await syncAll(admin, connection);
  if (failures.length) {
    return NextResponse.json({ error: failures.join(" · ") }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
