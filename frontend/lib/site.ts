/**
 * Origine publique du site, source unique pour metadataBase, robots et sitemap.
 * Surchargeable via NEXT_PUBLIC_SITE_URL (préprod/preview) ; retombe sur le
 * domaine de production. Sans slash final pour concaténer proprement les chemins.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ominin.com"
).replace(/\/$/, "");

/**
 * Origine publique du produit menu QR — landing, espace de gestion et menus
 * publics /m/<slug>. C'est là que se connectent les restaurateurs, y compris
 * ceux venus de collect : les liens « Connexion » des autres produits
 * pointent ici.
 *
 * Contrairement à collect et clip (dont les sous-domaines existent déjà en
 * production), le host menu peut être absent : sous-domaine inerte (dev sans
 * réglage, ou retour arrière en production) ⇒ on retombe sur la forme
 * préfixée servie par le domaine principal, jamais sur un host qui ne résout
 * pas. Un host localhost (dev) est servi en http, le serveur de dev n'ayant
 * pas de TLS.
 */
const menuHost = process.env.NEXT_PUBLIC_MENU_HOST;
export const menuSiteUrl = menuHost
  ? `${menuHost.includes("localhost") ? "http" : "https"}://${menuHost}`
  : `${siteUrl}/menu`;

/**
 * L'adresse du menu QR telle qu'elle s'imprime (présentation en PDF, film) :
 * son sous-domaine de production, même rendue par un serveur qui, sans
 * NEXT_PUBLIC_MENU_HOST, sert le menu sous /menu. Le domaine principal
 * redirige sa forme préfixée vers ce sous-domaine (proxy.ts).
 */
export const menuPrintUrl = `https://${process.env.NEXT_PUBLIC_MENU_HOST ?? "menu.ominin.com"}`;

/**
 * Origine publique du sous-domaine clippers, pour les canonicals des pages
 * /clip (accessibles aussi via ominin.com/clip à cause de la réécriture).
 * Dérivée du même host que la réécriture du proxy (NEXT_PUBLIC_CLIP_HOST).
 */
export const clipSiteUrl = `https://${
  process.env.NEXT_PUBLIC_CLIP_HOST ?? "clip.ominin.com"
}`;

/**
 * Origine publique du sous-domaine click & collect, pour le canonical de la
 * landing /collect (accessible aussi via ominin.com/collect) et les liens
 * vers la page d'un établissement, à la racine de ce sous-domaine. Un host
 * localhost (dev) est servi en http.
 */
const collectHost = process.env.NEXT_PUBLIC_COLLECT_HOST ?? "collect.ominin.com";
export const collectSiteUrl = `${collectHost.includes("localhost") ? "http" : "https"}://${collectHost}`;

/**
 * Origine publique d'Ominin Club (club.ominin.com) : pages des clubs, leurs
 * soirées et les réservations de tables. Host absent ⇒ servi sur
 * ominin.com/clubs (/club est la page de présentation aux clubs).
 */
const clubHost = process.env.NEXT_PUBLIC_CLUB_HOST;
export const clubSiteUrl = clubHost
  ? `${clubHost.includes("localhost") ? "http" : "https"}://${clubHost}`
  : `${siteUrl}/clubs`;

/**
 * Origine publique d'Ominin Shop (landing, boutiques /<slug>, espace de
 * gestion). Même repli que menu : host absent ⇒ servi sur ominin.com/shop.
 */
const shopHost = process.env.NEXT_PUBLIC_SHOP_HOST;
export const shopSiteUrl = shopHost
  ? `${shopHost.includes("localhost") ? "http" : "https"}://${shopHost}`
  : `${siteUrl}/shop`;

/**
 * Origine publique du CRM admin interne. Même logique de repli que menu :
 * host absent ⇒ sous-domaine inerte, l'app est servie sur ominin.com/admin.
 */
const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST;
export const adminSiteUrl = adminHost
  ? `${adminHost.includes("localhost") ? "http" : "https"}://${adminHost}`
  : `${siteUrl}/admin`;

/**
 * Origine publique d'Ominin Agents (landing, espace client, retour OAuth
 * Gmail). Même repli que menu : host absent ⇒ servi sur ominin.com/agents.
 */
const agentsHost = process.env.NEXT_PUBLIC_AGENTS_HOST;
export const agentsSiteUrl = agentsHost
  ? `${agentsHost.includes("localhost") ? "http" : "https"}://${agentsHost}`
  : `${siteUrl}/agents`;
