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
  name: string;
  token: string;
  club: { slug: string; name: string; address: string | null };
  event: { title: string; startsAt: string; endsAt: string };
  table: { label: string; zone: string };
  partySize: number;
  totalCents: number;
};

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const bookingUrl = (mail: BookingMail) =>
  `${clubSiteUrl}/${mail.club.slug}/reservation/${mail.token}`;

function layout(mail: BookingMail, title: string, intro: string, cta: string) {
  const night = `${formatNight(mail.event.startsAt)} · ${formatHours(mail.event.startsAt, mail.event.endsAt)}`;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#070a1c;font-family:Arial,Helvetica,sans-serif;color:#eef0ff;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070a1c;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0e1330;border:1px solid #262c55;border-radius:20px;">
<tr><td style="padding:28px 32px 4px;text-align:center;font-size:12px;letter-spacing:0.42em;text-transform:uppercase;color:#d9c39a;">${escapeHtml(mail.club.name)}</td></tr>
<tr><td style="padding:12px 32px 0;text-align:center;">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;margin:0 0 10px;color:#ffffff;">${escapeHtml(title)}</h1>
<p style="margin:0 0 20px;font-size:14.5px;line-height:1.7;color:#a9aed6;">${intro}</p>
</td></tr>
<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #262c55;">
<tr><td style="padding:12px 0;color:#a9aed6;">Soirée</td><td style="padding:12px 0;text-align:right;color:#fff;">${escapeHtml(mail.event.title)}</td></tr>
<tr><td style="padding:0 0 12px;color:#a9aed6;">Date</td><td style="padding:0 0 12px;text-align:right;color:#fff;">${escapeHtml(night)}</td></tr>
<tr><td style="padding:12px 0;color:#a9aed6;border-top:1px solid #262c55;">Table</td><td style="padding:12px 0;text-align:right;color:#fff;border-top:1px solid #262c55;">${escapeHtml(mail.table.zone)} · ${escapeHtml(mail.table.label)} · ${mail.partySize} pers.</td></tr>
<tr><td style="padding:12px 0;color:#a9aed6;border-top:1px solid #262c55;">Total</td><td style="padding:12px 0;text-align:right;color:#fff;font-weight:700;border-top:1px solid #262c55;">${formatCents(mail.totalCents)}</td></tr>
</table></td></tr>
<tr><td style="padding:20px 32px 8px;text-align:center;"><a href="${bookingUrl(mail)}" style="display:inline-block;background:#d9c39a;color:#070a1c;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;padding:15px 28px;border-radius:999px;">${escapeHtml(cta)}</a></td></tr>
<tr><td style="padding:20px 32px 28px;text-align:center;font-size:12px;line-height:1.7;color:#6f75a3;">${escapeHtml(mail.club.name)}${mail.club.address ? ` · ${escapeHtml(mail.club.address)}` : ""}<br>Réservation par Ominin Club</td></tr>
</table></td></tr></table></body></html>`;
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
  return send(
    mail.to,
    `Votre table ${mail.table.label} · ${mail.event.title}`,
    layout(
      mail,
      "Votre table est réservée",
      `${escapeHtml(mail.name)}, présentez votre QR code à l'entrée : l'équipe vous accompagne à votre table.`,
      "Voir ma réservation"
    )
  );
}

export function sendBookingRefunded(mail: BookingMail) {
  return send(
    mail.to,
    `Remboursement · ${mail.event.title}`,
    layout(
      mail,
      "Votre table est remboursée",
      `${escapeHtml(mail.name)}, ${formatCents(mail.totalCents)} reviennent sur votre carte, sous 5 à 10 jours selon votre banque.`,
      "Suivre le remboursement"
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
        ? `${escapeHtml(mail.name)}, ${escapeHtml(mail.club.name)} a annulé la soirée. Votre table est remboursée automatiquement : ${formatCents(mail.totalCents)}, sous 5 à 10 jours selon votre banque.`
        : `${escapeHtml(mail.name)}, ${escapeHtml(mail.club.name)} a annulé la soirée. Votre réservation est annulée.`,
      "Voir ma réservation"
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
