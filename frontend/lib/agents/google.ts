import { GMAIL_SCOPES } from "./constants";

/*
 * Connexion Gmail des clients Agents (route handlers uniquement — secret du
 * client OAuth). Client Google de type « Application Web », distinct de
 * celui de Léa (type Bureau, sans URL de retour https) ; le backend détient
 * la même paire pour rafraîchir les jetons qu'il émet.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.AGENTS_GMAIL_CLIENT_ID;
  const clientSecret = process.env.AGENTS_GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "AGENTS_GMAIL_CLIENT_ID / AGENTS_GMAIL_CLIENT_SECRET manquants — renseigne frontend/.env.local."
    );
  }
  return { clientId, clientSecret };
}

/** access_type=offline + prompt=consent : Google ne renvoie un refresh token
 * qu'au consentement explicite — y compris à une reconnexion. */
export function gmailAuthorizeUrl(
  state: string,
  redirectUri: string,
  loginHint: string | undefined
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", credentials().clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export interface GmailGrant {
  refreshToken: string;
  accessToken: string;
  /** Tous les scopes demandés ont été cochés (consentement granulaire). */
  complete: boolean;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<GmailGrant> {
  const { clientId, clientSecret } = credentials();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    error_description?: string;
  };
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new Error(`Échange du code Google : ${data.error_description ?? response.status}`);
  }
  const granted = new Set((data.scope ?? "").split(" "));
  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    complete: GMAIL_SCOPES.every((scope) => granted.has(scope)),
  };
}

/** Adresse de la boîte et curseur d'historique de départ. */
export async function gmailProfile(
  accessToken: string
): Promise<{ emailAddress: string; historyId: string }> {
  const response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Profil Gmail : ${response.status}`);
  return response.json();
}

/** Best-effort : un jeton déjà révoqué côté Google répond 400, sans gravité. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}
