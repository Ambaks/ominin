import { raiseAlert } from "@/lib/admin/alerts";
import { markPaymentRefused, recordPaymentCard, type PaymentCard } from "@/lib/menu/payment-attempts";
import { dispatchOrderEvent } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Client Viva côté serveur (route handlers uniquement — secrets OAuth).
 * Chaque restaurant a son propre compte marchand Viva : la commande Viva est
 * créée en son nom, l'argent lui arrive directement. Le client règle sur la
 * page de paiement hébergée par Viva (Smart Checkout), puis revient au menu.
 *
 * Deux modes, un seul interrupteur (VIVA_MODE) :
 *   - « merchant » : les identifiants Smart Checkout d'UN marchand — le
 *     compte de démonstration, avant que Viva n'ouvre l'accès ISV ;
 *   - « isv » : les identifiants ISV d'Ominin, qui agit pour le marchand
 *     désigné (?merchantId=) et prélève sa commission dans isvAmount.
 * Les corps de requête sont les mêmes, isvAmount mis à part.
 *
 * Trois hôtes Viva, en variables d'environnement (démo et production
 * diffèrent) : celui des jetons OAuth, celui de l'API (commandes et
 * transactions, Bearer), et celui de la page de paiement, qui sert aussi les
 * anciennes API en Basic (lecture et annulation d'une commande, clé de
 * vérification des webhooks).
 */

type Admin = ReturnType<typeof createAdminClient>;

const MODE: "merchant" | "isv" = process.env.VIVA_MODE === "isv" ? "isv" : "merchant";

/** Marge avant expiration sous laquelle le jeton gardé en mémoire est renouvelé. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

function settings() {
  const accountsUrl = process.env.VIVA_ACCOUNTS_URL;
  const apiUrl = process.env.VIVA_API_URL;
  const checkoutUrl = process.env.VIVA_CHECKOUT_URL;
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;
  // Basic auth : identifiant et clé d'API du marchand en mode marchand ; en
  // mode ISV, Reseller ID et Reseller API Key (délivrés par Viva seul), le
  // marchand visé s'ajoutant à l'identifiant (« reseller:marchand »).
  const basicId = process.env.VIVA_MERCHANT_ID;
  const basicKey = process.env.VIVA_API_KEY;
  if (!accountsUrl || !apiUrl || !checkoutUrl || !clientId || !clientSecret || !basicId || !basicKey) {
    throw new Error(
      "VIVA_ACCOUNTS_URL / VIVA_API_URL / VIVA_CHECKOUT_URL / VIVA_CLIENT_ID / VIVA_CLIENT_SECRET / VIVA_MERCHANT_ID / VIVA_API_KEY manquants — renseigne frontend/.env.local."
    );
  }
  return { accountsUrl, apiUrl, checkoutUrl, clientId, clientSecret, basicId, basicKey };
}

/**
 * Viva a encaissé, mais pas le montant de la commande. Rien n'est clos ni
 * renvoyé au comptoir (le client paierait deux fois) : l'équipe est alertée,
 * la commande reste en attente.
 */
export class VivaAmountMismatch extends Error {}

export class VivaError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/*
 * Un code de commande Viva compte 16 chiffres et arrive en NOMBRE JSON : au
 * delà de 2^53, JSON.parse l'arrondit, et la commande relue ne serait plus
 * la bonne. Il est remis entre guillemets avant le parse, quelle que soit sa
 * casse (orderCode, OrderCode).
 */
export function parseViva(text: string): unknown {
  if (!text) return null;
  return JSON.parse(text.replace(/("ordercode"\s*:\s*)(\d+)/gi, '$1"$2"'));
}

