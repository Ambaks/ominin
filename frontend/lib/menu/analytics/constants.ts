/*
 * Mesure d'audience du menu QR. Réglages du mouchard, côté navigateur.
 *
 * Les plafonds de sécurité (débit par restaurant, délai anti-rejeu, purge) ne
 * sont pas ici : ils vivent en littéraux dans menu_track, parce qu'un
 * paramètre exposé à anon serait un plafond choisi par l'appelant.
 */

export type MenuStage =
  | "vue"
  | "categorie"
  | "plat"
  | "panier"
  | "commande"
  | "paiement";

/** L'étape ne recule jamais : seul l'ordre compte, pas la valeur. */
export const STAGE_RANK: Record<MenuStage, number> = {
  vue: 0,
  categorie: 1,
  plat: 2,
  panier: 3,
  commande: 4,
  paiement: 5,
};

/**
 * Battement de cœur d'une visite ouverte. Une addition se consulte plusieurs
 * minutes : c'est le seul moyen de distinguer « attablé » de « parti ».
 */
export const HEARTBEAT_MS = 45_000;

/**
 * Les clics sur les plats partent groupés. On ne veut pas d'un appel réseau
 * par plat consulté sur le téléphone d'un client attablé.
 */
export const CLICK_FLUSH_MS = 1_500;

/**
 * Rétention des visites brutes. Au-delà, seule la consolidation quotidienne
 * subsiste (menu_stats_daily) — la courbe survit, pas le détail.
 */
export const SESSION_RETENTION_DAYS = 35;

/** Rétention des compteurs par plat : treize mois, plafond CNIL. */
export const ITEM_CLICK_RETENTION_DAYS = 400;
