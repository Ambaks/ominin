import { NextResponse } from "next/server";
import { publicRequestOrigin } from "@/lib/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireGerant } from "@/lib/supabase/gerant";
import { VIVA_SELF_ONBOARDING, vivaOnboardingLink, vivaStatus } from "@/lib/viva/server";

/*
 * Compte Viva du restaurant, pour le réglage d'encaissement (pendant Viva de
 * /api/stripe/connect).
 * GET  → état du compte, relu chez Viva tant qu'il ne peut pas encaisser
 *        (le gérant revient peut-être du parcours d'ouverture).
 * POST → lien d'ouverture du compte, créé au besoin (mode ISV seulement : en
 *        mode marchand, Ominin relie le compte à la main).
 */

export async function GET(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  try {
    const status = await vivaStatus(admin, auth.etablissementId, publicRequestOrigin(request));
    return NextResponse.json({ ...status, selfServe: VIVA_SELF_ONBOARDING });
  } catch (error) {
    // Viva injoignable : l'état enregistré, sans relecture.
    console.error("[viva] compte illisible", {
      etablissementId: auth.etablissementId,
      message: error instanceof Error ? error.message : String(error),
    });
    const { data } = await admin
      .from("viva_accounts")
      .select("merchant_id, verified, source_code")
      .eq("etablissement_id", auth.etablissementId)
      .maybeSingle();
    return NextResponse.json({
      connected: Boolean(data),
      onboarded: Boolean(data?.merchant_id),
      verified: Boolean(data?.verified && data.merchant_id && data.source_code),
      selfServe: VIVA_SELF_ONBOARDING,
    });
  }
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!VIVA_SELF_ONBOARDING) {
    return NextResponse.json({ error: "Ominin relie votre compte Viva : contactez-nous." }, { status: 409 });
  }
  if (!auth.email) {
    return NextResponse.json({ error: "Votre compte n'a pas d'adresse e-mail." }, { status: 409 });
  }
  try {
    const url = await vivaOnboardingLink(createAdminClient(), {
      etablissementId: auth.etablissementId,
      email: auth.email,
      returnUrl: `${publicRequestOrigin(request)}/gestion/etablissement?viva=retour`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[viva] ouverture de compte impossible", { etablissementId: auth.etablissementId, message });
    return NextResponse.json({ error: `Viva : ${message}` }, { status: 502 });
  }
}
