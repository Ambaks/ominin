import { partageUrl, reservationUrl } from "@/lib/bulles/links";
import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import { mailConfig, sendEmail } from "@/lib/gmail";

/*
 * E-mails d'une réservation de bulle : place payée, bulle confirmée, place
 * remboursée. Un e-mail qui ne part pas ne bloque jamais un paiement ni un
 * remboursement — il est journalisé. Sans configuration Gmail (dev local),
 * l'envoi est simulé.
 */

export type BulleMail = {
  to: string;
  /** La personne qui reçoit l'e-mail : l'organisateur, ou un ami qui a payé. */
  name: string;
  organiser: boolean;
  organiserName: string;
  token: string;
  shareToken: string;
  etablissement: { slug: string; name: string; address: string | null };
  bulle: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  minParty: number;
  placesPaid: number;
  /** Ce que cette personne a payé. */
  places: number;
  amountCents: number;
};

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const linkOf = (mail: BulleMail) =>
  mail.organiser
    ? reservationUrl(mail.etablissement.slug, mail.token)
    : partageUrl(mail.etablissement.slug, mail.shareToken);

function row(label: string, value: string, strong = false) {
  return `<tr><td style="padding:12px 0;color:#7a5a52;border-top:1px solid #e3cdb4;">${label}</td><td style="padding:12px 0;text-align:right;color:#251b20;border-top:1px solid #e3cdb4;${strong ? "font-weight:700;" : ""}">${value}</td></tr>`;
}

function layout(mail: BulleMail, title: string, intro: string, cta: string, extra = "", refunded = false) {
  const places = `${mail.places} place${mail.places > 1 ? "s" : ""}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#251b20;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#251b20;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#251b20;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#f4e6d4;border-radius:120px 120px 20px 20px;">
<tr><td style="padding:56px 32px 4px;text-align:center;font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:#9e3a31;">${escapeHtml(mail.etablissement.name)}</td></tr>
<tr><td style="padding:12px 32px 0;text-align:center;">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:30px;line-height:1.15;margin:0 0 10px;color:#251b20;">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#5a2e1f;">${intro}</p>
</td></tr>
<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
${row("Bulle", escapeHtml(mail.bulle))}
${row("Soir", escapeHtml(formatNight(mail.startsAt)))}
${row("Créneau", escapeHtml(formatHours(mail.startsAt, mail.endsAt)))}
${row("Groupe", `${mail.partySize} personnes`)}
${row(refunded ? "Remboursé" : "Payé", `${formatCents(mail.amountCents)} · ${places}`, true)}
</table></td></tr>
${extra}
<tr><td style="padding:24px 32px 8px;text-align:center;"><a href="${linkOf(mail)}" style="display:inline-block;background:#b5443a;color:#fbf3e8;text-decoration:none;font-size:15px;font-weight:600;padding:15px 28px;border-radius:999px;">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding:20px 32px 28px;text-align:center;font-size:12px;line-height:1.7;color:#7a5a52;">${escapeHtml(mail.etablissement.name)}${mail.etablissement.address ? ` · ${escapeHtml(mail.etablissement.address)}` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

// Le lien à transmettre aux amis, tant que des places restent à payer.
function shareBlock(mail: BulleMail) {
  if (!mail.organiser || mail.placesPaid >= mail.partySize) return "";
  const url = partageUrl(mail.etablissement.slug, mail.shareToken);
  return `<tr><td style="padding:20px 32px 0;"><div style="border:1px dashed #c9803f;border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6;color:#251b20;">Envoyez ce lien à vos amis : chacun paie sa place, jusqu'à la fin du créneau. Pour commander depuis la bulle, toutes les places doivent être payées.<br><a href="${url}" style="color:#9e3a31;word-break:break-all;">${url}</a></div></td></tr>`;
}

async function send(to: string, subject: string, html: string) {
  if (!mailConfig()) {
    console.info(`[bulles mail · simulé] à ${to} — ${subject}`);
    return;
  }
  try {
    await sendEmail(to, subject, html);
  } catch (error) {
    console.error("[bulles mail]", error);
  }
}

const missing = (mail: BulleMail) => Math.max(mail.minParty - mail.placesPaid, 0);

/** Une place payée, la bulle pas encore confirmée. */
export function sendPlacesPaid(mail: BulleMail) {
  const left = missing(mail);
  return send(
    mail.to,
    `${mail.bulle} · votre place est payée`,
    layout(
      mail,
      mail.organiser ? "Votre bulle se prépare" : "Votre place est payée",
      `${escapeHtml(mail.name)}, encore ${left} place${left > 1 ? "s" : ""} à payer et la bulle est à vous. Si un autre groupe la confirme avant, vous passez sur une bulle libre du créneau ; s'il n'en reste plus, vous êtes remboursé.`,
      mail.organiser ? "Suivre ma réservation" : "Voir la bulle",
      shareBlock(mail)
    )
  );
}

/** La bulle est confirmée : à chaque personne qui a payé. */
export function sendBulleConfirmed(mail: BulleMail) {
  return send(
    mail.to,
    `${mail.bulle} est à vous · ${formatNight(mail.startsAt)}`,
    layout(
      mail,
      `${mail.bulle} est à vous`,
      mail.organiser
        ? `${escapeHtml(mail.name)}, votre bulle est confirmée. Présentez votre pass à l'accueil. Pour commander depuis la bulle, toutes les places du groupe doivent être payées : par le lien de partage ou à l'accueil.`
        : `${escapeHtml(mail.name)}, la bulle de ${escapeHtml(mail.organiserName)} est confirmée. Rendez-vous à l'accueil avec votre groupe.`,
      mail.organiser ? "Voir mon pass" : "Voir la bulle",
      shareBlock(mail)
    )
  );
}

/** Une place payée pour une bulle qui ne tiendra pas : rendue. */
export function sendPlacesRefunded(mail: BulleMail) {
  return send(
    mail.to,
    `Remboursement · ${mail.bulle}`,
    layout(
      mail,
      "Votre place est remboursée",
      `${escapeHtml(mail.name)}, toutes les bulles de ce créneau ont été prises par des groupes confirmés avant le vôtre. ${formatCents(mail.amountCents)} reviennent sur votre carte, sous 5 à 10 jours selon votre banque.`,
      "Voir la réservation",
      "",
      true
    )
  );
}
