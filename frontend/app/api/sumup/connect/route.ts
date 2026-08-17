import { NextResponse } from "next/server";
import {
  SUMUP_STATE_COOKIE,
  requireGerant,
  sumupAccounts,
  sumupAuthorizeUrl,
} from "@/lib/sumup/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Connexion du compte marchand SumUp du restaurant (pendant SumUp de
 * /api/stripe/connect). GET → statut (un jeton en base = compte relié, pas
 * d'état d'onboarding asynchrone comme Stripe). POST → URL d'autorisation
 * OAuth, avec state anti-CSRF posé en cookie httpOnly. Les jetons ne
 * transitent jamais par le navigateur.
 */

export async function GET() {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const admin = createAdminClient();
  const { data } = (await sumupAccounts(admin)
    .select("merchant_code")
    .eq("etablissement_id", auth.etablissementId)
    .maybeSingle()) as { data: { merchant_code: string } | null };
  if (!data) return NextResponse.json({ connected: false });
  return NextResponse.json({ connected: true, merchantCode: data.merchant_code });
}

export async function POST(request: Request) {
  const auth = await requireGerant();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Host public réel : request.url peut porter le host interne (routage
  // Vercel). L'URI de retour doit correspondre à celle déclarée chez SumUp.
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? requestUrl.host;
  const redirectUri = `${requestUrl.protocol}//${host}/api/sumup/callback`;

  const state = crypto.randomUUID();
  const response = NextResponse.json({
    url: sumupAuthorizeUrl(redirectUri, state),
  });
  response.cookies.set(SUMUP_STATE_COOKIE, state, {
    httpOnly: true,
    secure: requestUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/sumup",
  });
  return response;
}
