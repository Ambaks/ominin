import type { ContactPayload } from "./contact";

/*
 * Notification e-mail des demandes « sur mesure » (route handlers uniquement —
 * la clé API ne doit jamais atteindre le client).
 *
 * L'e-mail est le canal de travail, mais il n'est pas la trace : la demande
 * est déjà écrite en base quand cette fonction est appelée. Un échec d'envoi
 * ne doit donc jamais faire échouer la soumission — il est journalisé, et la
 * ligne reste consultable dans le dashboard Supabase.
 */

/** Base de l'API Resend, surchargeable pour tests ou bascule de prestataire. */
const MAIL_API_URL = process.env.RESEND_API_URL ?? "https://api.resend.com";

/** Délai max d'un envoi : au-delà, on abandonne et on garde la ligne en base. */
const MAIL_TIMEOUT_MS = 10_000;

type MailConfig = { apiKey: string; from: string; to: string };

/**
 * Réglages d'envoi, ou null si la notification n'est pas configurée. Absence
 * volontairement non bloquante : tant que les variables ne sont pas posées en
 * production, le formulaire fonctionne et les demandes s'empilent en base.
 */
function mailConfig(): MailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_NOTIFY_FROM;
  const to = process.env.CONTACT_NOTIFY_TO;
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function notifyContactRequest(
  payload: ContactPayload
): Promise<void> {
  const config = mailConfig();
  if (!config) return;

  const company = payload.company || "—";
  const lines = [
    ["Nom", payload.name],
    ["E-mail", payload.email],
    ["Commerce", company],
    ["Langue", payload.locale],
  ];

  const html = [
    `<h2>Nouvelle demande sur mesure</h2>`,
    "<ul>",
    ...lines.map(
      ([label, value]) =>
        `<li><strong>${label} :</strong> ${escapeHtml(value)}</li>`
    ),
    "</ul>",
    `<p style="white-space:pre-wrap">${escapeHtml(payload.message)}</p>`,
  ].join("");

  const response = await fetch(`${MAIL_API_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    // reply_to : répondre depuis la boîte mail répond au demandeur.
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      reply_to: payload.email,
      subject: `Sur mesure — ${payload.name}${
        payload.company ? ` (${payload.company})` : ""
      }`,
      html,
    }),
    signal: AbortSignal.timeout(MAIL_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Envoi de la notification : ${response.status}${
        body ? ` — ${body.slice(0, 300)}` : ""
      }`
    );
  }
}
