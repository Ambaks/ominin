import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Deux rôles :
 *  1. Sous-domaine click & collect (NEXT_PUBLIC_COLLECT_HOST) : réécrit tout
 *     chemin vers l'arborescence /collect — collect.ominin.com/le-slug sert
 *     app/collect/[slug]. Les routes /api passent sans réécriture (matcher).
 *  2. Domaine principal : rafraîchit la session Supabase (cookies) et garde
 *     les routes privées. Contrôle optimiste seulement : la vraie
 *     autorisation est portée par les policies RLS côté Postgres.
 */
export async function proxy(request: NextRequest) {
  const collectHost = process.env.NEXT_PUBLIC_COLLECT_HOST;
  if (collectHost && request.headers.get("host") === collectHost) {
    const { pathname } = request.nextUrl;
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/collect" : `/collect${pathname}`;
    return NextResponse.rewrite(url);
  }

  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/gestion") || pathname.startsWith("/onboarding");
  // Hors des routes gardées (le matcher laisse passer tout chemin de page,
  // pour la réécriture collect) : ne pas payer l'appel session Supabase.
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
    url.pathname = "/gestion";
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
