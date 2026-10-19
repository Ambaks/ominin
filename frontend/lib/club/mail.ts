import { formatCents, formatHours, formatNight } from "@/lib/club/format";
import { mailConfig, sendEmail } from "@/lib/gmail";
import { clubSiteUrl } from "@/lib/site";

/*
 * E-mails d'Ominin Club au client d'une table : confirmation, remboursement,
 * soirée modifiée ou annulée. Un e-mail qui ne part pas ne bloque jamais un
 * paiement ni un remboursement — il est journalisé. Sans configuration
 * Gmail (dev local), l'envoi est simulé.
 */

export type BookingMail = {
  to: string;
  /** La personne qui reçoit l'e-mail : l'organisateur, ou un ami qui a payé sa part. */
  name: string;
  organiser: boolean;
  organiserName: string;
  token: string;
  shareToken: string | null;
  club: { slug: string; name: string; address: string | null };
  event: { title: string; startsAt: string; endsAt: string };
  /** La zone réservée, jamais le numéro de table : le club peut la changer. */
  zone: string;
  partySize: number;
  /** Ce que cette personne a payé, frais compris. */
  amountCents: number;
  /** La table, frais compris. */
  totalCents: number;
  remainingCents: number;
};

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// L'organisateur suit sa réservation ; un ami suit la table par le lien de partage.
const linkOf = (mail: BookingMail) =>
  mail.organiser || !mail.shareToken
    ? `${clubSiteUrl}/${mail.club.slug}/reservation/${mail.token}`
    : `${clubSiteUrl}/${mail.club.slug}/partage/${mail.shareToken}`;

const shareUrl = (mail: BookingMail) =>
  mail.shareToken ? `${clubSiteUrl}/${mail.club.slug}/partage/${mail.shareToken}` : null;

function row(label: string, value: string, strong = false) {
  return `<tr><td style="padding:12px 0;color:#a9aed6;border-top:1px solid #262c55;">${label}</td><td style="padding:12px 0;text-align:right;color:#fff;border-top:1px solid #262c55;${strong ? "font-weight:700;" : ""}">${value}</td></tr>`;
}

type Ledger = "paid" | "refunded";

function layout(
  mail: BookingMail,
  title: string,
  intro: string,
  cta: string,
  extra = "",
  ledger: Ledger = "paid"
) {
  const refunded = ledger === "refunded";
  const night = `${formatNight(mail.event.startsAt)} · ${formatHours(mail.event.startsAt, mail.event.endsAt)}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#070a1c;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#eef0ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070a1c;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121731;border:1px solid #262c55;border-radius:20px;">
<tr><td style="padding:28px 32px 4px;text-align:center;font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:#d9c39a;">${escapeHtml(mail.club.name)}</td></tr>
<tr><td style="padding:12px 32px 0;text-align:center;">
<h1 style="font-weight:800;font-size:26px;letter-spacing:-0.02em;line-height:1.2;margin:0 0 10px;color:#ffffff;">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#b9bee3;">${intro}</p>
</td></tr>
<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
${row("Soirée", escapeHtml(mail.event.title))}
${row("Date", escapeHtml(night))}
${row("Table", `${escapeHtml(mail.zone)} · ${mail.partySize} pers.`)}
${mail.organiser && mail.amountCents !== mail.totalCents ? row("Prix de la table", formatCents(mail.totalCents)) : ""}
${row(refunded ? "Remboursé" : mail.organiser ? "Payé" : "Votre part", formatCents(mail.amountCents), true)}
${!refunded && mail.remainingCents > 0 ? row("Reste à régler", formatCents(mail.remainingCents)) : ""}
</table></td></tr>
${extra}
<tr><td style="padding:20px 32px 8px;text-align:center;"><a href="${linkOf(mail)}" style="display:inline-block;background:#fc6141;color:#160904;text-decoration:none;font-size:15px;font-weight:700;padding:15px 28px;border-radius:999px;">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding:20px 32px 28px;text-align:center;font-size:12px;line-height:1.7;color:#7d83b3;">${escapeHtml(mail.club.name)}${mail.club.address ? ` · ${escapeHtml(mail.club.address)}` : ""}<br>Réservation par Ominin Club</td></tr>
</table></td></tr></table></body></html>`;
}

