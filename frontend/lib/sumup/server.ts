import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Client SumUp côté serveur (route handlers uniquement — secrets OAuth).
 * Chaque restaurant relie son propre compte marchand : les checkouts sont
 * créés avec son jeton, l'argent lui arrive directement. NF525 : rien n'est
 * mémorisé au-delà des références — ni montants, ni confirmations.
 */

const SUMUP_API_URL = "https://api.sumup.com";
const SUMUP_AUTHORIZE_URL = "https://api.sumup.com/authorize";
const SUMUP_TOKEN_URL = "https://api.sumup.com/token";
// TEMPORAIRE — smoke test : « payments » est soumis à activation manuelle par
// SumUp (invalid_scope tant qu'elle n'est pas accordée). Remettre "payments"
// dès l'activation ; les comptes reliés entre-temps devront se reconnecter
// (leur jeton ne portera pas le scope paiements).
const SUMUP_OAUTH_SCOPES = "user.profile_readonly";
/** Marge avant expiration sous laquelle le jeton d'accès est rafraîchi. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;
/** Cookie httpOnly portant le state anti-CSRF du flux OAuth. */
export const SUMUP_STATE_COOKIE = "sumup_oauth_state";

function getSumUpCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.SUMUP_CLIENT_ID;
  const clientSecret = process.env.SUMUP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "SUMUP_CLIENT_ID / SUMUP_CLIENT_SECRET manquants — renseigne frontend/.env.local."
    );
  }
  return { clientId, clientSecret };
}

export function sumupAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = getSumUpCredentials();
  const url = new URL(SUMUP_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SUMUP_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

interface SumUpTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function requestTokens(
  params: Record<string, string>
): Promise<SumUpTokens> {
  const { clientId, clientSecret } = getSumUpCredentials();
  const response = await fetch(SUMUP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...params,
    }),
  });
  if (!response.ok) {
    throw new Error(`SumUp token endpoint : HTTP ${response.status}.`);
  }
  return (await response.json()) as SumUpTokens;
}

