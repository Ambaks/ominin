import type { MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import type { Json, Tables } from "@/lib/supabase/database.types";
import type {
  Etablissement,
  Etape,
  Formule,
  Member,
  Order,
  Table,
} from "./types";

/*
 * Conversions lignes Postgres ↔ types du domaine. Le domaine encode
 * l'absence par `undefined` (champs optionnels), la base par `null`.
 */

/** Les colonnes jsonb (options, etapes) sont typées Json côté base. */
export const toJson = (value: unknown): Json => value as Json;

export function rowToEtablissement(
  row: Tables<"etablissements">
): Etablissement {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    address: row.address,
    phone: row.phone,
    hours: row.hours,
    offre: row.offre,
    siret: row.siret ?? undefined,
    // Colonne de la migration 20260709000002 (types à régénérer) ; absente ⇒ false.
    onlinePayment:
      (row as { online_payment?: boolean }).online_payment ?? false,
    // Colonne de la migration 20260817000001 (types à régénérer).
    paymentProvider:
      (row as { payment_provider?: Etablissement["paymentProvider"] })
        .payment_provider ?? null,
    collectSlotCapacity:
      (row as { collect_slot_capacity?: number }).collect_slot_capacity ?? 5,
    googleReviewUrl: row.google_review_url ?? undefined,
  };
}

export function rowToMenuItem(row: Tables<"items">): MenuItem {
  const options = row.options as unknown as OptionGroup[];
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.price),
    image: row.image ?? undefined,
    badges: row.badges.length ? row.badges : undefined,
    pairing: row.pairing ?? undefined,
    detail: row.detail ?? undefined,
    disponible: row.disponible,
    stock: row.stock ?? undefined,
    options: options.length ? options : undefined,
    // Colonne de la migration 20260817000001 (types à régénérer).
    vatRate:
      (row as { vat_rate?: number | string }).vat_rate != null
        ? Number((row as { vat_rate?: number | string }).vat_rate)
        : undefined,
  };
}

/** Assemble les catégories (triées par position) avec leurs items. */
export function assembleCategories(
  categoryRows: Tables<"categories">[],
  itemRows: Tables<"items">[]
): MenuCategory[] {
  return categoryRows.map((category) => ({
    id: category.id,
    name: category.name,
    tagline: category.tagline ?? undefined,
    items: itemRows
      .filter((item) => item.category_id === category.id)
      .map(rowToMenuItem),
  }));
}

export function rowToFormule(row: Tables<"formules">): Formule {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.price),
    disponible: row.disponible,
    etapes: row.etapes as unknown as Etape[],
  };
}

export function rowToTable(row: Tables<"tables">): Table {
  return { id: row.id, number: row.number };
}

export function rowToMember(row: Tables<"memberships">): Member {
  return {
    userId: row.user_id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
  };
}

export type OrderRow = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
};

export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    type: row.type,
    tableId: row.table_id,
    status: row.status,
    createdAt: row.created_at,
    paymentMode: row.payment_mode ?? undefined,
    paidOnline: (row as { paid_online?: boolean }).paid_online ?? false,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    pickupAt: row.pickup_at ?? undefined,
    estimatedReadyAt: row.estimated_ready_at ?? undefined,
    cashGiven: row.cash_given != null ? Number(row.cash_given) : undefined,
    cashChange: row.cash_change != null ? Number(row.cash_change) : undefined,
    tipAmount: row.tip_amount != null ? Number(row.tip_amount) : undefined,
    items: row.order_items.map((line) => {
      const options = line.options as unknown as Order["items"][number]["options"];
      return {
        id: line.id,
        itemId: line.item_id ?? undefined,
        name: line.name,
        quantity: line.quantity,
        unitPrice: Number(line.unit_price),
        options: options && options.length ? options : undefined,
        paidMode: line.paid_mode ?? undefined,
        servedAt: line.served_at ?? undefined,
      };
    }),
  };
}