// Le lien à transmettre aux amis d'une table partagée.
function shareBlock(mail: BookingMail) {
  const url = shareUrl(mail);
  if (!url || mail.remainingCents <= 0) return "";
  return `<tr><td style="padding:20px 32px 0;"><div style="border:1px dashed #d9c39a;border-radius:14px;padding:14px 16px;font-size:14px;line-height:1.6;color:#eef0ff;">Envoyez ce lien à vos amis : chacun paie sa part, jusqu'au début de la soirée.<br><a href="${url}" style="color:#d9c39a;word-break:break-all;">${url}</a></div></td></tr>`;
}

async function send(to: string, subject: string, html: string) {
  if (!mailConfig()) {
    console.info(`[club mail · simulé] à ${to} — ${subject}`);
    return;
  }
  try {
    await sendEmail(to, subject, html);
  } catch (error) {
    console.error("[club mail]", error);
  }
}

export function sendBookingConfirmed(mail: BookingMail) {
  const shared = Boolean(mail.shareToken) && mail.remainingCents > 0;
  return send(
    mail.to,
    `Votre table ${mail.zone} · ${mail.event.title}`,
    layout(
      mail,
      "Votre table est réservée",
      shared
        ? `${escapeHtml(mail.name)}, votre part est payée et la table est à vous. Partagez le lien ci-dessous : ce qui n'est pas payé avant la soirée se règle à l'entrée.`
        : `${escapeHtml(mail.name)}, présentez votre QR code à l'entrée : l'équipe vous accompagne à votre table.`,
      "Voir ma réservation",
      shareBlock(mail)
    )
  );
}

export function sendShareConfirmed(mail: BookingMail) {
  return send(
    mail.to,
    `Votre part est payée · ${mail.event.title}`,
    layout(
      mail,
      "Votre part est payée",
      `${escapeHtml(mail.name)}, vous êtes à la table de ${escapeHtml(mail.organiserName)} : présentez-vous à l'entrée avec votre groupe.`,
      "Voir la table"
    )
  );
}

export function sendSharePaid(mail: BookingMail, friend: string, amountCents: number) {
  return send(
    mail.to,
    `${friend} a payé sa part · ${mail.event.title}`,
    layout(
      mail,
      `${escapeHtml(friend)} a payé sa part`,
      mail.remainingCents > 0
        ? `${formatCents(amountCents)} de plus : il reste ${formatCents(mail.remainingCents)} à régler sur la table.`
        : `${formatCents(amountCents)} de plus : la table est entièrement payée.`,
      "Voir ma réservation",
      shareBlock(mail)
    )
  );
}

export function sendPaymentRefunded(mail: BookingMail) {
  return send(
    mail.to,
    `Remboursement · ${mail.event.title}`,
    layout(
      mail,
      mail.organiser ? "Votre table est remboursée" : "Votre part est remboursée",
      `${escapeHtml(mail.name)}, ${formatCents(mail.amountCents)} reviennent sur votre carte, sous 5 à 10 jours selon votre banque.`,
      "Suivre le remboursement",
      "",
      "refunded"
    )
  );
}

export function sendEventCancelled(mail: BookingMail, refunded: boolean) {
  return send(
    mail.to,
    `Soirée annulée · ${mail.event.title}`,
    layout(
      mail,
      "La soirée est annulée",
      refunded
        ? `${escapeHtml(mail.name)}, ${escapeHtml(mail.club.name)} a annulé la soirée. Ce que vous avez payé vous est remboursé automatiquement, sous 5 à 10 jours selon votre banque.`
        : `${escapeHtml(mail.name)}, ${escapeHtml(mail.club.name)} a annulé la soirée. Votre réservation est annulée.`,
      "Voir ma réservation",
      "",
      refunded ? "refunded" : "paid"
    )
  );
}

export function sendEventChanged(mail: BookingMail) {
  return send(
    mail.to,
    `Nouvel horaire · ${mail.event.title}`,
    layout(
      mail,
      "Votre soirée change d'horaire",
      `${escapeHtml(mail.name)}, votre table vous attend toujours : voici le nouvel horaire. S'il ne vous convient plus, répondez au club, qui peut vous rembourser.`,
      "Voir ma réservation"
    )
  );
}