export function exchangeCode(
  code: string,
  redirectUri: string
): Promise<SumUpTokens> {
  return requestTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

async function sumupApi<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${SUMUP_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const error = new Error(`SumUp API ${path} : HTTP ${response.status}.`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return (await response.json()) as T;
}

export async function fetchMerchantCode(accessToken: string): Promise<string> {
  const profile = await sumupApi<{
    merchant_profile?: { merchant_code?: string };
  }>(accessToken, "/v0.1/me");
  const code = profile.merchant_profile?.merchant_code;
  if (!code) throw new Error("Profil SumUp sans code marchand.");
  return code;
}

export interface SumUpCheckout {
  id: string;
  status: "PENDING" | "PAID" | "FAILED";
  checkout_reference?: string;
  amount?: number;
}

export function createCheckout(
  accessToken: string,
  body: {
    checkout_reference: string;
    amount: number;
    currency: string;
    merchant_code: string;
    description: string;
    return_url: string;
  }
): Promise<SumUpCheckout> {
  return sumupApi<SumUpCheckout>(accessToken, "/v0.1/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchCheckout(
  accessToken: string,
  checkoutId: string
): Promise<SumUpCheckout> {
  return sumupApi<SumUpCheckout>(accessToken, `/v0.1/checkouts/${checkoutId}`);
}

interface SumUpAccountRow {
  merchant_code: string;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
}

// sumup_accounts arrive avec la migration 20260817000001 ; accès non typé en
// attendant la régénération des types Supabase.
export function sumupAccounts(admin: ReturnType<typeof createAdminClient>) {
  return (
    admin as unknown as {
      from: (table: string) => ReturnType<typeof admin.from>;
    }
  ).from("sumup_accounts");
}

export function upsertSumUpAccount(
  admin: ReturnType<typeof createAdminClient>,
  etablissementId: string,
  merchantCode: string,
  tokens: SumUpTokens,
  previousRefreshToken?: string
) {
  return sumupAccounts(admin).upsert({
    etablissement_id: etablissementId,
    merchant_code: merchantCode,
    access_token: tokens.access_token,
    // SumUp fait tourner les refresh tokens ; l'absent du renouvellement
    // signifie que l'ancien reste valable.
    refresh_token: tokens.refresh_token ?? previousRefreshToken,
    access_token_expires_at: new Date(
      Date.now() + tokens.expires_in * 1000
    ).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Jeton d'accès du marchand, rafraîchi si expirant (ou forceRefresh après un
 * 401). Le jeton renouvelé est persisté AVANT d'être retourné : un crash ne
 * peut pas laisser un refresh token consommé sans trace en base.
 */
export async function getMerchantToken(
  admin: ReturnType<typeof createAdminClient>,
  etablissementId: string,
  options?: { forceRefresh?: boolean }
): Promise<{ accessToken: string; merchantCode: string } | null> {
  const { data } = (await sumupAccounts(admin)
    .select("merchant_code, access_token, refresh_token, access_token_expires_at")
    .eq("etablissement_id", etablissementId)
    .maybeSingle()) as { data: SumUpAccountRow | null };
  if (!data) return null;

  const expiresAt = new Date(data.access_token_expires_at).getTime();
  const stale =
    options?.forceRefresh || expiresAt - Date.now() < TOKEN_REFRESH_MARGIN_MS;
  if (!stale) {
    return { accessToken: data.access_token, merchantCode: data.merchant_code };
  }

  const tokens = await requestTokens({
    grant_type: "refresh_token",
    refresh_token: data.refresh_token,
  });
  const { error } = await upsertSumUpAccount(
    admin,
    etablissementId,
    data.merchant_code,
    tokens,
    data.refresh_token
  );
  if (error) throw new Error(error.message);
  return { accessToken: tokens.access_token, merchantCode: data.merchant_code };
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
 * Marque une commande payée en ligne après vérification AUPRÈS DE l'API SumUp
 * (le payload d'un webhook SumUp n'est pas signé, donc jamais cru sur parole).
 * Idempotente : re-marquer une commande déjà payée est sans effet. Écritures
 * (mark_order_paid_online) : les drapeaux, le départ en cuisine, plus le
 * pourboire — reconstitué comme l'écart entre le montant encaissé (relu chez
 * SumUp) et le total des lignes, car c'est un fait nouveau choisi par le
 * client, pas un montant dérivable (NF525).
 */
export async function confirmOrderPaid(
  admin: ReturnType<typeof createAdminClient>,
  order: { id: string; etablissement_id: string; sumup_checkout_id: string }
): Promise<boolean> {
  const merchant = await getMerchantToken(admin, order.etablissement_id);
  if (!merchant) return false;

  let checkout: SumUpCheckout;
  try {
    checkout = await fetchCheckout(merchant.accessToken, order.sumup_checkout_id);
  } catch (error) {
    if ((error as Error & { status?: number }).status === 401) {
      const refreshed = await getMerchantToken(admin, order.etablissement_id, {
        forceRefresh: true,
      });
      if (!refreshed) return false;
      checkout = await fetchCheckout(
        refreshed.accessToken,
        order.sumup_checkout_id
      );
    } else {
      throw error;
    }
  }

  if (checkout.status !== "PAID" || checkout.checkout_reference !== order.id) {
    return false;
  }
  let tip = 0;
  if (typeof checkout.amount === "number") {
    const { data: lines } = await admin
      .from("order_items")
      .select("quantity, unit_price")
      .eq("order_id", order.id);
    const linesTotal = (lines ?? []).reduce(
      (sum, line) => sum + Number(line.unit_price) * line.quantity,
      0
    );
    tip = Math.round((checkout.amount - linesTotal) * 100) / 100;
  }
  const { error } = await admin.rpc("mark_order_paid_online", {
    p_order_id: order.id,
    p_tip: tip > 0 ? tip : null,
  });
  if (error) throw new Error(error.message);
  return true;
}
