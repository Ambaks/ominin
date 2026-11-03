import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";

/*
 * Statut du compte Viva du restaurant, pour le réglage d'encaissement
 * (pendant Viva de GET /api/square/connect). Ominin ouvre et relie le
 * compte : il n'y a ni autorisation à demander ni point de vente à choisir,
 * seulement savoir s'il est relié et vérifié.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: account } = await createAdminClient()
    .from("viva_accounts")
    .select("verified, source_code")
    .eq("etablissement_id", auth.etablissementId)
    .maybeSingle();
  return NextResponse.json({
    connected: Boolean(account),
    verified: Boolean(account?.verified && account.source_code),
  });
}
