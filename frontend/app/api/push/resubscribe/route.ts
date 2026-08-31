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

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .update({ endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth })
    .eq("endpoint", body.oldEndpoint);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
