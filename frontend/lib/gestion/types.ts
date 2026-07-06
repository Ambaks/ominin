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
  | "categories.edit";

export interface Etablissement {
  slug: string;
  name: string;
  offre: Offre;
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
  version: number;
  etablissement: Etablissement;
  role: Role;
  categories: MenuCategory[];
  formules: Formule[];
  tables: Table[];
  groups: TableGroup[];
  orders: Order[];
}
