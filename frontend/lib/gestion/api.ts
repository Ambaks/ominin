import type { Badge, MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "./constants";
import { rowToFormule, rowToMenuItem, toJson } from "./mappers";
import { commit, getState } from "./store";
import type {
  Etablissement,
  Formule,
  GestionState,
  Order,
  OrderStatus,
  PaymentMode,
  TableGroup,
} from "./types";

/*
 * Surface de mutation du back-office : chaque fonction écrit dans Supabase
 * (RLS + triggers font autorité) puis répercute le changement sur le
 * snapshot local du store. Les écrans ne connaissent que cette surface.
 */

function apply<T>(recipe: (draft: GestionState) => T): T {
  const draft = structuredClone(getState());
  const result = recipe(draft);
  commit(draft);
  return result;
}

const etablissementId = () => getState().etablissement.id;

function findItem(draft: GestionState, itemId: string) {
  for (const category of draft.categories) {
    const index = category.items.findIndex((item) => item.id === itemId);
    if (index !== -1) return { category, index, item: category.items[index] };
  }
  throw new Error("Article introuvable.");
}

function findGroup(draft: GestionState, groupId: string): TableGroup {
  const group = draft.groups.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error("Groupe introuvable.");
  return group;
}

function assertTransition(order: Order, target: OrderStatus) {
  if (!ORDER_STATUS_FLOW[order.status].includes(target)) {
    throw new Error(
      `Impossible de passer une commande « ${ORDER_STATUS_LABELS[order.status]} » à « ${ORDER_STATUS_LABELS[target]} ».`
    );
  }
}

// ---------------------------------------------------------------------------
// Menu

export interface ItemInput {
  name: string;
  description?: string;
  price: number;
  detail?: string;
  stock: number | null;
  image?: string;
  badges: Badge[];
  pairing?: string;
  options: OptionGroup[];
  categoryId: string;
}

function itemColumns(
  input: ItemInput
): Omit<TablesInsert<"items">, "etablissement_id"> {
  return {
    category_id: input.categoryId,
    name: input.name,
    description: input.description || null,
    price: input.price,
    image: input.image || null,
    badges: input.badges,
    pairing: input.pairing || null,
    detail: input.detail || null,
    stock: input.stock,
    options: toJson(input.options),
  };
}

export async function createItem(input: ItemInput): Promise<MenuItem> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("items")
      .insert({ etablissement_id: etablissementId(), ...itemColumns(input) })
      .select()
      .single()
  );
  const item = rowToMenuItem(row);
  return apply((draft) => {
    const category = draft.categories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.items.push(item);
    return item;
  });
}

export async function updateItem(
  itemId: string,
  input: ItemInput
): Promise<MenuItem> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("items")
      .update(itemColumns(input))
      .eq("id", itemId)
      .select()
      .single()
  );
  const next = rowToMenuItem(row);
  return apply((draft) => {
    const { category, index } = findItem(draft, itemId);
    if (category.id === input.categoryId) {
      category.items[index] = next;
    } else {
      const target = draft.categories.find((c) => c.id === input.categoryId);
      if (!target) throw new Error("Catégorie introuvable.");
      category.items.splice(index, 1);
      target.items.push(next);
    }
    return next;
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("items").delete().eq("id", itemId));
  apply((draft) => {
    const { category, index } = findItem(draft, itemId);
    category.items.splice(index, 1);
  });
}

export async function setItemAvailability(
  itemId: string,
  disponible: boolean
): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("items").update({ disponible }).eq("id", itemId));
  apply((draft) => {
    findItem(draft, itemId).item.disponible = disponible;
  });
}

export async function setItemStock(
  itemId: string,
  stock: number | null
): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("items").update({ stock }).eq("id", itemId));
  apply((draft) => {
    findItem(draft, itemId).item.stock = stock ?? undefined;
  });
}

// ---------------------------------------------------------------------------
// Catégories

export async function createCategory(name: string): Promise<MenuCategory> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("categories")
      .insert({
        etablissement_id: etablissementId(),
        name,
        position: getState().categories.length,
      })
      .select()
      .single()
  );
  return apply((draft) => {
    const category: MenuCategory = { id: row.id, name: row.name, items: [] };
    draft.categories.push(category);
    return category;
  });
}

