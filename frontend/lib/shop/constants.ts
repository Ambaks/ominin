import type {
  ShopOrderStatus,
  ShopPaymentStatus,
  ShopProductBadge,
  ShopShippingKind,
} from "./types";

/** Quantité maximale d'un même article dans un panier. */
export const CART_MAX_QUANTITY = 10;
/** Clé localStorage du panier, suffixée par le slug de la boutique. */
export const CART_STORAGE_PREFIX = "ominin-shop-cart";
/** Durée de vie d'une session Stripe Checkout (minimum autorisé : 30 min). */
export const CHECKOUT_EXPIRES_MINUTES = 30;
/** En dessous, Stripe refuse le paiement (0,50 €). */
export const CHECKOUT_MIN_TOTAL_CENTS = 50;
/** Photos produit : largeur max avant envoi et qualité WebP. */
export const PHOTO_MAX_WIDTH = 1600;
export const PHOTO_WEBP_QUALITY = 0.86;
/** Ventes par jour affichées sur l'aperçu et fenêtre des indicateurs. */
export const DASHBOARD_CHART_DAYS = 14;
export const DASHBOARD_KPI_DAYS = 30;
/** Seuil de stock déclenchant l'alerte sur l'aperçu. */
export const LOW_STOCK_THRESHOLD = 2;
/** Commandes par page dans la liste de gestion. */
export const ORDERS_PAGE_SIZE = 25;
/** Délai de réponse annoncé aux clientes sur la page Contact. */
export const REPLY_DELAY_LABEL = "sous 24 à 48 heures";
/** Délai légal de rétractation affiché au récapitulatif. */
export const WITHDRAWAL_DAYS = 14;

export const ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending: "En attente de paiement",
  paid: "Payée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const PAYMENT_STATUS_LABELS: Record<ShopPaymentStatus, string> = {
  unpaid: "Non payée",
  paid: "Payée",
  refunded: "Remboursée",
  partially_refunded: "Partiellement remboursée",
  failed: "Échec",
};

export const SHIPPING_KIND_LABELS: Record<ShopShippingKind, string> = {
  home: "À domicile",
  relay: "Point relais",
  pickup: "Remise en main propre",
};

export const BADGE_LABELS: Record<ShopProductBadge, string> = {
  "best-seller": "Best-seller",
  nouveau: "Nouveau",
  "coup-de-coeur": "Coup de cœur",
};

/** Transitions de statut autorisées depuis l'espace de gestion. */
export const ORDER_STATUS_FLOW: Record<ShopOrderStatus, ShopOrderStatus[]> = {
  pending: ["cancelled"],
  paid: ["preparing", "shipped", "delivered", "cancelled"],
  preparing: ["paid", "shipped", "delivered", "cancelled"],
  shipped: ["preparing", "delivered", "cancelled"],
  delivered: ["shipped"],
  cancelled: ["paid"],
  refunded: [],
};

/** Pays proposés à la livraison (code ISO → libellé). */
export const COUNTRY_NAMES: Record<string, string> = {
  FR: "France",
  BE: "Belgique",
  LU: "Luxembourg",
  CH: "Suisse",
  MC: "Monaco",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  NL: "Pays-Bas",
  PT: "Portugal",
};

/**
 * Adresse technique des comptes gérés par téléphone (propriétaires sans
 * e-mail) : Supabase exige un e-mail, celui-ci n'est jamais délivrable.
 */
export const PHONE_LOGIN_DOMAIN = "tel.shop.ominin.local";
