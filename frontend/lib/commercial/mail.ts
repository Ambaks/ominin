import { sendEmail } from "@/lib/gmail";
import { card, escapeHtml } from "@/lib/gestion/invite-notify";
import { contactEmail } from "@/lib/landing-data";
import type { CommercialSignature } from "@/lib/legal/commercial";
import {
  COMMERCIAL_COMMISSION_PERCENT,
  COMMERCIAL_TERM_MONTHS,
  editorLegalName,
} from "@/lib/legal/constants";
import type { LegalBlock } from "@/lib/legal/types";
import { commercialSiteUrl } from "@/lib/site";
import { signedContractFilename, signedContractPdf } from "./pdf";
import { commercialName, parisDateTime, signatureRecord, signatureStatement } from "./record";

const EYEBROW = "Espace commercial";

/** Invitation (premier accès) ou nouveau lien de connexion. */
export async function sendAccessEmail(
  email: string,
  kind: "invitation" | "connexion",
  actionLink: string
) {
  const invitation = kind === "invitation";
  await sendEmail(
    email,
    invitation
      ? "Ominin vous invite à rejoindre ses commerciaux"
      : "Votre lien de connexion à l'espace commercial Ominin",
    card(
      invitation ? "Bienvenue chez Ominin." : "Votre lien de connexion.",
      invitation
        ? `Ominin vous invite &agrave; pr&eacute;senter ses solutions aux restaurants comme apporteur d&rsquo;affaires ind&eacute;pendant&nbsp;: ${COMMERCIAL_COMMISSION_PERCENT}&nbsp;% de ce qu&rsquo;Ominin encaisse sur chaque restaurant que vous apportez, pendant ${COMMERCIAL_TERM_MONTHS}&nbsp;mois &agrave; partir du jour o&ugrave; il devient client. Ouvrez votre espace pour lire le contrat et le signer en ligne.`
        : "Ouvrez votre espace commercial avec le bouton ci-dessous.",
      { label: "Ouvrir mon espace", url: actionLink },
      `Ce lien ne sert qu&rsquo;une fois. S&rsquo;il a expir&eacute;, demandez-en un autre depuis la page de connexion.<br/><br/>Le bouton ne fonctionne pas&nbsp;? Copiez ce lien&nbsp;: <span style="word-break:break-all;">${escapeHtml(actionLink)}</span>`,
      EYEBROW,
    ),
    contactEmail
  );
}

const block = (entry: LegalBlock) =>
  typeof entry === "string"
    ? `<p style="margin:0 0 10px 0;">${escapeHtml(entry)}</p>`
    : `<ul style="margin:0 0 10px 0;padding-left:20px;">${entry
        .map((item) => `<li style="margin-bottom:4px;">${escapeHtml(item)}</li>`)
        .join("")}</ul>`;

/** `intro` et `pdfNote` sont du HTML déjà échappé. */
function signedCopyHtml(signature: CommercialSignature, intro: string, pdfNote: string) {
  const { document } = signature;
  const record = signatureRecord(signature)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6f5f4b;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:4px 0;word-break:break-all;">${escapeHtml(value)}</td></tr>`
    )
    .join("");
  const articles = document.articles
    .map(
      (article) =>
        `<h2 style="margin:24px 0 10px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:normal;">${escapeHtml(article.heading)}</h2>${article.body.map(block).join("")}`
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/></head>
<body style="margin:0;padding:24px 16px;background-color:#fdf8ec;color:#261e13;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;">
<div style="max-width:640px;margin:0 auto;">
<h1 style="margin:0 0 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;">${escapeHtml(document.title)}</h1>
<p style="margin:0 0 8px 0;color:#6f5f4b;">${intro}</p>
<p style="margin:0 0 20px 0;color:#6f5f4b;">${pdfNote}</p>
<h2 style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#b07a10;">Relevé de signature</h2>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px 0;font-size:14px;">${record}</table>
<p style="margin:0 0 8px 0;">${escapeHtml(signatureStatement(signature))}</p>
${articles}
<p style="margin:32px 0 0 0;font-size:12px;color:#a3927a;">Document publié par ${escapeHtml(editorLegalName)}.</p>
</div>
</body>
</html>`;
}

/**
 * Copie de l'article 10.4, au commercial et à Ominin. Chaque envoi est
 * indépendant : un destinataire injoignable ne prive pas l'autre de la sienne.
 */
export async function sendSignedCopy(signature: CommercialSignature) {
  const { document, terms } = signature;
  const { identity } = terms;
  const name = commercialName(terms.identity);
  // La signature est déjà enregistrée : un PDF manqué ne retient pas les copies.
  const attachments = await signedContractPdf(signature).then(
    (content) => [
      {
        filename: signedContractFilename(signature),
        contentType: "application/pdf",
        content,
      },
    ],
    (cause) => {
      console.error("[commercial] PDF du contrat non généré", cause);
      return [];
    }
  );
  const attached = attachments.length > 0;
  const espace = `<a href="${commercialSiteUrl}/espace" style="color:#b5502a;">${commercialSiteUrl}/espace</a>`;
  const pdfAttached = "Le PDF en pièce jointe est l'exemplaire signé du contrat, à conserver.";
  const results = await Promise.allSettled([
    sendEmail(
      identity.email,
      `Votre contrat Ominin signé — version ${document.version}`,
      signedCopyHtml(
        signature,
        "Copie du contrat signé électroniquement, avec son relevé de signature. Conservez cet e-mail.",
        attached
          ? `${pdfAttached} Le contrat reste consultable dans votre espace : ${espace}.`
          : `L'exemplaire signé du contrat se consulte et se télécharge en PDF depuis votre espace : ${espace}.`
      ),
      contactEmail,
      attachments
    ),
    sendEmail(
      contactEmail,
      `Contrat signé — ${name} (SIRET ${identity.siret})`,
      signedCopyHtml(
        signature,
        `Copie interne : ${escapeHtml(name)} a signé le contrat le ${parisDateTime(signature.acceptedAt)} (heure de Paris). Répondre à ce message écrit au commercial.`,
        attached
          ? pdfAttached
          : "Le PDF du contrat n'a pas pu être généré : voir les journaux du serveur ([commercial] PDF du contrat non généré)."
      ),
      identity.email,
      attachments
    ),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[commercial] copie du contrat non remise", result.reason);
    }
  }
}
