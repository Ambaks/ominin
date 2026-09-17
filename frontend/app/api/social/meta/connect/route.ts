import { NextResponse } from "next/server";
import {
  META_STATE_COOKIE,
  metaAuthorizeUrl,
  publicBase,
  requireAdmin,
} from "@/lib/social/server";

/*
 * Départ du flux OAuth Meta : renvoie l'URL d'autorisation, state anti-CSRF
 * posé en cookie httpOnly. Les jetons ne transitent jamais par le navigateur.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const base = publicBase(request);
  const state = crypto.randomUUID();
  const response = NextResponse.json({
    url: metaAuthorizeUrl(state, `${base}/api/social/meta/callback`),
  });
  response.cookies.set(META_STATE_COOKIE, state, {
    httpOnly: true,
    secure: base.startsWith("https:"),
    sameSite: "lax",
    maxAge: 600,
    path: "/api/social/meta",
  });
  return response;
}
