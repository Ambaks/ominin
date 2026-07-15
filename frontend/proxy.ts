import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Trois rôles :
 *  1. Sous-domaine click & collect (NEXT_PUBLIC_COLLECT_HOST) : réécrit tout
 *     chemin vers l'arborescence /collect — collect.ominin.com/le-slug sert
 *     app/collect/[slug]. Les routes /api passent sans réécriture (matcher).
 *  2. Sous-domaine clippers (NEXT_PUBLIC_CLIP_HOST) : même réécriture vers
 *     /clip, mais avec session Supabase et garde de /espace — contrairement à
 *     collect, ce sous-domaine a des utilisateurs connectés.
 *  3. Domaine principal : rafraîchit la session Supabase (cookies) et garde
 *     les routes privées. Contrôle optimiste seulement : la vraie
 *     autorisation est portée par les policies RLS côté Postgres.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  const collectHost = process.env.NEXT_PUBLIC_COLLECT_HOST;
  if (collectHost && host === collectHost) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/collect" : `/collect${pathname}`;
    return NextResponse.rewrite(url);
  }

  const clipHost = process.env.NEXT_PUBLIC_CLIP_HOST;
  const isClip = Boolean(clipHost && host === clipHost);

  // Sur le sous-domaine clip, /auth/* passe sans réécriture : le callback
  // OAuth partagé (app/auth/callback) répond, puis redirige en relatif —
  // donc reste sur ce host.
  if (isClip && pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  // Réponse par défaut : réécriture vers /clip sur le sous-domaine, passage
  // direct sinon. Recréée dans setAll pour porter les cookies rafraîchis.
  const passthrough = () => {
    if (!isClip) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/clip" : `/clip${pathname}`;
    return NextResponse.rewrite(url, { request });
  };
  let response = passthrough();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = passthrough();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const isProtected = isClip
    ? pathname.startsWith("/espace")
    : pathname.startsWith("/gestion") || pathname.startsWith("/onboarding");
  // Hors des routes gardées (le matcher laisse passer tout chemin de page,
  // pour les réécritures de sous-domaines) : ne pas payer l'appel session.
  if (!isProtected && pathname !== "/login") {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = isClip ? "/espace" : "/gestion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Toute page hors assets (_next, fichiers avec extension) et routes /api :
  // le sous-domaine collect exige la réécriture sur des chemins arbitraires.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
