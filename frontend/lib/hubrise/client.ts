import { createHmac, timingSafeEqual } from "node:crypto";
import { HUBRISE } from "./config";

/*
 * Client HubRise côté serveur (route handlers uniquement — secrets OAuth).
 * Chaque restaurant relie SON lieu HubRise : le jeton est lié à un lieu, il
 * n'expire jamais, et un 401 veut dire « bloqué, révoqué ou impayé ».
 * Ominin n'est jamais dans le flux des fonds : HubRise ne fait que router.
 */

function environment() {
  const clientId = process.env.HUBRISE_CLIENT_ID;
  const clientSecret = process.env.HUBRISE_CLIENT_SECRET;
  const apiUrl = process.env.HUBRISE_API_URL;
  const managerUrl = process.env.HUBRISE_MANAGER_URL;
  if (!clientId || !clientSecret || !apiUrl || !managerUrl) {
    throw new Error(
      "HUBRISE_CLIENT_ID / HUBRISE_CLIENT_SECRET / HUBRISE_API_URL / HUBRISE_MANAGER_URL manquants — renseigne frontend/.env.local."
    );
  }
  return { clientId, clientSecret, apiUrl, managerUrl };
}

/** Cookie httpOnly portant le state anti-CSRF du flux OAuth. */
export const HUBRISE_STATE_COOKIE = "hubrise_oauth_state";
/** Posé à côté du state quand l'autorisation part d'une inscription avec un commercial : son id. */
export const HUBRISE_SIGNUP_COOKIE = "hubrise_signup";

export class HubriseError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Détail lisible d'une erreur HubRise, pour les journaux et le gérant. */
function describe(body: unknown, status: number): string {
  const error = body as {
    error_type?: string;
    message?: string;
    errors?: { field?: string; message?: string }[];
  } | null;
  const fields = error?.errors
    ?.map((entry) => [entry.field, entry.message].filter(Boolean).join(" "))
    .filter(Boolean);
  const detail = [error?.error_type, error?.message, fields?.join(", ")]
    .filter(Boolean)
    .join(" — ");
  return detail || `HTTP ${status}`;
}

export function hubriseAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId, managerUrl } = environment();
  const url = new URL(`${managerUrl}/oauth2/v1/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", HUBRISE.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("country", "FR");
  return url.toString();
}

export interface HubriseTokens {
  access_token: string;
  account_id: string;
  location_id: string;
  catalog_id?: string | null;
  customer_list_id?: string | null;
  account_name?: string | null;
  location_name?: string | null;
  catalog_name?: string | null;
  customer_list_name?: string | null;
}

/** Échange et révocation se font côté serveur : Basic auth avec le secret. */
async function oauthRequest(
  path: string,
  body: Record<string, string>
): Promise<unknown> {
  const { clientId, clientSecret, managerUrl } = environment();
  const response = await fetch(`${managerUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(HUBRISE.httpTimeoutMs),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HubriseError(
      `HubRise OAuth : ${describe(payload, response.status)}`,
      response.status
    );
  }
  return payload;
}

export async function exchangeCode(code: string): Promise<HubriseTokens> {
  return (await oauthRequest("/oauth2/v1/token", { code })) as HubriseTokens;
}

export async function revokeToken(accessToken: string): Promise<void> {
  await oauthRequest("/oauth2/v1/revoke", { token: accessToken });
}

async function request(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<{ body: unknown; cursor: string | null }> {
  const { apiUrl } = environment();
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "X-Access-Token": accessToken,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(HUBRISE.httpTimeoutMs),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HubriseError(
      `HubRise ${init?.method ?? "GET"} ${path} : ${describe(body, response.status)}`,
      response.status
    );
  }
  return { body, cursor: response.headers.get("X-Cursor-Next") };
}

export async function hubriseApi<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  return (await request(accessToken, path, init)).body as T;
}

/** Liste paginée (100 par page, en-tête X-Cursor-Next) lue jusqu'au bout. */
export async function hubriseList<T>(
  accessToken: string,
  path: string
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  do {
    const separator = path.includes("?") ? "&" : "?";
    const page: { body: unknown; cursor: string | null } = await request(
      accessToken,
      cursor ? `${path}${separator}cursor=${encodeURIComponent(cursor)}` : path
    );
    items.push(...(page.body as T[]));
    cursor = page.cursor;
  } while (cursor);
  return items;
}

/**
 * Signature des callbacks : HMAC-SHA256 en hexadécimal du corps BRUT, avec le
 * secret de l'application. Un événement non signé, ou signé autrement, est
 * ignoré.
 */
export function verifyCallbackSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.HUBRISE_CLIENT_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);
  // timingSafeEqual exige des longueurs égales : la comparer d'abord.
  return (
    received.length === computed.length && timingSafeEqual(received, computed)
  );
}
