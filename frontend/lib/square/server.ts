import { createHmac, timingSafeEqual } from "node:crypto";
import { recordPaymentCard, squareCard } from "@/lib/menu/payment-attempts";
import { dispatchOrderEvent } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
 * Lire/écrire les commandes, encaisser, prélever la commission Ominin
 * (app_fee_money, refusé sans PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS),
 * identifier le marchand. Un jeton accordé avant l'ajout d'une portée ne
 * l'obtient qu'en refaisant l'autorisation.
 */
const OAUTH_SCOPES = [
  "ORDERS_READ",
  "ORDERS_WRITE",
  "PAYMENTS_WRITE",
  "PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS",
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

export function squareAuthorizeUrl(
  state: string,
  redirectUri: string
): string {
  const { clientId } = credentials();
  const url = new URL(`${API_URL}/oauth2/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("state", state);
  url.searchParams.set("session", "false");
  url.searchParams.set("redirect_uri", redirectUri);
  // scope : séparateur « + » littéral, que searchParams encoderait en %2B.
  return `${url.toString()}&scope=${OAUTH_SCOPES}`;
}

export { publicRequestOrigin } from "@/lib/request-origin";
export { requireGerant } from "@/lib/supabase/gerant";

interface SquareTokens {
  access_token: string;
  refresh_token: string;
  merchant_id: string;
  /** ISO 8601 — Square date l'expiration là où SumUp donne une durée. */
  expires_at: string;
}

export class SquareError extends Error {
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

/** Un paiement refusé reste attaché à la commande, en tender FAILED. */
export interface SquareTender {
  id: string;
  payment_id?: string;
  /** Ce que le tender a encaissé, pourboire non compris. */
  amount_money?: SquareMoney;
  tip_money?: SquareMoney;
  card_details?: {
    status?: "AUTHORIZED" | "CAPTURED" | "VOIDED" | "FAILED";
    card?: SquareCard;
  };
}

interface SquareCard {
  card_brand?: string;
  card_type?: string;
}

export interface SquareOrder {
  id: string;
  state?: string;
  reference_id?: string;
  total_money?: SquareMoney;
  total_tip_money?: SquareMoney;
  tenders?: SquareTender[];
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
  card_details?: { card?: SquareCard };
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

/** Rembourse un paiement (PAYMENTS_WRITE). Clé d'idempotence déterministe chez l'appelant. */
export function refundPayment(
  accessToken: string,
  body: {
    idempotency_key: string;
    payment_id: string;
    amount_money: SquareMoney;
    reason: string;
  }
): Promise<{ refund: { id: string; status: string } }> {
  return squareApi(accessToken, "/v2/refunds", {
    method: "POST",
    body: JSON.stringify(body),
  });
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

/**
 * Clôt la commande sur la foi d'un règlement que Square a lui-même rapporté.
 * Idempotente : mark_order_paid_online ne retouche pas une commande déjà
 * réglée, et fait tout l'aval (drapeaux, pourboire, départ en cuisine selon
 * l'imprimante, statut final).
 */
export async function settlePayment(
  admin: Admin,
  orderId: string,
  tipMoney: SquareMoney | undefined
): Promise<void> {
  // Le pourboire est un fait nouveau choisi par le client : lu dans ce que
  // Square a enregistré, pas dans ce que le navigateur avait annoncé.
  const tip = (tipMoney?.amount ?? 0) / 100;
  const { data: settled, error } = await admin.rpc("mark_order_paid_online", {
    p_order_id: orderId,
    p_tip: tip > 0 ? tip : null,
  });
  if (error) throw new Error(error.message);
  // La commande attendait son règlement hors de la caisse : elle arrive en
  // salle maintenant — une fois, même quand webhook et route se croisent.
  if (settled) await dispatchOrderEvent(orderId, "nouvelle_commande");
}

/**
 * Le règlement abouti d'une commande Square, s'il y en a un. Un refus y
 * laisse un tender FAILED : seul un tender capturé ou autorisé compte.
 * L'état se lit dans la commande (ORDERS_READ) et non dans le paiement, qui
 * exigerait PAYMENTS_READ — une permission de plus à faire accepter au
 * restaurateur, pour la même information.
 */
export function capturedTender(
  squareOrder: SquareOrder
): (SquareTender & { payment_id: string }) | null {
  const tender = squareOrder.tenders?.find(
    (candidate) =>
      candidate.payment_id &&
      (candidate.card_details?.status === "CAPTURED" ||
        candidate.card_details?.status === "AUTHORIZED")
  );
  return tender?.payment_id ? { ...tender, payment_id: tender.payment_id } : null;
}

/** Clôt la commande si la commande Square porte un règlement abouti. */
export async function settleFromOrder(
  admin: Admin,
  orderId: string,
  squareOrder: SquareOrder
): Promise<boolean> {
  const tender = capturedTender(squareOrder);
  if (!tender) {
    const refused = squareOrder.tenders?.findLast((candidate) => candidate.card_details?.card);
    if (refused) await recordPaymentCard(admin, orderId, squareCard(refused.card_details));
    return false;
  }
  const { error } = await admin
    .from("orders")
    .update({ square_payment_id: tender.payment_id })
    .eq("id", orderId);
  if (error) throw new Error(error.message);
  await recordPaymentCard(admin, orderId, squareCard(tender.card_details));
  await settlePayment(admin, orderId, tender.tip_money);
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
  order: { id: string; etablissement_id: string; square_order_id: string }
): Promise<boolean> {
  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) return false;

  const { order: squareOrder } = await withFreshToken(
    admin,
    order.etablissement_id,
    merchant,
    (token) => retrieveOrder(token, order.square_order_id)
  );
  return settleFromOrder(admin, order.id, squareOrder);
}
