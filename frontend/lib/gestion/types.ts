import type { MenuCategory, OptionGroup } from "@/lib/menu-data";

export type Offre = "digital" | "smart" | "connect";
export type Role = "gerant" | "cuisinier" | "serveur";
/**
 * Sur place : en_attente (à encaisser) → payee (à servir, partie en cuisine)
 * → servie (close). Collect : en_attente → en_preparation → prete → retiree.
 */
export type OrderStatus =
  | "en_attente"
  | "en_preparation"
  | "prete"
  | "servie"
  | "payee"
  | "annulee"
  | "retiree";
export type OrderType = "sur_place" | "collect";
export type PaymentMode = "especes" | "carte" | "en_ligne" | "mixte";
/** Modes d'un encaissement au comptoir (le mixte est dérivé, l'en ligne subi). */
export type EncaissementMode = Extract<PaymentMode, "especes" | "carte">;
/** Fournisseur du paiement à table, au choix du gérant. */
export type PaymentProvider = "stripe" | "sumup";

/**
 * Ce qu'un restaurant a sous la main : les vues de son espace et ce qu'elles
 * contiennent. L'offre souscrite en ouvre le lot habituel, les réglages
 * d'Ominin l'ajustent restaurant par restaurant. Le menu et les formules ne
 * s'y trouvent pas : sans carte, aucun produit ne sert à rien.
 */
export type Feature =
  | "qr"
  | "apercu"
  | "commandes"
  | "paiements"
  | "tables"
  | "badgeage"
  | "terminaux"
  | "options"
  | "roles"
  | "prise_commande";

/** Produits actifs sur l'établissement : ils déterminent les capacités. */
export interface ActiveProducts {
  /** Offre menu & salle souscrite, ou null pour un click & collect seul. */
  offre: Offre | null;
  collect: boolean;
}

/** Actions soumises au rôle de l'utilisateur. */
export type Action =
  | `orders.setStatus:${Exclude<OrderStatus, "en_attente">}`
  | "menu.edit"
  | "menu.availability"
  | "formules.edit"
  | "categories.edit"
  | "etablissement.edit";

export interface Etablissement {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  hours: string;
  /** Null quand l'établissement n'a que le click & collect. */
  offre: Offre | null;
  siret?: string;
  /** Le menu QR propose le règlement par carte (compte de paiement relié). */
  onlinePayment: boolean;
  /** Null tant que le gérant n'a pas choisi ⇒ comportement Stripe historique. */
  paymentProvider: PaymentProvider | null;
  /** Commandes collect max par créneau de retrait (défaut 5). */
  collectSlotCapacity: number;
  /**
   * Un code d'accès est posé : l'espace démarre alors en vue salle sur chaque
   * appareil, et les écrans du gérant se déverrouillent au code. Sans code,
   * rien ne change.
   */
  adminPinSet: boolean;
  /** Lien « laisser un avis » de la fiche Google Business, proposé en bas du menu QR. */
  googleReviewUrl?: string;
}

export interface OrderItemOption {
  groupName: string;
  choiceName: string;
  supplement: number;
}

export interface OrderItem {
  id: string;
  itemId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: OrderItemOption[];
  /** Mode de règlement de la ligne ; absent tant qu'elle n'est pas encaissée. */
  paidMode?: PaymentMode;
  /** ISO — absent tant que la ligne n'est pas arrivée à table. */
  servedAt?: string;
}

export interface Order {
  id: string;
  type: OrderType;
  tableId: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  paymentMode?: PaymentMode;
  paidOnline?: boolean;
  customerName?: string;
  customerPhone?: string;
  pickupAt?: string;
  /** Prête vers (ISO) — posée à l'acceptation d'une commande collect « dès que possible ». */
  estimatedReadyAt?: string;
  cashGiven?: number;
  cashChange?: number;
  tipAmount?: number;
}

export interface Table {
  id: string;
  number: number;
}

export interface Member {
  userId: string;
  email: string;
  role: Role;
  displayName: string | null;
}

/**
 * Quelqu'un qui travaille ici, avec ou sans compte. C'est la fiche que le
 * planning et les badgeages désignent : en salle, un serveur n'a pas besoin
 * d'adresse e-mail pour figurer au planning ni pour pointer.
 */
export interface Staff {
  id: string;
  name: string;
  role: Role;
  /** Compte associé, s'il en a un. */
  userId: string | null;
  /** Jeton de son lien de planning, à lui transmettre une fois. */
  planningToken: string;
}

export interface Article {
  id: string;
  name: string;
  detail?: string;
  supplement: number;
  itemId?: string;
  options?: OptionGroup[];
}

export interface Etape {
  id: string;
  name: string;
  obligatoire: boolean;
  articles: Article[];
}

export interface Formule {
  id: string;
  name: string;
  description?: string;
  price: number;
  disponible: boolean;
  etapes: Etape[];
}

export interface GestionState {
  etablissement: Etablissement;
  /** Statut Stripe de l'abonnement offre ("active", "past_due"…) ; null ⇒ jamais souscrit. */
  subscriptionStatus: string | null;
  /** Statut Stripe de l'abonnement click & collect. */
  collectSubscriptionStatus: string | null;
  userId: string;
  role: Role;
  /** Capacités résolues : l'offre, ajustée par les réglages d'Ominin. */
  features: Record<Feature, boolean>;
  members: Member[];
  /** Équipe au sens du service : comptes et serveurs sans compte confondus. */
  staff: Staff[];
  categories: MenuCategory[];
  formules: Formule[];
  tables: Table[];
  orders: Order[];
}
