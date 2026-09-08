/*
 * Envoi des e-mails transactionnels des boutiques (confirmation, expédition,
 * messagerie) via l'API Resend — même mécanique que lib/portal/notify.ts,
 * sans SDK. Route handlers et webhooks uniquement.
 *
 * L'expéditeur est celui d'Ominin (SHOP_MAIL_FROM) avec le nom de la
 * boutique en clair, et la réponse part vers l'adresse de contact de la
 * boutique : la cliente répond à la marque, pas à Ominin. Sans clé, l'envoi
 * est simulé dans la console : le flux reste testable en local.
 */

const MAIL_API_URL = process.env.RESEND_API_URL ?? "https://api.resend.com";
const MAIL_TIMEOUT_MS = 10_000;

export interface ShopMail {
  to: string;
  subject: string;
  html: string;
  /** Nom d'expéditeur affiché (nom de la boutique). */
  fromName: string;
  replyTo?: string | null;
}

export async function sendShopMail(mail: ShopMail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SHOP_MAIL_FROM;
  if (!apiKey || !from) {
    console.info(`[shop mail · simulé] à ${mail.to} — ${mail.subject}`);
    return true;
  }
  // « Boutique via Ominin Shop <adresse> » : l'adresse reste celle du domaine vérifié.
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  try {
    const response = await fetch(`${MAIL_API_URL}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${mail.fromName} <${address}>`,
        to: [mail.to],
        ...(mail.replyTo && { reply_to: mail.replyTo }),
        subject: mail.subject,
        html: mail.html,
      }),
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
