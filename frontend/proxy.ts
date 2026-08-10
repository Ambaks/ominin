import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Réécrit les sous-domaines produits vers leur arborescence et garde les
 * routes privées.
 *  1. collect.ominin.com → /collect/... (pages de commande publiques, plus
 *     depuis la séparation des funnels : /connexion, /inscription et
 *     l'inscription d'établissement, qui exigent une session), et l'espace
 *     de gestion servi tel quel (voir plus bas).
 *  2. clip.ominin.com → /clip/... avec la garde de /espace.
 *  3. Domaine principal : session Supabase et garde de /gestion, /onboarding.
 * La session est attachée à l'hôte qui l'a posée : chaque produit a la
 * sienne, aucune redirection inter-domaines n'emporte la connexion.
 * Contrôle optimiste seulement : la vraie autorisation est portée par les
 * policies RLS côté Postgres.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  const collectHost = process.env.NEXT_PUBLIC_COLLECT_HOST;
  const clipHost = process.env.NEXT_PUBLIC_CLIP_HOST;
  const isCollect = Boolean(collectHost && host === collectHost);
  const isClip = Boolean(clipHost && host === clipHost);

  // Sur les sous-domaines, /auth/* passe sans réécriture : le callback OAuth
  // partagé (app/auth/callback) répond, puis redirige en relatif — donc
  // reste sur cet hôte.
  if ((isCollect || isClip) && pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  // Toute redirection reste sur l'hôte demandé : la session y est attachée,
  // repartir sur un autre domaine y arriverait déconnecté — or request.nextUrl
  // peut porter l'hôte interne selon le routage.
  const sameHostUrl = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    if (host) url.host = host;
    return url;
  };

  // Un chemin déjà préfixé « /collect/... » (href pré-hydratation, lien copié
  // depuis ominin.com) redirige vers sa forme canonique sans préfixe — sinon
  // la réécriture le doublerait en /collect/collect/...
  if (isCollect && (pathname === "/collect" || pathname.startsWith("/collect/"))) {
    return NextResponse.redirect(
      sameHostUrl(pathname.slice("/collect".length) || "/"),
      308
    );
  }

  // L'espace de gestion est le même pour tous les produits, mais la session
  // du sous-domaine collect ne suivrait pas jusqu'à ominin.com : cet hôte le
  // sert donc lui-même, sans réécriture (il n'existe pas de /collect/gestion).
  // Pas /onboarding en revanche : le funnel d'inscription du click & collect
  // est /inscription/etablissement.
  const collectSpace = isCollect && pathname.startsWith("/gestion");

  const prefix = collectSpace
    ? null
    : isCollect
      ? "/collect"
      : isClip
        ? "/clip"
        : null;
  // Réponse par défaut : réécriture vers le sous-arbre du produit sur un
  // sous-domaine, passage direct sinon. Recréée dans setAll pour porter les
  // cookies rafraîchis.
  const passthrough = () => {
    if (!prefix) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;
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
    : isCollect
      ? collectSpace || pathname.startsWith("/inscription/etablissement")
      : pathname.startsWith("/gestion") || pathname.startsWith("/onboarding");
  // Hors des routes gardées et de la connexion (le matcher laisse passer tout
  // chemin de page, pour les réécritures de sous-domaines) : ne pas payer
  // l'appel session.
  if (!isProtected && pathname !== "/connexion") {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = sameHostUrl("/connexion");
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/connexion") {
    const url = sameHostUrl(isClip ? "/espace" : "/gestion");
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
