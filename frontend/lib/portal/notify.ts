import { sendEmail } from "@/lib/gmail";
import { contactEmail } from "@/lib/landing-data";
import type { ContactPayload, ContactSource } from "./contact";

/*
 * Notification e-mail des demandes de contact (route handlers uniquement).
 * Elle part du compte Gmail Ominin vers l'adresse de contact affichée sur les
 * landings : formulaires et liens mailto aboutissent dans la même boîte. Le
 * sujet nomme la page d'origine : une demande venue de shop.ominin.com se
 * reconnaît dans la boîte sans ouvrir l'e-mail.
 *
 * L'e-mail est le canal de travail, mais il n'est pas la trace : la demande
 * est déjà écrite en base quand cette fonction est appelée. Un échec d'envoi
 * ne doit donc jamais faire échouer la soumission — il est journalisé, et la
 * ligne reste consultable dans le dashboard Supabase.
 */

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Libellé de la page d'origine, en tête de l'e-mail et dans son sujet. */
const SOURCE_LABELS: Record<ContactSource, string> = {
  "sur-mesure": "Sur mesure",
  shop: "Ominin Shop",
};

export async function notifyContactRequest(
  payload: ContactPayload
): Promise<void> {
  const origin = SOURCE_LABELS[payload.source];
  const company = payload.company || "—";
  const lines = [
    ["Nom", payload.name],
    ["E-mail", payload.email],
    ["Commerce ou marque", company],
    ["Langue", payload.locale],
    ["Page", origin],
  ];

  const html = [
    `<h2>Nouvelle demande — ${escapeHtml(origin)}</h2>`,
    "<ul>",
    ...lines.map(
      ([label, value]) =>
        `<li><strong>${label} :</strong> ${escapeHtml(value)}</li>`
    ),
    "</ul>",
    `<p style="white-space:pre-wrap">${escapeHtml(payload.message)}</p>`,
  ].join("");

  const subject = `${origin} — ${payload.name}${
    payload.company ? ` (${payload.company})` : ""
  }`;
  // Reply-To : répondre depuis la boîte mail répond au demandeur.
  await sendEmail(contactEmail, subject, html, payload.email);
}
