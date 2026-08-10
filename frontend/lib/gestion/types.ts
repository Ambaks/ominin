import type { MenuCategory, OptionGroup } from "@/lib/menu-data";

export type Offre = "digital" | "smart" | "connect";
export type Role = "gerant" | "cuisinier" | "serveur";
export type OrderStatus =
  | "en_attente"
  | "en_preparation"
  | "prete"
  | "servie"
  | "payee"
  | "annulee"
  | "retiree";
export type OrderType = "sur_place" | "collect";
export type PaymentMode = "especes" | "carte" | "en_ligne";

/**
 * Capacités débloquées par les produits souscrits (le menu et les formules
 * sont toujours inclus — sans carte, aucun produit ne sert à rien).
 */
export type Feature = "commandes" | "tables" | "options" | "roles" | "qr";

/** Produits actifs sur l'établissement : ils déterminent les capacités. */
export interface ActiveProducts {
  /** Offre menu & salle souscrite, ou null pour un click & collect seul. */
  offre: Offre | null;
  collect: boolean;
}

/** Actions soumises au rôle de l'utilisateur. */
export type Action =
  | `orders.setStatus:${Exclude<OrderStatus, "en_attente">}`
  | "tables.group"
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
  /** Le menu QR propose le règlement par carte (Stripe Connect relié). */
  onlinePayment: boolean;
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
}

export interface Order {
  id: string;
  type: OrderType;
  tableId: string | null;
  groupeId?: string | null;
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
}

export interface Table {
  id: string;
  number: number;
}

export interface TableGroup {
  id: string;
  tableIds: string[];
  createdAt: string;
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
  role: Role;
  categories: MenuCategory[];
  formules: Formule[];
  tables: Table[];
  groups: TableGroup[];
  orders: Order[];
}
