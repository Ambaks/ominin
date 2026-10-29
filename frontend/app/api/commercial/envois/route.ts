import { NextResponse } from "next/server";
import { flushOutbox } from "@/lib/commercial/outbox";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Envoie ce qui attend dans la file des e-mails du contrat, juste après le
 * geste qui l'a remplie (déclaration, décision de l'admin, opposition…).
 * Ouverte aux commerciaux et aux admins connectés : l'envoi est idempotent,
 * l'appeler deux fois n'envoie rien de plus.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  const [{ data: isAdmin }, { data: commercial }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("commerciaux").select("id").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!isAdmin && !commercial) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return NextResponse.json(await flushOutbox(createAdminClient()));
}
