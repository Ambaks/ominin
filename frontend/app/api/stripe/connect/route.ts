import { NextResponse } from "next/server";
import { connectOnboardingLink, connectStatus } from "@/lib/stripe/connect";
import { getStripe, requireGerant } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Stripe Connect pour le paiement à table : chaque restaurant relie son
 * compte Express (l'argent des additions lui revient directement).
 * GET  → état du compte (rafraîchi depuis Stripe).
 * POST → crée le compte si besoin puis renvoie un lien d'onboarding.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  return NextResponse.json(await connectStatus(createAdminClient(), getStripe(), auth.etablissementId));
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  // Retour sur l'hôte qui a lancé l'onboarding : la session y est attachée
  // (l'espace de gestion est aussi servi par collect). request.url peut
  // porter le host interne (routage Vercel), d'où l'en-tête transmis.
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const origin = `${requestUrl.protocol}//${host}`;

  // Un refus de Stripe doit remonter en clair dans le toast du gérant : un
  // 500 nu (corps non JSON) n'est pas lisible par le navigateur.
  try {
    const url = await connectOnboardingLink(createAdminClient(), getStripe(), {
      etablissementId: auth.etablissementId,
      email: auth.email,
      refreshUrl: `${origin}/gestion/etablissement?stripe=recommencer`,
      returnUrl: `${origin}/gestion/etablissement?stripe=retour`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe] onboarding Express impossible", {
      etablissementId: auth.etablissementId,
      message,
    });
    return NextResponse.json({ error: `Stripe : ${message}` }, { status: 500 });
  }
}
