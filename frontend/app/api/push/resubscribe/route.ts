import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Rotation d'abonnement (pushsubscriptionchange) : le service worker remplace
 * son ancien endpoint par le nouveau. Pas de session en contexte worker —
 * la possession de l'ancien endpoint (URL de capacité non devinable) vaut
 * preuve ; sans ligne correspondante, la requête ne fait rien.
 */

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    oldEndpoint?: string;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
  } | null;
  if (!body?.oldEndpoint || !body.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json(
      { error: "Champs requis : oldEndpoint, endpoint, p256dh, auth." },
      { status: 400 }
    );
  }

  // Le même service worker sert la gestion et l'admin : l'ancien endpoint est
  // dans l'une des deux tables.
  const admin = createAdminClient();
  const keys = { endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth };
  const results = await Promise.all([
    admin.from("push_subscriptions").update(keys).eq("endpoint", body.oldEndpoint),
    admin.from("admin_push_subscriptions").update(keys).eq("endpoint", body.oldEndpoint),
  ]);
  const error = results.find((result) => result.error)?.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
