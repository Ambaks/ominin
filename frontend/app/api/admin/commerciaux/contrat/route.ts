import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/server";
import { signedContractResponse } from "@/lib/commercial/pdf";
import { latestCommercialSignature } from "@/lib/legal/commercial";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Exemplaire PDF de la dernière signature d'un commercial (?id=commerciaux.id). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !UUID.test(id)) {
    return NextResponse.json({ error: "Identifiant de commercial invalide." }, { status: 400 });
  }

  const signature = await latestCommercialSignature(createAdminClient(), id);
  if (!signature) {
    return NextResponse.json({ error: "Aucun contrat signé." }, { status: 404 });
  }
  return signedContractResponse(signature);
}