/** Détail lisible d'une erreur Viva, pour les logs et l'alerte. */
function describe(body: unknown, status: number): string {
  const detail = body as { message?: string; ErrorText?: string; error_description?: string } | null;
  return detail?.message ?? detail?.ErrorText ?? detail?.error_description ?? `HTTP ${status}`;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Jeton OAuth (client credentials), gardé en mémoire tant qu'il vit : une
 * instance serverless en sert plusieurs paiements, et Viva n'a pas à en
 * émettre un par appel.
 */
async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken.value;
  }
  const { accountsUrl, clientId, clientSecret } = settings();
  const response = await fetch(`${accountsUrl}/connect/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const body = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!response.ok || !body?.access_token || !body.expires_in) {
    throw new VivaError(`Viva OAuth : ${describe(body, response.status)}`, response.status);
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

async function request<T>(url: string, authorization: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: authorization, "Content-Type": "application/json", ...init?.headers },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = parseViva(text);
  } catch {
    // Corps illisible (page d'erreur HTML) : le statut parle seul.
  }
  if (!response.ok) {
    throw new VivaError(`Viva ${new URL(url).pathname} : ${describe(body, response.status)}`, response.status);
  }
  return body as T;
}

/** Appel Bearer ; un 401 sur un jeton qu'on croyait valable en redemande un. */
async function bearerApi<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${settings().apiUrl}${path}`;
  try {
    return await request<T>(url, `Bearer ${await accessToken()}`, init);
  } catch (error) {
    if (!(error instanceof VivaError) || error.status !== 401) throw error;
    cachedToken = null;
    return request<T>(url, `Bearer ${await accessToken()}`, init);
  }
}

function basicApi<T>(merchantId: string, path: string, init?: RequestInit): Promise<T> {
  const { checkoutUrl, basicId, basicKey } = settings();
  const user = MODE === "isv" ? `${basicId}:${merchantId}` : basicId;
  return request<T>(
    `${checkoutUrl}${path}`,
    `Basic ${Buffer.from(`${user}:${basicKey}`).toString("base64")}`,
    init
  );
}

/** Le compte Viva d'un établissement, s'il peut encaisser. */
export interface VivaAccount {
  merchantId: string;
  sourceCode: string;
}

export async function vivaAccount(admin: Admin, etablissementId: string): Promise<VivaAccount | null> {
  const { data } = await admin
    .from("viva_accounts")
    .select("merchant_id, source_code, verified")
    .eq("etablissement_id", etablissementId)
    .maybeSingle();
  if (!data?.verified || !data.source_code) return null;
  return { merchantId: data.merchant_id, sourceCode: data.source_code };
}

/** La commission Ominin ne part qu'en mode ISV : en mode marchand, rien ne la porte. */
export const VIVA_TAKES_FEE = MODE === "isv";

/** Montants en centimes, comme les attend Viva. */
export interface VivaOrderRequest {
  amount: number;
  tipAmount: number;
  isvAmount: number;
  merchantTrns: string;
  customerTrns: string;
  paymentTimeout: number;
}

export async function createOrder(account: VivaAccount, order: VivaOrderRequest): Promise<string> {
  const { isvAmount, ...body } = order;
  const created = await bearerApi<{ orderCode?: string }>(
    MODE === "isv" ? `/checkout/v2/isv/orders?merchantId=${account.merchantId}` : "/checkout/v2/orders",
    {
      method: "POST",
      body: JSON.stringify({
        ...body,
        sourceCode: account.sourceCode,
        ...(MODE === "isv" && isvAmount > 0 && { isvAmount }),
      }),
    }
  );
  if (!created?.orderCode) throw new VivaError("Viva n'a pas rendu de code de commande.", 502);
  return created.orderCode;
}

/** La page de paiement hébergée d'une commande Viva. */
export function checkoutUrl(orderCode: string): string {
  return `${settings().checkoutUrl}/web/checkout?ref=${orderCode}`;
}

/** Une transaction relue chez Viva. amount en euros, comme Viva le rend. */
export interface VivaTransaction {
  statusId?: string;
  amount?: number;
  orderCode?: string;
  merchantTrns?: string | null;
  sourceCode?: string;
  bankId?: string | null;
  cardCountryCode?: string | null;
  cardIssuingBank?: string | null;
  digitalWalletId?: number | null;
}

export function retrieveTransaction(account: VivaAccount, transactionId: string): Promise<VivaTransaction> {
  const id = encodeURIComponent(transactionId);
  return bearerApi<VivaTransaction>(
    MODE === "isv"
      ? `/checkout/v2/isv/transactions/${id}?merchantId=${account.merchantId}`
      : `/checkout/v2/transactions/${id}`
  );
}

/** Les transactions abouties d'une commande Viva (l'API n'y liste pas les refus). */
async function orderTransactions(account: VivaAccount, orderCode: string): Promise<{ TransactionId: string; StatusId?: string }[]> {
  const body = await basicApi<{ Transactions?: { TransactionId: string; StatusId?: string }[] }>(
    account.merchantId,
    `/api/transactions/?ordercode=${orderCode}`
  );
  return body?.Transactions ?? [];
}

