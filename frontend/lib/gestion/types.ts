import type { MenuCategory, OptionGroup } from "@/lib/menu-data";

export type Offre = "digital" | "smart" | "connect";
export type Role = "gerant" | "cuisinier" | "serveur";
export type OrderStatus =
  | "en_attente"
  | "en_preparation"
  | "prete"
  | "servie"
  | "payee"
  | "annulee";
export type PaymentMode = "especes" | "carte";

/** Capacités débloquées par l'offre (le menu et les formules sont toujours inclus). */
export type Feature = "commandes" | "tables" | "options" | "roles";

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
  offre: Offre;
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
  tableId: string;
  groupeId?: string | null;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  paymentMode?: PaymentMode;
  /** Déjà réglée par carte via le menu QR (webhook Stripe Connect). */
  paidOnline?: boolean;
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
  /** Statut Stripe brut ("active", "past_due"…) ; null ⇒ jamais souscrit. */
  subscriptionStatus: string | null;
  role: Role;
  categories: MenuCategory[];
  formules: Formule[];
  tables: Table[];
  groups: TableGroup[];
  orders: Order[];
}
