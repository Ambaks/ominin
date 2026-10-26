import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Appareils du commercial abonnés aux notifications (worker
 * public/commercial-sw.js) : ajout et retrait. La fiche se lit par la session,
 * l'écriture passe par la clé service (la table n'a pas de policy).
 */

async function commercialId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("commercial_account");
  return (data as { id?: string } | null)?.id ?? null;
}

export async function POST(request: Request) {
  const id = await commercialId();
  if (!id) return NextResponse.json({ error: "Réservé aux commerciaux d'Ominin." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string; p256dh?: string; auth?: string } | null;
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: "Abonnement incomplet." }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from("commercial_push_subscriptions")
    .upsert(
      { commercial_id: id, endpoint: body.endpoint, p256dh: body.p256dh, auth: body.auth },
      { onConflict: "endpoint" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = await commercialId();
  if (!id) return NextResponse.json({ error: "Réservé aux commerciaux d'Ominin." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ error: "Appareil inconnu." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("commercial_push_subscriptions")
    .delete()
    .eq("commercial_id", id)
    .eq("endpoint", body.endpoint);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
