import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Client Square côté serveur (route handlers uniquement — secrets OAuth).
 * Chaque restaurant relie son propre compte marchand : commandes et paiements
 * sont créés avec son jeton, l'argent lui arrive directement et Square pousse
 * lui-même la commande réglée vers sa caisse. Ominin n'est jamais dans le flux
 * des fonds.
 */

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Bac à sable et production ont des hôtes distincts (faits fournisseur).
 * L'environnement se lit sur l'identifiant d'application — Square préfixe
 * ceux du bac à sable par « sandbox- » — plutôt que dans une variable à
 * part : deux réglages qui peuvent se contredire finissent par le faire, et
 * la panne serait d'un genre pénible (jetons d'un monde, appels dans
 * l'autre). Cet identifiant est public par conception, le SDK carte le
 * consomme dans le navigateur : serveur et client lisent donc le même.
 */
const APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
const API_URL = APPLICATION_ID?.startsWith("sandbox-")
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";
/** Version d'API épinglée : Square fait évoluer ses schémas par date. */
const API_VERSION = "2026-08-19";

/*
 * Portées demandées, et rien de plus : chaque permission superflue est une
 * raison d'hésiter sur l'écran de consentement d'un restaurateur prudent.
 * Lire/écrire les commandes, encaisser, identifier le marchand.
 */
const OAUTH_SCOPES = [
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_WRITE",
  "MERCHANT_PROFILE_READ",
].join("+");

/** Cookie httpOnly portant le state anti-CSRF du flux OAuth. */
export const SQUARE_STATE_COOKIE = "square_oauth_state";

/**
 * Marge du rafraîchissement quotidien : un jeton Square vit 30 jours, celui
 * qui en a moins de sept devant lui est renouvelé. Six journées de retry
 * avant qu'il ne meure — un jeton mort silencieux, c'est un restaurant dont
 * les commandes cessent d'arriver sans cause visible.
 */
export const TOKEN_REFRESH_LEAD_DAYS = 7;
/** Marge avant expiration sous laquelle un jeton est rafraîchi à l'usage. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

function credentials(): { clientId: string; clientSecret: string } {
  const clientSecret = process.env.SQUARE_APPLICATION_SECRET;
  if (!APPLICATION_ID || !clientSecret) {
    throw new Error(
      "NEXT_PUBLIC_SQUARE_APPLICATION_ID / SQUARE_APPLICATION_SECRET manquants — renseigne frontend/.env.local."
    );
  }
  return { clientId: APPLICATION_ID, clientSecret };
}

export function squareAuthorizeUrl(state: string): string {
  const { clientId } = credentials();
  const url = new URL(`${API_URL}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("session", "false");
  // scope : séparateur « + » littéral, que searchParams encoderait en %2B.
  return `${url.toString()}&scope=${OAUTH_SCOPES}`;
}

interface SquareTokens {
  access_token: string;
  refresh_token: string;
  merchant_id: string;
  /** ISO 8601 — Square date l'expiration là où SumUp donne une durée. */
  expires_at: string;
}

class SquareError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Détail lisible d'une erreur Square, pour le toast du gérant et les logs. */
function describe(body: unknown, status: number): string {
  const errors = (body as { errors?: { detail?: string; code?: string }[] })
    ?.errors;
  const detail = errors?.map((e) => e.detail ?? e.code).filter(Boolean);
  return detail?.length ? detail.join(" ") : `HTTP ${status}`;
}

