import { NextResponse } from "next/server";
import { settleOffreTrial } from "@/lib/offre/settle";
import { createClient } from "@/lib/supabase/server";

/*
 * Rend le verdict des mois offerts de l'établissement du membre connecté.
 * Le chiffre d'affaires ne se compte que côté serveur (service_role) : le
 * navigateur demande le verdict, il ne le calcule ni ne le propose.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 }
    );
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json(
      { error: "Aucun établissement." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    feeExempt: await settleOffreTrial(membership.etablissement_id),
  });
}
