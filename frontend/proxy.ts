import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Chaque produit vit sur son sous-domaine et son arborescence de routes ;
 * ominin.com ne sert plus que le portail. Trois rôles :
 *  1. Sous-domaine click & collect (NEXT_PUBLIC_COLLECT_HOST) : réécrit tout
 *     chemin vers l'arborescence /collect — collect.ominin.com/le-slug sert
 *     app/collect/[slug]. Les routes /api passent sans réécriture (matcher).
 *     Pas d'utilisateur connecté, donc pas de session à rafraîchir.
 *  2. Sous-domaines à comptes (clip, menu) : même réécriture, plus la session
 *     Supabase et la garde des routes privées.
 *  3. Domaine principal : portail public. Quand un sous-domaine à comptes est
 *     actif, sa forme préfixée et ses anciennes URLs y redirigent — un seul
 *     host de session par produit. Quand il est inerte, les anciennes URLs
 *     sont réécrites vers l'arborescence préfixée : rien ne casse.
 * Le contrôle de session est optimiste : la vraie autorisation est portée par
 * les policies RLS côté Postgres.
 */

/*
 * Sous-domaines dont les visiteurs se connectent. `host` non défini (env
 * absente) ⇒ le sous-domaine est inerte et ses routes restent accessibles
 * sous leur préfixe sur le domaine principal — mode développement, et
 * interrupteur de retour arrière en production.
 *
 * `legacyPaths` : chemins que le produit servait à la racine de ominin.com
 * avant l'éclatement en sous-domaines. Les Cachets déjà imprimés encodent
 * ominin.com/m/<slug> : ces chemins doivent rester vivants tant qu'ils
 * circulent — redirigés vers le sous-domaine quand il est actif, réécrits
 * vers l'arborescence préfixée sinon. Un déploiement de ce code avant la
 * bascule DNS/Vercel ne casse donc aucune URL existante.
 */
const ACCOUNT_SUBDOMAINS = [
  {
    host: process.env.NEXT_PUBLIC_CLIP_HOST,
    prefix: "/clip",
    privatePaths: ["/espace"],
    afterLogin: "/espace",
    legacyPaths: [] as string[],
  },
  {
    host: process.env.NEXT_PUBLIC_MENU_HOST,
    prefix: "/menu",
    privatePaths: ["/gestion", "/onboarding"],
    afterLogin: "/gestion",
    legacyPaths: ["/m", "/gestion", "/login", "/onboarding"],
  },
] as const;

type AccountSubdomain = (typeof ACCOUNT_SUBDOMAINS)[number];

const matchesPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  const collectHost = process.env.NEXT_PUBLIC_COLLECT_HOST;
  if (collectHost && host === collectHost) {
    const url = request.nextUrl.clone();
    // Un chemin déjà préfixé « /collect/... » (href pré-hydratation, lien
    // copié depuis ominin.com) redirige vers sa forme canonique sans préfixe
    // — sinon la réécriture le doublerait en /collect/collect/...
    if (matchesPath(pathname, "/collect")) {
      url.pathname = pathname.slice("/collect".length) || "/";
      return NextResponse.redirect(url, 308);
    }
    url.pathname = pathname === "/" ? "/collect" : `/collect${pathname}`;
    return NextResponse.rewrite(url);
  }

  const subdomain = ACCOUNT_SUBDOMAINS.find((s) => s.host && host === s.host);
  // Produit dont la requête apex emprunte une ancienne URL alors que son
  // sous-domaine est inerte : servie par réécriture vers son arborescence.
  let legacyProduct: AccountSubdomain | undefined;

  if (subdomain) {
    // Même garde anti-doublement que collect.
    if (matchesPath(pathname, subdomain.prefix)) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(subdomain.prefix.length) || "/";
      return NextResponse.redirect(url, 308);
    }
    // /auth/* passe sans réécriture : le callback OAuth partagé
    // (app/auth/callback) répond, puis redirige en relatif — donc reste sur
    // ce host.
    if (pathname.startsWith("/auth")) {
      return NextResponse.next({ request });
    }
  } else {
    for (const s of ACCOUNT_SUBDOMAINS) {
      const prefixed = matchesPath(pathname, s.prefix);
      const legacy = s.legacyPaths.some((p) => matchesPath(pathname, p));
      if (!prefixed && !legacy) continue;
      if (s.host) {
        // Sous-domaine actif : le produit n'a plus qu'une adresse — forme
        // préfixée et anciennes URLs y convergent, sinon son espace connecté
        // resterait joignable sur deux hosts, donc avec deux jeux de cookies
        // de session.
        const url = request.nextUrl.clone();
        url.host = s.host;
        if (prefixed) url.pathname = pathname.slice(s.prefix.length) || "/";
        return NextResponse.redirect(url, 308);
      }
      if (legacy) legacyProduct = s;
      break;
    }
  }

  // Réponse par défaut : réécriture vers l'arborescence du produit (chemin nu
  // sur son sous-domaine, ancienne URL sur l'apex en mode inerte), passage
  // direct sinon. Recréée dans setAll pour porter les cookies rafraîchis.
  const passthrough = () => {
    const target = subdomain ?? legacyProduct;
    if (!target) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? target.prefix : `${target.prefix}${pathname}`;
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

  /*
   * Garde de session. Une requête se rattache à un produit de trois façons —
   * son sous-domaine, une ancienne URL réécrite (mode inerte), ou son préfixe
   * sur le domaine principal (mode inerte aussi). Dans les deux premières le
   * chemin visiteur est déjà le chemin interne au produit ; dans la dernière
   * il faut retirer le préfixe. Les redirections reprennent la forme d'URL
   * que voit le visiteur.
   */
  const prefixProduct =
    !subdomain && !legacyProduct
      ? ACCOUNT_SUBDOMAINS.find((s) => matchesPath(pathname, s.prefix))
      : undefined;
  const product = subdomain ?? legacyProduct ?? prefixProduct;
  const prefix = prefixProduct?.prefix ?? "";
  const localPath = pathname.slice(prefix.length) || "/";

  const isPrivate = Boolean(
    product?.privatePaths.some((p) => matchesPath(localPath, p))
  );
  const isLogin = localPath === "/login";
  // Hors des routes gardées (le matcher laisse passer tout chemin de page,
  // pour les réécritures de sous-domaines) : ne pas payer l'appel session.
  if (!product || (!isPrivate && !isLogin)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isPrivate) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}${product.afterLogin}`;
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
