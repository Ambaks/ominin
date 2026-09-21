/*
 * Envoi via l'API Gmail (compte omininsupport@gmail.com), avec les mêmes
 * identifiants OAuth que l'agent Léa côté backend (scripts/gmail_auth.py).
 * Le refresh token porte le scope gmail.modify, qui couvre l'envoi.
 * Route handlers uniquement : les identifiants ne doivent jamais atteindre
 * le client.
 */
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const MAIL_TIMEOUT_MS = 10_000;

function mailConfig() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return {
    clientId,
    clientSecret,
    refreshToken,
    senderEmail:
      process.env.GMAIL_SENDER_EMAIL ?? "omininsupport@gmail.com",
    senderName: process.env.GMAIL_SENDER_NAME ?? "Ominin",
  };
}

// Jeton d'accès (~1 h) mis en cache au niveau module : réutilisé tant que la
// fonction serverless reste chaude, régénéré sinon.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(config: NonNullable<ReturnType<typeof mailConfig>>) {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Jeton Gmail : ${response.status}${body ? ` — ${body.slice(0, 300)}` : ""}`,
    );
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: data.access_token,
    // Marge d'une minute pour ne jamais envoyer avec un jeton expirant.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
) {
  const config = mailConfig();
  if (!config) {
    throw new Error(
      "Configuration email manquante (GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN).",
    );
  }

  const token = await accessToken(config);

  // Sujet en RFC 2047 et corps en base64 : les deux contiennent des accents.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const mime = [
    `From: "${config.senderName}" <${config.senderEmail}>`,
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html, "utf-8").toString("base64"),
  ].join("\r\n");

  const response = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: Buffer.from(mime, "utf-8").toString("base64url"),
    }),
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Envoi d'email : ${response.status}${body ? ` — ${body.slice(0, 300)}` : ""}`
    );
  }
}