async function tokenRequest(
  params: Record<string, string>
): Promise<SquareTokens> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(`${API_URL}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Square-Version": API_VERSION,
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      ...params,
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SquareError(
      `Square OAuth : ${describe(body, response.status)}`,
      response.status
    );
  }
  return body as SquareTokens;
}

export function exchangeCode(
  code: string,
  redirectUri: string
): Promise<SquareTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

async function squareApi<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": API_VERSION,
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SquareError(
      `Square ${path} : ${describe(body, response.status)}`,
      response.status
    );
  }
  return body as T;
}

export interface SquareLocation {
  id: string;
  name: string;
  status?: "ACTIVE" | "INACTIVE";
  address?: { address_line_1?: string; locality?: string };
}

/** Points de vente du marchand — un compte multi-sites en a plusieurs. */
export async function fetchLocations(
  accessToken: string
): Promise<SquareLocation[]> {
  const { locations } = await squareApi<{ locations?: SquareLocation[] }>(
    accessToken,
    "/v2/locations"
  );
  // Un point de vente désactivé ne peut pas encaisser : ne pas le proposer.
  return (locations ?? []).filter(
    (location) => location.status !== "INACTIVE"
  );
}

export interface SquareMoney {
  amount: number;
  currency: string;
}

export interface SquareOrder {
  id: string;
  state?: string;
  reference_id?: string;
  total_money?: SquareMoney;
  total_tip_money?: SquareMoney;
  tenders?: { id: string; payment_id?: string }[];
}

export function createOrder(
  accessToken: string,
  body: { idempotency_key: string; order: Record<string, unknown> }
): Promise<{ order: SquareOrder }> {
  return squareApi(accessToken, "/v2/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function retrieveOrder(
  accessToken: string,
  orderId: string
): Promise<{ order: SquareOrder }> {
  return squareApi(accessToken, `/v2/orders/${orderId}`);
}

export interface SquarePayment {
  id: string;
  status: "APPROVED" | "PENDING" | "COMPLETED" | "CANCELED" | "FAILED";
  order_id?: string;
  amount_money?: SquareMoney;
  tip_money?: SquareMoney;
}

export function createPayment(
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ payment: SquarePayment }> {
  return squareApi(accessToken, "/v2/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function retrievePayment(
  accessToken: string,
  paymentId: string
): Promise<{ payment: SquarePayment }> {
  return squareApi(accessToken, `/v2/payments/${paymentId}`);
}

export function upsertSquareAccount(
  admin: Admin,
  etablissementId: string,
  tokens: SquareTokens
) {
  return admin.from("square_accounts").upsert({
    etablissement_id: etablissementId,
    merchant_id: tokens.merchant_id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    access_token_expires_at: tokens.expires_at,
    updated_at: new Date().toISOString(),
  });
}

export interface Merchant {
  accessToken: string;
  merchantId: string;
}

/**
 * Jeton d'accès du marchand, rafraîchi s'il expire (ou forceRefresh après un
 * 401). Le jeton renouvelé est persisté AVANT d'être retourné : un crash ne
 * peut pas laisser un refresh token consommé sans trace en base.
 */
export async function getMerchantToken(
  admin: Admin,
  etablissementId: string,
  options?: { forceRefresh?: boolean }
): Promise<Merchant | null> {
  const { data } = await admin
    .from("square_accounts")
    .select("merchant_id, access_token, refresh_token, access_token_expires_at")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (!data) return null;

  const expiresAt = new Date(data.access_token_expires_at).getTime();
  const stale =
    options?.forceRefresh || expiresAt - Date.now() < TOKEN_REFRESH_MARGIN_MS;
  if (!stale) {
    return { accessToken: data.access_token, merchantId: data.merchant_id };
  }

  const tokens = await refreshAccount(admin, etablissementId, {
    refresh_token: data.refresh_token,
  });
  return { accessToken: tokens.access_token, merchantId: tokens.merchant_id };
}

/** Renouvelle et persiste les jetons d'un marchand. */
export async function refreshAccount(
  admin: Admin,
  etablissementId: string,
  account: { refresh_token: string }
): Promise<SquareTokens> {
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: account.refresh_token,
  });
  const { error } = await upsertSquareAccount(admin, etablissementId, tokens);
  if (error) throw new Error(error.message);
  return tokens;
}

/**
 * Rejoue un appel Square après renouvellement du jeton si celui-ci vient
 * d'être refusé — un 401 sur un jeton qu'on croyait valable (révoqué puis
 * rétabli, horloge décalée) ne doit pas coûter la commande au client.
 */
export async function withFreshToken<T>(
  admin: Admin,
  etablissementId: string,
  merchant: Merchant,
  call: (accessToken: string) => Promise<T>
): Promise<T> {
  try {
    return await call(merchant.accessToken);
  } catch (error) {
    if (!(error instanceof SquareError) || error.status !== 401) throw error;
    const refreshed = await getMerchantToken(admin, etablissementId, {
      forceRefresh: true,
    });
    if (!refreshed) throw error;
    return call(refreshed.accessToken);
  }
}

/**
 * Signature HMAC-SHA256 des webhooks Square, calculée sur l'URL de
 * notification concaténée au corps BRUT. Contrairement à SumUp, dont les
 * webhooks ne sont pas signés et devaient être re-vérifiés par un appel API,
 * un événement Square se prouve hors ligne.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  notificationUrl: string
): boolean {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;
  const expected = createHmac("sha256", key)
    .update(notificationUrl + rawBody)
    .digest("base64");
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);
  // timingSafeEqual exige des longueurs égales : la comparer d'abord.
  return (
    received.length === computed.length && timingSafeEqual(received, computed)
  );
}

/** Gérant de l'établissement courant — même garde que les routes Stripe. */
export async function requireGerant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentification requise.", status: 401 as const };
  const { data: membership } = await supabase
    .from("memberships")
    .select("etablissement_id, role")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership || membership.role !== "gerant") {
    return {
      error: "Seul le gérant peut configurer le paiement en ligne.",
      status: 403 as const,
    };
  }
  return { etablissementId: membership.etablissement_id, email: user.email };
}

/**
 * Clôt la commande sur la foi d'un paiement Square rapporté par Square
 * lui-même. Idempotente : mark_order_paid_online ne retouche pas une
 * commande déjà réglée, et fait tout l'aval (drapeaux, pourboire, départ en
 * cuisine selon l'imprimante, statut final).
 */
export async function settlePayment(
  admin: Admin,
  orderId: string,
  payment: SquarePayment
): Promise<boolean> {
  if (payment.status !== "COMPLETED" && payment.status !== "APPROVED") {
    return false;
  }
  // Le pourboire est un fait nouveau choisi par le client : lu dans le
  // paiement tel que Square l'a enregistré, pas dans ce que le navigateur
  // avait annoncé.
  const tip = (payment.tip_money?.amount ?? 0) / 100;
  const { error } = await admin.rpc("mark_order_paid_online", {
    p_order_id: orderId,
    p_tip: tip > 0 ? tip : null,
  });
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Marque une commande payée après relecture AUPRÈS DE Square : ni le payload
 * d'un webhook ni le retour du navigateur ne sont crus sur parole pour un
 * fait d'argent. Chemin du webhook et de la vérification client ; la route de
 * paiement, elle, tient déjà la réponse de Square et appelle settlePayment.
 */
export async function confirmOrderPaid(
  admin: Admin,
  order: { id: string; etablissement_id: string; square_payment_id: string }
): Promise<boolean> {
  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) return false;

  const { payment } = await withFreshToken(
    admin,
    order.etablissement_id,
    merchant,
    (token) => retrievePayment(token, order.square_payment_id)
  );
  return settlePayment(admin, order.id, payment);
}
