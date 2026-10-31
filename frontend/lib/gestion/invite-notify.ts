import { sendEmail } from "@/lib/gmail";
import type { Role } from "./types";

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function card(
  heading: string,
  body: string,
  cta: { label: string; url: string },
  footer: string,
  eyebrow = "&Eacute;quipe",
) {
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
    ${eyebrow}
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

/*
 * L'email nomme le rôle et ce qu'il ouvre (UX-SIMPLICITE § 3.12) : la
 * première chose qu'un serveur lit d'Ominin dit déjà ce qu'il fera. En
 * boutique à emporter (`pickup`), serveur et cuisinier deviennent comptoir et
 * préparation, comme dans l'espace.
 */
interface RoleInvite {
  /** « comme serveur », « au comptoir », « en préparation ». */
  verb: string;
  title: string;
  body: string;
}

const ROLE_INVITE: Record<Role, RoleInvite> = {
  gerant: {
    verb: "comme",
    title: "gérant",
    body: "vous aurez la main sur la carte, l’équipe, les encaissements et les réglages",
  },
  serveur: {
    verb: "comme",
    title: "serveur",
    body: "vous encaisserez et servirez les tables depuis la tablette de la salle",
  },
  cuisinier: {
    verb: "comme",
    title: "cuisinier",
    body: "vous verrez les commandes en cuisine et marquerez les plats épuisés",
  },
};

const PICKUP_ROLE_INVITE: Record<Role, RoleInvite> = {
  gerant: ROLE_INVITE.gerant,
  serveur: {
    verb: "au",
    title: "comptoir",
    body: "vous prendrez les commandes, encaisserez et remettrez les retraits",
  },
  cuisinier: {
    verb: "en",
    title: "préparation",
    body: "vous verrez ce qu’il reste à préparer, jour par jour, et marquerez les articles épuisés",
  },
};

export async function sendInviteEmail(
  email: string,
  restaurantName: string,
  role: Role,
  actionLink: string,
  pickup = false,
) {
  const name = escapeHtml(restaurantName);
  const invite = (pickup ? PICKUP_ROLE_INVITE : ROLE_INVITE)[role];
  await sendEmail(
    email,
    `${restaurantName} vous invite ${invite.verb} ${invite.title}`,
    card(
      "Rejoignez l&rsquo;&eacute;quipe.",
      `<strong>${name}</strong> vous invite ${invite.verb} <strong>${invite.title}</strong>&nbsp;: ${invite.body}. Acceptez l&rsquo;invitation pour ouvrir l&rsquo;espace de gestion.`,
      { label: "Accepter l’invitation", url: actionLink },
      "Vous n&rsquo;&ecirc;tes pas concern&eacute;&nbsp;? Ignorez simplement cet email.",
    ),
  );
}
