import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Gestion des appareils abonnés aux notifications du membre connecté.
 * Écritures via service_role : l'upsert par endpoint doit pouvoir réattribuer
 * à l'utilisateur courant une ligne posée par un autre compte sur le même
 * appareil (même navigateur, nouvelle session), ce qu'une policy RLS par
 * user_id interdirait. La session et le membership sont vérifiés ici.
 */

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Appareils du membre connecté. */
export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, device_label, created_at, endpoint")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    devices: data.map((row) => ({
      id: row.id,
      deviceLabel: row.device_label,
      createdAt: row.created_at,
      endpoint: row.endpoint,
    })),
  });
}

/** Abonne (ou réabonne) l'appareil courant. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    deviceLabel?: string;
  } | null;
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json(
      { error: "Champs requis : endpoint, p256dh, auth." },
      { status: 400 }
    );
  }

  // Même logique que le store : l'espace de gestion porte le membership le
  // plus ancien de l'utilisateur.
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("memberships")
    .select("etablissement_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json(
      { error: "Aucun établissement associé à ce compte." },
      { status: 403 }
    );
  }

  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      etablissement_id: membership.etablissement_id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      device_label: body.deviceLabel?.slice(0, 80) ?? null,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Désabonne un appareil du membre connecté, par endpoint ou par id. */
export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    endpoint?: string;
    id?: string;
  } | null;
  if (!body?.endpoint && !body?.id) {
    return NextResponse.json(
      { error: "Champ requis : endpoint ou id." },
      { status: 400 }
    );
  }
  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").delete().eq("user_id", user.id);
  query = body.id ? query.eq("id", body.id) : query.eq("endpoint", body.endpoint!);
  const { data, error } = await query.select("endpoint");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, endpoint: data?.[0]?.endpoint ?? null });
}