/**
 * Annule une commande Viva encore ouverte : elle ne pourra plus être payée.
 * Rend faux si Viva refuse (commande payée, expirée ou déjà annulée) — à
 * l'appelant de relire ce qu'il en est.
 */
export async function cancelOrder(account: VivaAccount, orderCode: string): Promise<boolean> {
  try {
    await basicApi(account.merchantId, `/api/orders/${orderCode}`, { method: "DELETE" });
    return true;
  } catch (error) {
    if (error instanceof VivaError && error.status < 500) return false;
    throw error;
  }
}

/** Clé de vérification des webhooks, que Viva relit par un GET sur l'URL déclarée. */
export async function webhookKey(): Promise<string> {
  if (MODE === "isv") {
    const body = await bearerApi<{ key?: string; Key?: string }>("/isv/v1/webhooks/token");
    const key = body?.key ?? body?.Key;
    if (!key) throw new VivaError("Viva n'a pas rendu de clé de webhook.", 502);
    return key;
  }
  const { checkoutUrl: url, basicId, basicKey } = settings();
  const body = await request<{ key?: string; Key?: string }>(
    `${url}/api/messages/config/token`,
    `Basic ${Buffer.from(`${basicId}:${basicKey}`).toString("base64")}`
  );
  const key = body?.key ?? body?.Key;
  if (!key) throw new VivaError("Viva n'a pas rendu de clé de webhook.", 502);
  return key;
}

/**
 * La carte telle que Viva la décrit. bankId nomme le réseau (« NET_VISA ») ;
 * les identifiants de portefeuille numérique ne sont pas documentés : le
 * numéro est gardé tel quel, à traduire quand Viva en publiera la table.
 */
function vivaCard(transaction: VivaTransaction): PaymentCard {
  const network = transaction.bankId?.replace(/^NET_/i, "").toLowerCase();
  return {
    card_brand: network === "american_express" ? "amex" : network || null,
    card_country: transaction.cardCountryCode?.toUpperCase() ?? null,
    card_wallet: transaction.digitalWalletId ? `viva_${transaction.digitalWalletId}` : null,
  };
}

/** Une commande Ominin réglée par Viva, telle que le règlement la relit. */
export interface VivaOrder {
  id: string;
  etablissement_id: string;
  type: string;
  viva_order_code: string;
  viva_tip: number | null;
}

const toCents = (euros: number) => Math.round(euros * 100);

/**
 * Clôt la commande sur la foi d'une transaction RELUE chez Viva — jamais sur
 * le payload d'un webhook ni sur l'URL du retour. Elle doit être aboutie
 * (statut F), appartenir à cette commande Viva et à la source du restaurant,
 * et porter exactement les lignes de la commande plus le pourboire demandé.
 * Un montant qui diffère n'est pas clos : alerte, et VivaAmountMismatch.
 * Idempotente : mark_order_paid_online ne retouche pas une commande déjà
 * réglée.
 */
