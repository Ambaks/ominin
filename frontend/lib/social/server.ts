import { createClient } from "@/lib/supabase/server";

/*
 * Connexion des comptes Meta (route handlers uniquement — secret d'app).
 * Une seule autorisation Facebook couvre toutes les Pages d'Ominin et les
 * comptes Instagram professionnels qui leur sont liés. On n'en garde que les
 * jetons de Page : dérivés d'un jeton utilisateur longue durée, ils
 * n'expirent pas, et ce sont eux que l'API de publication Instagram attend.
 *
 * L'app Meta reste en mode développement : elle ne sert que les comptes de
 * son administrateur, ce qui dispense de l'App Review.
 */

/** Version d'API épinglée — la même que meta_graph_version côté backend. */
const GRAPH_VERSION = "v25.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/*
 * Publier et lire les résultats, sur les Pages et sur Instagram.
 * business_management : sans lui, les Pages rangées dans un portefeuille
 * Business n'apparaissent pas dans /me/accounts.
 */
const OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "read_insights",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "business_management",
].join(",");

/** Cookie httpOnly portant le state anti-CSRF du flux OAuth. */
export const META_STATE_COOKIE = "meta_oauth_state";

function credentials(): { appId: string; appSecret: string } {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "META_APP_ID / META_APP_SECRET manquants — renseigne frontend/.env.local."
    );
  }
  return { appId, appSecret };
}

export function metaAuthorizeUrl(state: string, redirectUri: string): string {
  const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", credentials().appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", OAUTH_SCOPES);
  return url.toString();
}

async function graph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Meta ${path} : ${body?.error?.message ?? `HTTP ${response.status}`}`
    );
  }
  return body as T;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username: string };
}

/** Code d'autorisation → Pages administrées, chacune avec son jeton durable. */
export async function fetchPages(
  code: string,
  redirectUri: string
): Promise<MetaPage[]> {
  const { appId, appSecret } = credentials();
  const app = { client_id: appId, client_secret: appSecret };
  const short = await graph<{ access_token: string }>("/oauth/access_token", {
    ...app,
    redirect_uri: redirectUri,
    code,
  });
  const long = await graph<{ access_token: string }>("/oauth/access_token", {
    ...app,
    grant_type: "fb_exchange_token",
    fb_exchange_token: short.access_token,
  });
  const { data } = await graph<{ data: MetaPage[] }>("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    limit: "100",
    access_token: long.access_token,
  });
  return data;
}

/** Host public réel : request.url peut porter le host interne (Vercel). */
const publicHost = (request: Request) =>
  request.headers.get("x-forwarded-host") ?? request.headers.get("host");

export function publicBase(request: Request): string {
  return `${new URL(request.url).protocol}//${publicHost(request)}`;
}

/** L'admin vit à la racine de son sous-domaine, sous /admin sinon. */
export function adminUrl(request: Request, path: string): string {
  const prefix =
    publicHost(request) === process.env.NEXT_PUBLIC_ADMIN_HOST ? "" : "/admin";
  return `${publicBase(request)}${prefix}${path}`;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise.", status: 401 as const };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return { error: "Réservé à l'admin.", status: 403 as const };
  return { userId: user.id };
}
