/*
 * Envoi via l'API Gmail (OAuth, refresh token portant le scope d'envoi),
 * même mécanisme que le formulaire de contact d'Ominin. Route handlers
 * uniquement : les identifiants ne doivent jamais atteindre le client.
 */
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const TIMEOUT_MS = 10_000;

function config() {
  const env = process.env;
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN || !env.GMAIL_SENDER_EMAIL) {
    return null;
  }
  return {
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    sender: env.GMAIL_SENDER_EMAIL,
    senderName: env.GMAIL_SENDER_NAME ?? "FLG Aérogommage",
  };
}

let cached: { value: string; expiresAt: number } | null = null;

async function accessToken(c: NonNullable<ReturnType<typeof config>>) {
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: c.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Jeton Gmail : ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

export async function sendEmail(to: string, subject: string, html: string, replyTo: string) {
  const c = config();
  if (!c) throw new Error("Configuration Gmail manquante (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL).");
  const token = await accessToken(c);
  const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
  const mime = [
    `From: "${c.senderName}" <${c.sender}>`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(html),
  ].join("\r\n");
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime, "utf-8").toString("base64url") }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Envoi Gmail : ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
}
