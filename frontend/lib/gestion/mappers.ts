import type { MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import type { Json, Tables } from "@/lib/supabase/database.types";
import type {
  Etablissement,
  Etape,
  Formule,
  Order,
  Table,
  TableGroup,
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
    // Colonne de la migration 20260709000002 (types à régénérer) ; absente ⇒ false.
    onlinePayment:
      (row as { online_payment?: boolean }).online_payment ?? false,
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

/** Reconstruit TableGroup.tableIds depuis la colonne tables.group_id. */
export function assembleGroups(
  groupRows: Tables<"table_groups">[],
  tableRows: Tables<"tables">[]
): TableGroup[] {
  return groupRows.map((group) => ({
    id: group.id,
    createdAt: group.created_at,
    tableIds: tableRows
      .filter((table) => table.group_id === group.id)
      .map((table) => table.id),
  }));
}

export type OrderRow = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
};

export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    tableId: row.table_id,
    groupeId: row.group_id,
    status: row.status,
    createdAt: row.created_at,
    paymentMode: row.payment_mode ?? undefined,
    // Colonne de la migration 20260709000002 (types à régénérer) ; absente ⇒ false.
    paidOnline: (row as { paid_online?: boolean }).paid_online ?? false,
    items: row.order_items.map((line) => {
      const options = line.options as unknown as Order["items"][number]["options"];
      return {
        id: line.id,
        itemId: line.item_id ?? undefined,
        name: line.name,
        quantity: line.quantity,
        unitPrice: Number(line.unit_price),
        options: options && options.length ? options : undefined,
      };
    }),
  };
}
