import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Ouvre l'espace de gestion d'un restaurant inscrit avec un commercial, une
 * fois son menu créé par l'équipe : l'offre devient active, sans paiement
 * (l'inscription n'en demande aucun). subscriptions n'est écrite que par la
 * clé service.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await request.json().catch(() => null)) as { etablissementId?: string } | null;
  if (!body?.etablissementId) return NextResponse.json({ error: "Établissement manquant." }, { status: 400 });

  const admin = createAdminClient();
  const { data: signup } = await admin.from("commercial_signups").select("id").eq("etablissement_id", body.etablissementId).maybeSingle();
  if (!signup) return NextResponse.json({ error: "Ce restaurant n’a pas été inscrit par un commercial." }, { status: 404 });
  const { error } = await admin
    .from("subscriptions")
    .upsert(
      { etablissement_id: body.etablissementId, product: "offre", status: "active", fee_exempt: true, updated_at: new Date().toISOString() },
      { onConflict: "etablissement_id,product" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
