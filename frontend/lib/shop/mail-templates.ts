import { REPLY_DELAY_LABEL } from "./constants";
import { countryName, formatPrice } from "./format";
import { DEFAULT_PALETTE, resolveTheme } from "./theme";
import type { Address, OrderItemOption, RelayPoint, Shop, ShopOrder, ShopOrderItem } from "./types";

/*
 * Gabarits HTML des e-mails d'une boutique, aux couleurs de son thème.
 * Tout champ saisi par une cliente ou une gérante passe par escapeHtml.
 */

export interface MailContext {
  shop: Shop;
  /** Origine publique de la boutique (https://shop.ominin.com/mybox). */
  shopUrl: string;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const nl2br = (value: string | null | undefined) => escapeHtml(value).replace(/\n/g, "<br>");

function layout(ctx: MailContext, options: { title: string; intro?: string; body: string; cta?: { label: string; url: string } }) {
  const p = { ...DEFAULT_PALETTE, ...resolveTheme(ctx.shop.theme).palette };
  const { title, intro, body, cta } = options;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${p.bg};font-family:Georgia,'Times New Roman',serif;color:${p.ink};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${p.bg};padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${p.paper};border:1px solid ${p.line};border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px 8px;text-align:center;">
<div style="font-size:28px;color:${p.accentDeep};font-weight:600;">${escapeHtml(ctx.shop.name)}</div>
${ctx.shop.tagline ? `<div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${p.inkSoft};margin-top:6px;">${escapeHtml(ctx.shop.tagline)}</div>` : ""}
</td></tr>
<tr><td style="padding:16px 32px 0;font-family:Arial,sans-serif;">
<h1 style="font-family:Georgia,serif;font-weight:500;font-size:24px;line-height:1.25;margin:0 0 12px;">${escapeHtml(title)}</h1>
${intro ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${p.inkSoft};">${intro}</p>` : ""}
</td></tr>
<tr><td style="padding:0 32px 8px;font-family:Arial,sans-serif;font-size:14.5px;line-height:1.7;">${body}</td></tr>
${cta ? `<tr><td style="padding:16px 32px 8px;text-align:center;"><a href="${cta.url}" style="display:inline-block;background:${p.accent};color:${p.paper};text-decoration:none;font-family:Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;padding:15px 28px;border-radius:999px;">${escapeHtml(cta.label)}</a></td></tr>` : ""}
<tr><td style="padding:24px 32px 28px;text-align:center;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:${p.inkSoft};border-top:1px solid ${p.line};">
${escapeHtml(ctx.shop.name)} · <a href="${ctx.shopUrl}" style="color:${p.accentDeep};">${escapeHtml(ctx.shopUrl.replace(/^https?:\/\//, ""))}</a>
${ctx.shop.contact_email ? `<br>Une question ? <a href="mailto:${escapeHtml(ctx.shop.contact_email)}" style="color:${p.accentDeep};">${escapeHtml(ctx.shop.contact_email)}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(items: ShopOrderItem[], order: ShopOrder, line: string, soft: string): string {
  const rows = items
    .map((item) => {
      const options = (item.options as OrderItemOption[] | null) ?? [];
      return `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${line};"><div style="font-weight:600;">${escapeHtml(item.product_name)}</div>${
        options.length ? `<div style="font-size:12px;color:${soft};">${options.map((o) => `${escapeHtml(o.label)} : ${escapeHtml(o.value)}`).join(" · ")}</div>` : ""
      }<div style="font-size:12px;color:${soft};">Quantité : ${item.quantity}</div></td>
<td style="padding:10px 0;border-bottom:1px solid ${line};text-align:right;white-space:nowrap;font-weight:600;">${formatPrice(item.total_cents)}</td></tr>`;
    })
    .join("");
  const discount =
    order.discount_cents > 0
      ? `<tr><td style="padding:6px 0;color:${soft};">Réduction${order.discount_code ? ` (${escapeHtml(order.discount_code)})` : ""}</td><td style="padding:6px 0;text-align:right;">- ${formatPrice(order.discount_cents)}</td></tr>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}
<tr><td style="padding:12px 0 6px;color:${soft};">Sous-total</td><td style="padding:12px 0 6px;text-align:right;">${formatPrice(order.subtotal_cents)}</td></tr>${discount}
<tr><td style="padding:6px 0;color:${soft};">Livraison${order.shipping_method_name ? ` · ${escapeHtml(order.shipping_method_name)}` : ""}</td><td style="padding:6px 0;text-align:right;">${order.shipping_cents === 0 ? "Offerte" : formatPrice(order.shipping_cents)}</td></tr>
<tr><td style="padding:10px 0 0;font-weight:600;font-size:16px;border-top:1px solid ${line};">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:600;font-size:16px;border-top:1px solid ${line};">${formatPrice(order.total_cents)}</td></tr></table>`;
}

function addressBlock(order: ShopOrder): string {
  if (order.shipping_kind === "pickup") return `<p style="margin:0;">Remise en main propre : nous te contactons pour convenir d'un créneau.</p>`;
  if (order.shipping_kind === "relay" && order.relay_point) {
    const r = order.relay_point as unknown as RelayPoint;
    return `<p style="margin:0;"><strong>Point relais</strong><br>${escapeHtml(r.name)}<br>${escapeHtml(r.address)}<br>${escapeHtml(r.postal_code)} ${escapeHtml(r.city)}${r.code ? `<br>Code : ${escapeHtml(r.code)}` : ""}</p>`;
  }
  const a = order.shipping_address as unknown as Address | null;
  if (!a) return "";
  return `<p style="margin:0;"><strong>Adresse de livraison</strong><br>${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}<br>${escapeHtml(a.line1)}${a.line2 ? `<br>${escapeHtml(a.line2)}` : ""}<br>${escapeHtml(a.postal_code)} ${escapeHtml(a.city)}<br>${escapeHtml(countryName(a.country))}</p>`;
}

const trackingUrl = (ctx: MailContext, order: ShopOrder) =>
  `${ctx.shopUrl}/suivi?commande=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.email)}`;

export function orderConfirmationMail(ctx: MailContext, order: ShopOrder, items: ShopOrderItem[]) {
  const p = resolveTheme(ctx.shop.theme).palette;
  return {
    subject: `Ta commande ${order.order_number} est confirmée`,
    html: layout(ctx, {
      title: `Merci ${escapeHtml(order.first_name ?? "")}, ta commande est en préparation`,
      intro: "Ta commande est bien enregistrée et payée. Elle est préparée avec soin et tu recevras un e-mail dès qu'elle sera expédiée.",
      body: `<p style="margin:0 0 16px;">Numéro de commande : <strong>${escapeHtml(order.order_number)}</strong></p>${itemsTable(items, order, p.line, p.inkSoft)}<div style="margin-top:20px;">${addressBlock(order)}</div>${
        order.is_gift ? `<p style="margin:16px 0 0;font-size:13px;color:${p.inkSoft};">Commande cadeau : aucun prix ne figurera dans le colis.</p>` : ""
      }${order.gift_message ? `<p style="margin:12px 0 0;padding:14px 16px;background:${p.bg};border-radius:12px;font-style:italic;">« ${nl2br(order.gift_message)} »</p>` : ""}`,
      cta: { label: "Suivre ma commande", url: trackingUrl(ctx, order) },
    }),
  };
}

export function orderShippedMail(ctx: MailContext, order: ShopOrder) {
  return {
    subject: `Ta commande ${order.order_number} est expédiée`,
    html: layout(ctx, {
      title: "Ta commande vient de partir",
      intro: "Elle a été préparée avec soin et vient d'être confiée au transporteur.",
      body: `<p style="margin:0 0 12px;">Commande <strong>${escapeHtml(order.order_number)}</strong></p>${
        order.tracking_number ? `<p style="margin:0 0 12px;">Numéro de suivi : <strong>${escapeHtml(order.tracking_number)}</strong>${order.carrier ? ` (${escapeHtml(order.carrier)})` : ""}</p>` : ""
      }<div style="margin-top:8px;">${addressBlock(order)}</div>`,
      cta: order.tracking_url
        ? { label: "Suivre mon colis", url: order.tracking_url }
        : { label: "Voir ma commande", url: trackingUrl(ctx, order) },
    }),
  };
}

export function newOrderNotificationMail(ctx: MailContext, order: ShopOrder, items: ShopOrderItem[]) {
  const p = resolveTheme(ctx.shop.theme).palette;
  return {
    subject: `Nouvelle commande ${order.order_number} · ${formatPrice(order.total_cents)}`,
    html: layout(ctx, {
      title: `Nouvelle commande ${escapeHtml(order.order_number)}`,
      body: `<p style="margin:0 0 12px;"><strong>${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}</strong> · ${escapeHtml(order.email)}${order.phone ? ` · ${escapeHtml(order.phone)}` : ""}</p>${itemsTable(items, order, p.line, p.inkSoft)}<div style="margin-top:20px;">${addressBlock(order)}</div>${
        order.gift_message ? `<p style="margin:12px 0 0;padding:14px 16px;background:${p.bg};border-radius:12px;"><strong>Mot doux à glisser :</strong><br>${nl2br(order.gift_message)}</p>` : ""
      }${order.customer_note ? `<p style="margin:12px 0 0;"><strong>Note de la cliente :</strong><br>${nl2br(order.customer_note)}</p>` : ""}`,
      cta: { label: "Ouvrir dans l'espace de gestion", url: `${ctx.shopUrl.replace(/\/[^/]+$/, "")}/gestion/commandes/${order.id}` },
    }),
  };
}

export function contactAcknowledgementMail(ctx: MailContext, name: string, message: string) {
  const p = resolveTheme(ctx.shop.theme).palette;
  return {
    subject: "On a bien reçu ton message",
    html: layout(ctx, {
      title: `Merci ${escapeHtml(name)}, ton message est bien arrivé`,
      intro: `On te répond au plus vite, généralement ${REPLY_DELAY_LABEL}. Voici une copie de ton message :`,
      body: `<p style="margin:0;padding:14px 16px;background:${p.bg};border-radius:12px;">${nl2br(message)}</p>`,
    }),
  };
}

export function newMessageNotificationMail(
  ctx: MailContext,
  input: { name: string; email: string; subject: string | null; message: string; conversationId: string }
) {
  const p = resolveTheme(ctx.shop.theme).palette;
  return {
    subject: `Nouveau message de ${input.name}${input.subject ? ` · ${input.subject}` : ""}`,
    html: layout(ctx, {
      title: "Nouveau message d'une cliente",
      intro: `${escapeHtml(input.name)} · ${escapeHtml(input.email)}`,
      body: `<p style="margin:0;padding:14px 16px;background:${p.bg};border-radius:12px;">${nl2br(input.message)}</p>`,
      cta: { label: "Répondre", url: `${ctx.shopUrl.replace(/\/[^/]+$/, "")}/gestion/messages/${input.conversationId}` },
    }),
  };
}

export function shopReplyMail(ctx: MailContext, input: { customerName: string | null; reply: string; conversationId: string; hasAccount: boolean }) {
  const p = resolveTheme(ctx.shop.theme).palette;
  return {
    subject: `Réponse de ${ctx.shop.name} à ton message`,
    html: layout(ctx, {
      title: `Bonjour ${escapeHtml(input.customerName ?? "")}`.trim(),
      body: `<p style="margin:0 0 16px;">${nl2br(input.reply)}</p><p style="margin:0;font-size:13px;color:${p.inkSoft};">Tu peux répondre directement à cet e-mail${
        input.hasAccount ? ` ou depuis <a href="${ctx.shopUrl}/compte/messages/${input.conversationId}" style="color:${p.accentDeep};">ton espace</a>` : ""
      }.</p>`,
    }),
  };
}