export async function renameCategory(
  categoryId: string,
  name: string
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.from("categories").update({ name }).eq("id", categoryId)
  );
  apply((draft) => {
    const category = draft.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.name = name;
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const supabase = createClient();
  // Les items de la catégorie partent avec elle (ON DELETE CASCADE).
  check(await supabase.from("categories").delete().eq("id", categoryId));
  apply((draft) => {
    const index = draft.categories.findIndex((c) => c.id === categoryId);
    if (index === -1) throw new Error("Catégorie introuvable.");
    draft.categories.splice(index, 1);
  });
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  const results = await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("categories").update({ position }).eq("id", id)
    )
  );
  for (const result of results) check(result);
  apply((draft) => {
    draft.categories.sort(
      (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
    );
  });
}

export async function updateCategoryTagline(
  categoryId: string,
  tagline: string
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("categories")
      .update({ tagline: tagline.trim() || null })
      .eq("id", categoryId)
  );
  apply((draft) => {
    const category = draft.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.tagline = tagline.trim() || undefined;
  });
}

// ---------------------------------------------------------------------------
// Formules

export type FormuleInput = Omit<Formule, "id">;

function formuleColumns(
  input: FormuleInput
): Omit<TablesInsert<"formules">, "etablissement_id"> {
  return {
    name: input.name,
    description: input.description || null,
    price: input.price,
    disponible: input.disponible,
    etapes: toJson(input.etapes),
  };
}

export async function createFormule(input: FormuleInput): Promise<Formule> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("formules")
      .insert({ etablissement_id: etablissementId(), ...formuleColumns(input) })
      .select()
      .single()
  );
  const formule = rowToFormule(row);
  return apply((draft) => {
    draft.formules.push(formule);
    return formule;
  });
}

export async function updateFormule(
  formuleId: string,
  input: FormuleInput
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("formules")
      .update(formuleColumns(input))
      .eq("id", formuleId)
  );
  apply((draft) => {
    const index = draft.formules.findIndex((f) => f.id === formuleId);
    if (index === -1) throw new Error("Formule introuvable.");
    draft.formules[index] = { id: formuleId, ...input };
  });
}

export async function deleteFormule(formuleId: string): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("formules").delete().eq("id", formuleId));
  apply((draft) => {
    const index = draft.formules.findIndex((f) => f.id === formuleId);
    if (index === -1) throw new Error("Formule introuvable.");
    draft.formules.splice(index, 1);
  });
}

export async function setFormuleAvailability(
  formuleId: string,
  disponible: boolean
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.from("formules").update({ disponible }).eq("id", formuleId)
  );
  apply((draft) => {
    const formule = draft.formules.find((f) => f.id === formuleId);
    if (!formule) throw new Error("Formule introuvable.");
    formule.disponible = disponible;
  });
}

// ---------------------------------------------------------------------------
// Tables

function isActiveOrder(order: Order): boolean {
  return order.status !== "payee" && order.status !== "annulee";
}

export async function createGroup(
  tableIds: string[],
  integrateOrders: boolean
): Promise<TableGroup> {
  const current = getState();
  if (tableIds.length < 2) {
    throw new Error("Un groupe doit contenir au moins deux tables.");
  }
  const taken = new Set(current.groups.flatMap((group) => group.tableIds));
  if (tableIds.some((id) => taken.has(id))) {
    throw new Error("Certaines tables sont déjà dans un groupe.");
  }

  const supabase = createClient();
  const row = must(
    await supabase
      .from("table_groups")
      .insert({ etablissement_id: etablissementId() })
      .select()
      .single()
  );
  check(
    await supabase
      .from("tables")
      .update({ group_id: row.id })
      .in("id", tableIds)
  );
  if (integrateOrders) {
    check(
      await supabase
        .from("orders")
        .update({ group_id: row.id })
        .in("table_id", tableIds)
        .not("status", "in", "(payee,annulee)")
    );
  }

  const group: TableGroup = {
    id: row.id,
    tableIds: [...tableIds],
    createdAt: row.created_at,
  };
  return apply((draft) => {
    draft.groups.push(group);
    if (integrateOrders) {
      for (const order of draft.orders) {
        if (isActiveOrder(order) && tableIds.includes(order.tableId)) {
          order.groupeId = group.id;
        }
      }
    }
    return group;
  });
}

export async function addTableToGroup(
  groupId: string,
  tableId: string
): Promise<void> {
  const current = getState();
  findGroup(current, groupId);
  const taken = new Set(current.groups.flatMap((g) => g.tableIds));
  if (taken.has(tableId)) {
    throw new Error("Cette table est déjà dans un groupe.");
  }
  const supabase = createClient();
  check(
    await supabase.from("tables").update({ group_id: groupId }).eq("id", tableId)
  );
  apply((draft) => {
    findGroup(draft, groupId).tableIds.push(tableId);
  });
}

