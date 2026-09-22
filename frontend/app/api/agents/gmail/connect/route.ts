import { NextResponse } from "next/server";
import { GMAIL_STATE_COOKIE, OAUTH_STATE_MAX_AGE_SECONDS } from "@/lib/agents/constants";
import { gmailAuthorizeUrl } from "@/lib/agents/google";
import { publicBase } from "@/lib/social/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Départ du flux OAuth Gmail : renvoie l'URL de consentement Google, state
 * anti-CSRF en cookie httpOnly. Les jetons ne transitent jamais par le
 * navigateur.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const base = publicBase(request);
  const state = crypto.randomUUID();
  const response = NextResponse.json({
    url: gmailAuthorizeUrl(state, `${base}/api/agents/gmail/callback`, user.email),
  });
  response.cookies.set(GMAIL_STATE_COOKIE, state, {
    httpOnly: true,
    secure: base.startsWith("https:"),
    sameSite: "lax",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/api/agents/gmail",
  });
  return response;
}
