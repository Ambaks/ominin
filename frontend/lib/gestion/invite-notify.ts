const MAIL_API_URL = process.env.RESEND_API_URL ?? "https://api.resend.com";
const MAIL_TIMEOUT_MS = 10_000;

const ROLE_LABELS: Record<string, string> = {
  gerant: "gérant",
  cuisinier: "cuisinier",
  serveur: "serveur",
};

function mailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_NOTIFY_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function sendEmail(to: string, subject: string, html: string) {
  const config = mailConfig();
  if (!config) return;

  const response = await fetch(`${MAIL_API_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [to],
      subject,
      html,
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function card(heading: string, body: string, cta: { label: string; url: string }, footer: string) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="light"/></head>
<body style="margin:0;padding:0;background-color:#f6efe2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6efe2;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td align="center" style="padding-bottom:24px;">
  <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#b5502a;letter-spacing:0.02em;">Ominin</span>
</td></tr>
<tr><td style="background-color:#fdf8ec;border:1px solid #e5dcc9;border-radius:16px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td height="4" style="background-color:#b5502a;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:40px 40px 36px 40px;">
  <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.24em;text-transform:uppercase;color:#b07a10;">
    &Eacute;quipe
  </p>
  <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;color:#261e13;">
    ${heading}
  </h1>
  <p style="margin:0 0 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#6f5f4b;">
    ${body}
  </p>
  <table role="presentation" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="border-radius:999px;background-color:#b5502a;">
    <a href="${cta.url}" style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#fdf8ec;text-decoration:none;border-radius:999px;">
      ${cta.label}
    </a>
  </td></tr>
  </table>
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:24px 24px 0 24px;">
  <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#a3927a;">
    ${footer}
  </p>
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a3927a;">
    Ominin &mdash; menus, commande et paiement &agrave; table.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendInviteEmail(
  email: string,
  restaurantName: string,
  role: string,
  actionLink: string,
) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const name = escapeHtml(restaurantName);
  await sendEmail(
    email,
    `${restaurantName} vous invite à rejoindre son équipe`,
    card(
      "Rejoignez l&rsquo;&eacute;quipe.",
      `<strong>${name}</strong> vous invite en tant que <strong>${roleLabel}</strong>. Cr&eacute;ez votre acc&egrave;s pour commencer.`,
      { label: "Créer mon accès", url: actionLink },
      "Vous n&rsquo;&ecirc;tes pas concern&eacute;&nbsp;? Ignorez simplement cet email.",
    ),
  );
}

export async function sendTeamNotification(
  email: string,
  restaurantName: string,
  role: string,
  dashboardUrl: string,
) {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const name = escapeHtml(restaurantName);
  await sendEmail(
    email,
    `${restaurantName} vous a ajouté à son équipe`,
    card(
      "Bienvenue dans l&rsquo;&eacute;quipe.",
      `<strong>${name}</strong> vous a ajout&eacute; en tant que <strong>${roleLabel}</strong>. Connectez-vous pour acc&eacute;der &agrave; l&rsquo;espace de gestion.`,
      { label: "Accéder à l’espace", url: dashboardUrl },
      "Vous recevez cet email car un g&eacute;rant vous a ajout&eacute; &agrave; son &eacute;quipe sur Ominin.",
    ),
  );
}
