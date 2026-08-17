import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Chaque produit vit sur son sous-domaine et son arborescence de routes ;
 * ominin.com ne sert plus que le portail. Rôles :
 *  1. Sous-domaines produits (collect, clip, menu) : réécriture de tout
 *     chemin vers l'arborescence du produit, session Supabase et garde des
 *     routes privées. Depuis la séparation des funnels, collect a aussi ses
 *     comptes (/connexion, /inscription, inscription d'établissement) et
 *     sert lui-même l'espace de gestion — réécrit vers l'arborescence menu,
 *     qui héberge l'app de gestion partagée.
 *  2. Domaine principal : portail public. Quand le sous-domaine d'un produit
 *     est actif, sa forme préfixée et ses anciennes URLs y redirigent — un
 *     seul host de session par produit. Quand il est inerte, les anciennes
 *     URLs sont réécrites vers l'arborescence préfixée : rien ne casse.
 * La session est attachée à l'hôte qui l'a posée : chaque produit a la
 * sienne, aucune redirection de garde n'emporte la connexion vers un autre
 * domaine. Contrôle optimiste seulement : la vraie autorisation est portée
 * par les policies RLS côté Postgres.
 */

type ProductConfig = {
  /** Host public du sous-domaine ; non défini ⇒ sous-domaine inerte. */
  host: string | undefined;
  prefix: string;
  privatePaths: readonly string[];
  afterLogin: string;
  /**
   * Chemins que le produit servait à la racine de ominin.com avant
   * l'éclatement en sous-domaines. Les Cachets déjà imprimés encodent
   * ominin.com/m/<slug> : ces chemins doivent rester vivants tant qu'ils
   * circulent — redirigés vers le sous-domaine quand il est actif, réécrits
   * vers l'arborescence préfixée sinon. Un déploiement avant la bascule
   * DNS/Vercel ne casse donc aucune URL existante.
   */
  legacyPaths: readonly string[];
  /** Chemins servis par l'arborescence d'un autre produit sur ce host. */
  rewriteOverrides?: readonly { path: string; prefix: string }[];
};

const PRODUCTS: readonly ProductConfig[] = [
  {
    host: process.env.NEXT_PUBLIC_COLLECT_HOST,
    prefix: "/collect",
    // L'espace de gestion est commun à tous les produits, mais la session du
    // sous-domaine collect ne suivrait pas jusqu'à un autre host : celui-ci
    // le sert donc lui-même, via l'arborescence menu (il n'existe pas de
    // /collect/gestion). Pas /onboarding en revanche : le funnel click &
    // collect est /inscription/etablissement.
    privatePaths: ["/gestion", "/inscription/etablissement"],
    afterLogin: "/gestion",
    legacyPaths: [],
    rewriteOverrides: [{ path: "/gestion", prefix: "/menu" }],
  },
  {
    host: process.env.NEXT_PUBLIC_CLIP_HOST,
    prefix: "/clip",
    privatePaths: ["/espace"],
    afterLogin: "/espace",
    legacyPaths: [],
  },
  {
    host: process.env.NEXT_PUBLIC_ADMIN_HOST,
    prefix: "/admin",
    // CRM interne : tout est privé sauf /connexion (exclu par la garde) et
    // /auth/* (bypass du callback OAuth en mode sous-domaine).
    privatePaths: ["/"],
    afterLogin: "/",
    legacyPaths: [],
  },
  {
    host: process.env.NEXT_PUBLIC_MENU_HOST,
    prefix: "/menu",
    privatePaths: ["/gestion", "/onboarding"],
    afterLogin: "/gestion",
    legacyPaths: [
      "/m",
      "/gestion",
      "/login",
      "/connexion",
      "/inscription",
      "/onboarding",
    ],
  },
];

/** Adresse de connexion, identique dans chaque arborescence produit. */
const LOGIN_PATH = "/connexion";

// base "/" = arbre entier (produit entièrement privé, ex. admin).
const matchesPath = (pathname: string, base: string) =>
  base === "/" || pathname === base || pathname.startsWith(`${base}/`);

const rewritePrefixFor = (product: ProductConfig, pathname: string) =>
  product.rewriteOverrides?.find((o) => matchesPath(pathname, o.path))
    ?.prefix ?? product.prefix;

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname } = request.nextUrl;

  // Toute redirection de garde reste sur l'hôte demandé : la session y est
  // attachée, repartir sur un autre domaine y arriverait déconnecté — or
  // request.nextUrl peut porter l'hôte interne selon le routage (localhost en
  // dev, routage Vercel en prod).
  const sameHostUrl = (target: string) => {
    const url = request.nextUrl.clone();
    url.pathname = target;
    if (host) url.host = host;
    return url;
  };

  const subdomain = PRODUCTS.find((p) => p.host && host === p.host);
  // Produit dont la requête apex emprunte une ancienne URL alors que son
  // sous-domaine est inerte : servie par réécriture vers son arborescence.
  let legacyProduct: ProductConfig | undefined;

  if (subdomain) {
    // Un chemin déjà préfixé « /collect/... » (href pré-hydratation, lien
    // copié depuis ominin.com) redirige vers sa forme canonique sans préfixe
    // — sinon la réécriture le doublerait en /collect/collect/...
    if (matchesPath(pathname, subdomain.prefix)) {
      return NextResponse.redirect(
        sameHostUrl(pathname.slice(subdomain.prefix.length) || "/"),
        308
      );
    }
    // /auth/* passe sans réécriture : le callback OAuth partagé
    // (app/auth/callback) répond, puis redirige en relatif — donc reste sur
    // ce host.
    if (pathname.startsWith("/auth")) {
      return NextResponse.next({ request });
    }
  } else {
    for (const p of PRODUCTS) {
      const prefixed = matchesPath(pathname, p.prefix);
      const legacy = p.legacyPaths.some((l) => matchesPath(pathname, l));
      if (!prefixed && !legacy) continue;
      if (p.host) {
        // Sous-domaine actif : le produit n'a plus qu'une adresse — forme
        // préfixée et anciennes URLs y convergent, sinon son espace connecté
        // resterait joignable sur deux hosts, donc avec deux jeux de cookies
        // de session.
        const url = request.nextUrl.clone();
        url.host = p.host;
        if (prefixed) url.pathname = pathname.slice(p.prefix.length) || "/";
        return NextResponse.redirect(url, 308);
      }
      if (legacy) legacyProduct = p;
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
    const prefix = rewritePrefixFor(target, pathname);
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

  /*
   * Garde de session. Une requête se rattache à un produit de trois façons —
   * son sous-domaine, une ancienne URL réécrite (mode inerte), ou son préfixe
   * sur le domaine principal (mode inerte aussi). Dans les deux premières le
   * chemin visiteur est déjà le chemin interne au produit ; dans la dernière
   * il faut retirer le préfixe. Les redirections reprennent la forme d'URL
   * que voit le visiteur, sur le host demandé.
   */
  const prefixProduct =
    !subdomain && !legacyProduct
      ? PRODUCTS.find((p) => matchesPath(pathname, p.prefix))
      : undefined;
  const product = subdomain ?? legacyProduct ?? prefixProduct;
  const prefix = prefixProduct?.prefix ?? "";
  const localPath = pathname.slice(prefix.length) || "/";

  const isLogin = localPath === LOGIN_PATH;
  // Le chemin de connexion reste joignable même sous privatePaths: ["/"].
  const isPrivate =
    !isLogin &&
    Boolean(product?.privatePaths.some((p) => matchesPath(localPath, p)));
  // Hors des routes gardées (le matcher laisse passer tout chemin de page,
  // pour les réécritures de sous-domaines) : ne pas payer l'appel session.
  if (!product || (!isPrivate && !isLogin)) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isPrivate) {
    const url = sameHostUrl(`${prefix}${LOGIN_PATH}`);
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && isLogin) {
    const url = sameHostUrl(`${prefix}${product.afterLogin}`);
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
