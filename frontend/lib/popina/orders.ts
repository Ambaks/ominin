import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { POPINA } from "./config";

/*
 * Une vente Popina, lue par l'API (GET /v1/orders), devient la charge
 * d'import_till_sales : une commande Ominin servie, ses lignes, ses
 * règlements. Le webhook ne sert qu'à dire quelle vente relire tout de
 * suite — et donne la table, que l'API ne rend pas.
 * Montants Popina en centimes, Ominin en euros.
 */

type Admin = ReturnType<typeof createAdminClient>;

interface ApiItem {
  description: string;
  quantity: number;
  total: number;
  isCanceled: boolean;
  modifiers?: { name: string }[] | null;
}

interface ApiMenu {
  name?: string;
  description?: string;
  total?: number;
  items?: { description: string }[] | null;
}

export interface ApiOrder {
  id: string;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
  isCanceled: boolean;
  isTransferred: boolean;
  isTraining?: boolean;
  items: ApiItem[] | null;
  menus: ApiMenu[] | null;
  payments: { paymentAmount: number; paymentName: string }[] | null;
  tips: number | null;
  externalOrderId: string | null;
}

export interface TillSale {
  popina_order_id: string;
  status: "paid" | "canceled";
  table_name: string | null;
  opened_at: string;
  paid_at: string | null;
  tips: number;
  external_order_id: string | null;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    options: { groupName: string; choiceName: string; supplement: number }[];
  }[];
  payments: { mode: "especes" | "carte"; amount: number }[];
}

const euros = (cents: number | null | undefined) => Math.round(cents ?? 0) / 100;

// La caisse ne nomme pas le groupe d'une option : « Option : Burrata »,
// « Formule : Tiramisu », comme les écrans affichent les choix du menu.
const asOptions = (groupName: string, names: string[]) =>
  names.map((choiceName) => ({ groupName, choiceName, supplement: 0 }));

const paymentMode = (name: string): "especes" | "carte" =>
  POPINA.cashPaymentName.test(name) ? "especes" : "carte";

/**
 * null : rien à importer — vente encore ouverte, ticket de formation, ou
 * transférée sur une note d'hôtel (réglée ailleurs, sans règlement ici).
 */
export function toTillSale(order: ApiOrder, tableName: string | null): TillSale | null {
  if (order.isTraining || order.isTransferred) return null;
  if (!order.isCanceled && !order.closedAt) return null;
  return {
    popina_order_id: order.id.toLowerCase(),
    status: order.isCanceled ? "canceled" : "paid",
    table_name: tableName,
    opened_at: order.openedAt ?? order.createdAt,
    paid_at: order.closedAt,
    tips: Math.max(0, euros(typeof order.tips === "number" ? order.tips : 0)),
    external_order_id: order.externalOrderId,
    items: [
      // Le prix unitaire est celui payé, remises comprises, et non arrondi :
      // la commande totalise ses lignes et doit retomber au centime sur le
      // total de la caisse (3 pour 10 € : 3 × 3,333…, pas 3 × 3,33).
      ...(order.items ?? [])
        .filter((item) => !item.isCanceled && item.quantity > 0)
        .map((item) => {
          const quantity = Math.max(1, Math.round(item.quantity));
          return {
            name: item.description,
            quantity,
            unit_price: Math.max(0, item.total / quantity / 100),
            options: asOptions("Option", (item.modifiers ?? []).map((modifier) => modifier.name)),
          };
        }),
      ...(order.menus ?? []).map((menu) => ({
        name: menu.name ?? menu.description ?? "",
        quantity: 1,
        unit_price: Math.max(0, euros(menu.total)),
        options: asOptions("Formule", (menu.items ?? []).map((item) => item.description)),
      })),
    ].filter((line) => line.name),
    payments: (order.payments ?? [])
      .filter((payment) => payment.paymentAmount > 0)
      .map((payment) => ({
        mode: paymentMode(payment.paymentName),
        amount: euros(payment.paymentAmount),
      })),
  };
}

export async function importTillSales(
  admin: Admin,
  etablissementId: string,
  sales: TillSale[]
): Promise<number> {
  const { data, error } = await admin.rpc("import_till_sales", {
    p_etablissement_id: etablissementId,
    p_sales: sales as unknown as Json,
  });
  if (error) throw new Error(`import_till_sales : ${error.message}`);
  return data;
}