export async function removeTableFromGroup(
  groupId: string,
  tableId: string
): Promise<void> {
  const group = findGroup(getState(), groupId);
  if (group.tableIds.length <= 2) {
    throw new Error(
      "Un groupe doit contenir au moins deux tables. Dissolvez-le plutôt."
    );
  }
  const supabase = createClient();
  check(
    await supabase.from("tables").update({ group_id: null }).eq("id", tableId)
  );
  check(
    await supabase
      .from("orders")
      .update({ group_id: null })
      .eq("group_id", groupId)
      .eq("table_id", tableId)
  );
  apply((draft) => {
    const draftGroup = findGroup(draft, groupId);
    draftGroup.tableIds = draftGroup.tableIds.filter((id) => id !== tableId);
    for (const order of draft.orders) {
      if (order.groupeId === groupId && order.tableId === tableId) {
        order.groupeId = null;
      }
    }
  });
}

export async function dissolveGroup(groupId: string): Promise<void> {
  findGroup(getState(), groupId);
  const supabase = createClient();
  // tables.group_id et orders.group_id repassent à null via ON DELETE SET NULL.
  check(await supabase.from("table_groups").delete().eq("id", groupId));
  apply((draft) => {
    draft.groups = draft.groups.filter((group) => group.id !== groupId);
    for (const order of draft.orders) {
      if (order.groupeId === groupId) order.groupeId = null;
    }
  });
}

// ---------------------------------------------------------------------------
// Commandes

function findOrder(state: GestionState, orderId: string): Order {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error("Commande introuvable.");
  return order;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  assertTransition(findOrder(getState(), orderId), status);
  const supabase = createClient();
  check(await supabase.from("orders").update({ status }).eq("id", orderId));
  return apply((draft) => {
    const order = findOrder(draft, orderId);
    order.status = status;
    return order;
  });
}

export async function markOrderPaid(
  orderId: string,
  mode: PaymentMode
): Promise<Order> {
  assertTransition(findOrder(getState(), orderId), "payee");
  const supabase = createClient();
  check(
    await supabase
      .from("orders")
      .update({ status: "payee", payment_mode: mode })
      .eq("id", orderId)
  );
  return apply((draft) => {
    const order = findOrder(draft, orderId);
    order.status = "payee";
    order.paymentMode = mode;
    return order;
  });
}

/** Ids des commandes du groupe pouvant passer au statut cible. */
function groupEligibleIds(groupeId: string, target: OrderStatus): string[] {
  return getState()
    .orders.filter(
      (order) =>
        order.groupeId === groupeId &&
        ORDER_STATUS_FLOW[order.status].includes(target)
    )
    .map((order) => order.id);
}

export async function markGroupServed(groupeId: string): Promise<void> {
  const ids = groupEligibleIds(groupeId, "servie");
  if (!ids.length) return;
  const supabase = createClient();
  check(
    await supabase.from("orders").update({ status: "servie" }).in("id", ids)
  );
  apply((draft) => {
    for (const order of draft.orders) {
      if (ids.includes(order.id)) order.status = "servie";
    }
  });
}

export async function markGroupPaid(
  groupeId: string,
  mode: PaymentMode
): Promise<void> {
  const ids = groupEligibleIds(groupeId, "payee");
  if (!ids.length) return;
  const supabase = createClient();
  check(
    await supabase
      .from("orders")
      .update({ status: "payee", payment_mode: mode })
      .in("id", ids)
  );
  apply((draft) => {
    for (const order of draft.orders) {
      if (ids.includes(order.id)) {
        order.status = "payee";
        order.paymentMode = mode;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Établissement

export type EtablissementInput = Omit<
  Etablissement,
  "id" | "slug" | "offre" | "onlinePayment"
>;

export async function updateEtablissement(
  input: EtablissementInput
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("etablissements")
      .update(input)
      .eq("id", etablissementId())
  );
  apply((draft) => {
    Object.assign(draft.etablissement, input);
  });
}

/** Active/désactive le choix « payer par carte » sur le menu QR (gérant). */
export async function setOnlinePayment(enabled: boolean): Promise<void> {
  const supabase = createClient();
  // Colonne ajoutée par la migration 20260709000002 (types à régénérer).
  check(
    await (supabase as unknown as {
      from: (t: string) => ReturnType<typeof supabase.from>;
    })
      .from("etablissements")
      .update({ online_payment: enabled })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.onlinePayment = enabled;
  });
}
