/*
 * Les établissements dont Ominin a développé le site. Sans lui, les capacités
 * « Site web » et « Réservations » restent grisées dans l'admin.
 */
const BESPOKE_SITE_SLUGS = ["boho"];

export const hasBespokeSite = (slug: string) => BESPOKE_SITE_SLUGS.includes(slug);
