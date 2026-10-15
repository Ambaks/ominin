import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/owners";
import { notifyOwners } from "@/lib/admin/push";
import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Appareils de l'admin abonnés aux notifications : la liste des siens, l'ajout
 * (avec « qui je suis »), le retrait, et une notification d'essai (PUT).
 */

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await createAdminClient()
    .from("admin_push_subscriptions")
    .select("id, owner, device_label, endpoint, created_at")
    .eq("user_id", auth.userId)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices: data });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    deviceLabel?: string;
    owner?: string;
  } | null;
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: "Abonnement incomplet." }, { status: 400 });
  }
  if (!isOwner(body.owner)) {
    return NextResponse.json({ error: "Choisissez qui vous êtes." }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from("admin_push_subscriptions")
    .upsert(
      {
        user_id: auth.userId,
        owner: body.owner,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
        device_label: body.deviceLabel ?? null,
      },
      { onConflict: "endpoint" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Appareil manquant." }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from("admin_push_subscriptions")
    .delete()
    .eq("user_id", auth.userId)
    .eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Notification d'essai vers les appareils de la personne choisie. */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as { owner?: string } | null;
  if (!isOwner(body?.owner)) {
    return NextResponse.json({ error: "Choisissez qui vous êtes." }, { status: 400 });
  }
  await notifyOwners([body.owner], {
    title: "Ominin Admin",
    body: "Les notifications du suivi arrivent bien sur cet appareil.",
    tag: "essai",
    url: "/projet",
  });
  return NextResponse.json({ ok: true });
}
