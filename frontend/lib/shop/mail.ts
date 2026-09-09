/*
 * Envoi des e-mails transactionnels des boutiques via l'API Gmail (OAuth2).
 * Route handlers et webhooks uniquement.
 *
 * L'expéditeur est le compte Gmail Ominin (GMAIL_SENDER_EMAIL) avec le nom
 * de la boutique en clair, et la réponse part vers l'adresse de contact de
 * la boutique : la cliente répond à la marque, pas à Ominin. Sans credentials,
 * l'envoi est simulé dans la console : le flux reste testable en local.
 */

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const MAIL_TIMEOUT_MS = 10_000;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const res = await fetch(TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error(`[shop mail] token refresh failed: ${res.status}`);
    return null;
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

function encodeSubject(subject: string): string {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
}

function buildRawMessage(mail: ShopMail, senderEmail: string): string {
  const lines = [
    `From: "${mail.fromName.replace(/"/g, '\\"')}" <${senderEmail}>`,
    `To: ${mail.to}`,
    `Subject: ${encodeSubject(mail.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];
  if (mail.replyTo) lines.push(`Reply-To: ${mail.replyTo}`);
  lines.push("", btoa(unescape(encodeURIComponent(mail.html))));
  return lines.join("\r\n");
}

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface ShopMail {
  to: string;
  subject: string;
  html: string;
  fromName: string;
  replyTo?: string | null;
}

export async function sendShopMail(mail: ShopMail): Promise<boolean> {
  const token = await getAccessToken();
  const senderEmail = process.env.GMAIL_SENDER_EMAIL;
  if (!token || !senderEmail) {
    console.info(`[shop mail · simulé] à ${mail.to} — ${mail.subject}`);
    return true;
  }
  try {
    const raw = buildRawMessage(mail, senderEmail);
    const response = await fetch(GMAIL_SEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64url(raw) }),
      signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`[shop mail] ${response.status} ${await response.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[shop mail]", error);
    return false;
  }
}
