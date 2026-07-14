import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Échange le code OAuth/PKCE (Google, liens email) contre une session. */
export async function GET(request: Request) {
  const { searchParams, origin, protocol } = new URL(request.url);
  // Host public réel : ce callback sert aussi les sous-domaines (clip), or
  // request.url peut porter le host interne (localhost en dev, routage Vercel
  // en prod). Les en-têtes gardent le sous-domaine demandé.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${protocol}//${host}` : origin;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  // Chemin relatif uniquement — jamais de redirection hors du site.
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/gestion";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }

  return NextResponse.redirect(`${base}/login?error=auth`);
}