async function settleTransaction(
  admin: Admin,
  account: VivaAccount,
  order: VivaOrder,
  transactionId: string
): Promise<boolean> {
  const transaction = await retrieveTransaction(account, transactionId);
  if (transaction.orderCode !== order.viva_order_code) return false;
  if (transaction.statusId !== "F") {
    if (transaction.statusId === "E") await markPaymentRefused(admin, order.id, vivaCard(transaction));
    return false;
  }
  if (transaction.merchantTrns !== order.id || transaction.sourceCode !== account.sourceCode) {
    console.error("[viva] transaction d'une autre commande", { orderId: order.id, transactionId });
    return false;
  }

  // Le retour du client et le webhook arrivent ensemble : celui qui passe
  // second trouve la commande close, et ses lignes déjà réglées en ligne.
  const { data: current, error: orderError } = await admin
    .from("orders")
    .select("paid_online")
    .eq("id", order.id)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (current.paid_online) return true;
  const { data: lines, error: linesError } = await admin
    .from("order_items")
    .select("quantity, unit_price")
    .eq("order_id", order.id)
    .or("paid_mode.is.null,paid_mode.eq.en_ligne");
  if (linesError) throw new Error(linesError.message);
  const dueCents = lines.reduce((sum, line) => sum + toCents(line.quantity * line.unit_price), 0);
  const tip = order.viva_tip ?? 0;
  const paidCents = toCents(transaction.amount ?? 0);
  if (paidCents !== dueCents + toCents(tip)) {
    console.error("[viva] montant inattendu", { orderId: order.id, transactionId, paidCents, dueCents, tip });
    await raiseAlert("paiement", order.etablissement_id, {
      title: "Viva : montant encaissé différent de la commande",
      body: `Commande ${order.id} : ${paidCents / 100} € encaissés pour ${(dueCents + toCents(tip)) / 100} € attendus. Non close, à vérifier.`,
      url: "/clients",
      urgent: true,
    }).catch(() => false);
    throw new VivaAmountMismatch(`Montant Viva inattendu pour la commande ${order.id}.`);
  }

  const { error } = await admin
    .from("orders")
    .update({
      viva_transaction_id: transactionId,
      // La commission que Viva a versée à Ominin sur ce règlement (isvAmount,
      // calculé par /api/viva/pay sur les mêmes lignes).
      ...(VIVA_TAKES_FEE && { platform_fee_cents: await feeCents(admin, order, dueCents) }),
    })
    .eq("id", order.id)
    .is("viva_transaction_id", null);
  if (error) throw new Error(error.message);
  // La carte avant la clôture : la clôture délie la tentative du journal.
  await recordPaymentCard(admin, order.id, vivaCard(transaction));
  const { data: settled, error: settleError } = await admin.rpc("mark_order_paid_online", {
    p_order_id: order.id,
    p_tip: tip > 0 ? tip : null,
  });
  if (settleError) throw new Error(settleError.message);
  // La commande attendait son règlement hors de la caisse : elle arrive en
  // salle maintenant — une fois, même quand le webhook et le retour se croisent.
  if (settled) await dispatchOrderEvent(order.id, "nouvelle_commande");
  return true;
}

/**
 * La commission Ominin d'un montant en centimes : platform_fee_percent, ou
 * collect_fee_percent pour une commande à emporter. Jamais le montant
 * entier : le restaurant doit toucher quelque chose de sa commande.
 */
export function vivaFee(amountCents: number, feePercent: number | null): number {
  const fee = feePercent && feePercent > 0 ? Math.round((amountCents * feePercent) / 100) : 0;
  return Math.min(fee, amountCents - 1);
}

async function feeCents(admin: Admin, order: VivaOrder, dueCents: number): Promise<number> {
  const { data: etab } = await admin
    .from("etablissements")
    .select("platform_fee_percent, collect_fee_percent")
    .eq("id", order.etablissement_id)
    .single();
  return vivaFee(
    dueCents,
    (order.type === "collect" ? etab?.collect_fee_percent : etab?.platform_fee_percent) ?? null
  );
}

/**
 * Le règlement d'une commande Viva, relu chez Viva : la transaction signalée
 * (retour du client, webhook) d'abord, sinon toutes celles de la commande
 * Viva. Vrai si la commande est payée — déjà, ou à l'instant.
 */
export async function confirmVivaOrder(
  admin: Admin,
  order: VivaOrder & { paid_online?: boolean },
  transactionHint?: string | null
): Promise<boolean> {
  if (order.paid_online) return true;
  const account = await vivaAccount(admin, order.etablissement_id);
  if (!account) throw new Error("Compte Viva délié : règlement invérifiable.");
  if (transactionHint && (await settleTransaction(admin, account, order, transactionHint))) {
    return true;
  }
  const transactions = await orderTransactions(account, order.viva_order_code);
  for (const transaction of transactions) {
    if (transaction.TransactionId === transactionHint) continue;
    if (transaction.StatusId === "F" && (await settleTransaction(admin, account, order, transaction.TransactionId))) {
      return true;
    }
  }
  return false;
}

/**
 * La commande Viva ne sera pas payée en ligne : elle est annulée chez Viva,
 * pour qu'un retour arrière sur la page de paiement ne puisse plus la débiter
 * pendant que la salle encaisse l'addition. Annulation refusée : Viva l'a
 * peut-être vue payée entre-temps, elle est relue. Vrai si elle était payée.
 */
export async function closeVivaOrder(admin: Admin, order: VivaOrder): Promise<boolean> {
  const account = await vivaAccount(admin, order.etablissement_id);
  if (!account) throw new Error("Compte Viva délié : commande Viva impossible à annuler.");
  if (await cancelOrder(account, order.viva_order_code)) return false;
  return confirmVivaOrder(admin, order);
}

/** Colonnes d'une commande que le règlement Viva relit. */
export const VIVA_ORDER_COLUMNS = "id, etablissement_id, type, paid_online, viva_order_code, viva_tip";
