import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { linkGoogleCommercial } from "@/lib/commercial/access";
import { commercialPrefix } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/**
 * Échange le code OAuth/PKCE (Google, liens email) contre une session. Les
 * liens email (invitation, mot de passe oublié) passent aussi par ici : le
 * jeton prouve l'accès à la boîte, la page `next` fait le reste.
 */
export async function GET(request: Request) {
  const { searchParams, origin, protocol } = new URL(request.url);
  // Host public réel : ce callback sert aussi les sous-domaines, or
  // request.url peut porter le host interne (localhost en dev, routage Vercel
  // en prod). Les en-têtes gardent le sous-domaine demandé.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const base = host ? `${protocol}//${host}` : origin;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  // Chemin relatif uniquement : la session vient d'être posée sur cet hôte et
  // lui seul, une redirection ailleurs y arriverait déconnectée.
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/gestion";

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Un commercial invité qui arrive par Google : Google a vérifié l'adresse.
      if (next === `${commercialPrefix}/espace`) await linkGoogleCommercial(data.user);
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  // Sur ominin.com, l'espace commercial a sa propre page de connexion : un
  // lien expiré doit y ramener, pas sur celle des restaurants.
  const login =
    commercialPrefix && next.startsWith(`${commercialPrefix}/`)
      ? `${commercialPrefix}/connexion`
      : "/connexion";
  return NextResponse.redirect(`${base}${login}?error=auth`);
}
