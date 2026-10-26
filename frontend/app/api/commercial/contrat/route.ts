import { NextResponse } from "next/server";
import { signedContractResponse } from "@/lib/commercial/pdf";
import { latestCommercialSignature } from "@/lib/legal/commercial";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Exemplaire PDF de la dernière signature du commercial connecté. Sa fiche se
 * lit sous RLS ; le relevé, écrit par le service_role, se lit avec lui.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { data: commercial, error } = await supabase
    .from("commerciaux")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const signature = commercial
    ? await latestCommercialSignature(createAdminClient(), commercial.id)
    : null;
  if (!signature) {
    return NextResponse.json({ error: "Aucun contrat signé." }, { status: 404 });
  }
  return signedContractResponse(signature);
}
