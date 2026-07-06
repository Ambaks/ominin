import type { Badge, MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "./constants";
import { seed } from "./seed";
import { commit, getState } from "./store";
import type {
  Etablissement,
  Formule,
  GestionState,
  Offre,
  Order,
  OrderStatus,
  PaymentMode,
  Role,
  TableGroup,
} from "./types";

/*
 * Surface de mutation du back-office. Toutes les fonctions sont async bien
 * qu'elles résolvent immédiatement : les appelants (`await api.x()` + toast +
 * try/catch) resteront identiques quand Supabase remplacera localStorage.
 */

function update<T>(recipe: (draft: GestionState) => T): T {
  const draft = structuredClone(getState());
  const result = recipe(draft);
  commit(draft);
  return result;
}

function findItem(draft: GestionState, itemId: string) {
  for (const category of draft.categories) {
    const index = category.items.findIndex((item) => item.id === itemId);
    if (index !== -1) return { category, index, item: category.items[index] };
  }
  throw new Error("Article introuvable.");
}

function findOrder(draft: GestionState, orderId: string): Order {
  const order = draft.orders.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error("Commande introuvable.");
  return order;
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

function buildItem(input: ItemInput, id: string, disponible?: boolean): MenuItem {
  return {
    id,
    name: input.name,
    description: input.description || undefined,
    price: input.price,
    image: input.image || undefined,
    badges: input.badges.length ? input.badges : undefined,
    pairing: input.pairing || undefined,
    detail: input.detail || undefined,
    disponible,
    stock: input.stock ?? undefined,
    options: input.options.length ? input.options : undefined,
  };
}

export async function createItem(input: ItemInput): Promise<MenuItem> {
  return update((draft) => {
    const category = draft.categories.find((c) => c.id === input.categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    const item = buildItem(input, crypto.randomUUID());
    category.items.push(item);
    return item;
  });
}

export async function updateItem(
  itemId: string,
  input: ItemInput
): Promise<MenuItem> {
  return update((draft) => {
    const { category, index, item } = findItem(draft, itemId);
    const next = buildItem(input, itemId, item.disponible);
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
  update((draft) => {
    const { category, index } = findItem(draft, itemId);
    category.items.splice(index, 1);
  });
}

export async function setItemAvailability(
  itemId: string,
  disponible: boolean
): Promise<void> {
  update((draft) => {
    findItem(draft, itemId).item.disponible = disponible;
  });
}

export async function setItemStock(
  itemId: string,
  stock: number | null
): Promise<void> {
  update((draft) => {
    findItem(draft, itemId).item.stock = stock ?? undefined;
  });
}

// ---------------------------------------------------------------------------
// Catégories

export async function createCategory(name: string): Promise<MenuCategory> {
  return update((draft) => {
    const category: MenuCategory = { id: crypto.randomUUID(), name, items: [] };
    draft.categories.push(category);
    return category;
  });
}

export async function renameCategory(
  categoryId: string,
  name: string
): Promise<void> {
  update((draft) => {
    const category = draft.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.name = name;
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  update((draft) => {
    const index = draft.categories.findIndex((c) => c.id === categoryId);
    if (index === -1) throw new Error("Catégorie introuvable.");
    draft.categories.splice(index, 1);
  });
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  update((draft) => {
    draft.categories.sort(
      (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
    );
  });
}

export async function updateCategoryTagline(
  categoryId: string,
  tagline: string
): Promise<void> {
  update((draft) => {
    const category = draft.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.tagline = tagline.trim() || undefined;
  });
}

// ---------------------------------------------------------------------------
// Formules

export type FormuleInput = Omit<Formule, "id">;

export async function createFormule(input: FormuleInput): Promise<Formule> {
  return update((draft) => {
    const formule: Formule = { id: crypto.randomUUID(), ...input };
    draft.formules.push(formule);
    return formule;
  });
}

export async function updateFormule(
  formuleId: string,
  input: FormuleInput
): Promise<void> {
  update((draft) => {
    const index = draft.formules.findIndex((f) => f.id === formuleId);
    if (index === -1) throw new Error("Formule introuvable.");
    draft.formules[index] = { id: formuleId, ...input };
  });
}

export async function deleteFormule(formuleId: string): Promise<void> {
  update((draft) => {
    const index = draft.formules.findIndex((f) => f.id === formuleId);
    if (index === -1) throw new Error("Formule introuvable.");
    draft.formules.splice(index, 1);
  });
}

export async function setFormuleAvailability(
  formuleId: string,
  disponible: boolean
): Promise<void> {
  update((draft) => {
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
  return update((draft) => {
    if (tableIds.length < 2) {
      throw new Error("Un groupe doit contenir au moins deux tables.");
    }
    const taken = new Set(draft.groups.flatMap((group) => group.tableIds));
    if (tableIds.some((id) => taken.has(id))) {
      throw new Error("Certaines tables sont déjà dans un groupe.");
    }
    const group: TableGroup = {
      id: crypto.randomUUID(),
      tableIds: [...tableIds],
      createdAt: new Date().toISOString(),
    };
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
  update((draft) => {
    const group = findGroup(draft, groupId);
    const taken = new Set(draft.groups.flatMap((g) => g.tableIds));
    if (taken.has(tableId)) {
      throw new Error("Cette table est déjà dans un groupe.");
    }
    group.tableIds.push(tableId);
  });
}

export async function removeTableFromGroup(
  groupId: string,
  tableId: string
): Promise<void> {
  update((draft) => {
    const group = findGroup(draft, groupId);
    if (group.tableIds.length <= 2) {
      throw new Error(
        "Un groupe doit contenir au moins deux tables. Dissolvez-le plutôt."
      );
    }
    group.tableIds = group.tableIds.filter((id) => id !== tableId);
    for (const order of draft.orders) {
      if (order.groupeId === groupId && order.tableId === tableId) {
        order.groupeId = null;
      }
    }
  });
}

export async function dissolveGroup(groupId: string): Promise<void> {
  update((draft) => {
    findGroup(draft, groupId);
    draft.groups = draft.groups.filter((group) => group.id !== groupId);
    for (const order of draft.orders) {
      if (order.groupeId === groupId) order.groupeId = null;
    }
  });
}

// ---------------------------------------------------------------------------
// Commandes

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order> {
  return update((draft) => {
    const order = findOrder(draft, orderId);
    assertTransition(order, status);
    order.status = status;
    return order;
  });
}

export async function markOrderPaid(
  orderId: string,
  mode: PaymentMode
): Promise<Order> {
  return update((draft) => {
    const order = findOrder(draft, orderId);
    assertTransition(order, "payee");
    order.status = "payee";
    order.paymentMode = mode;
    return order;
  });
}

export async function markGroupServed(groupeId: string): Promise<void> {
  update((draft) => {
    for (const order of draft.orders) {
      if (
        order.groupeId === groupeId &&
        ORDER_STATUS_FLOW[order.status].includes("servie")
      ) {
        order.status = "servie";
      }
    }
  });
}

export async function markGroupPaid(
  groupeId: string,
  mode: PaymentMode
): Promise<void> {
  update((draft) => {
    for (const order of draft.orders) {
      if (
        order.groupeId === groupeId &&
        ORDER_STATUS_FLOW[order.status].includes("payee")
      ) {
        order.status = "payee";
        order.paymentMode = mode;
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Établissement

export type EtablissementInput = Omit<Etablissement, "slug" | "offre">;

export async function updateEtablissement(
  input: EtablissementInput
): Promise<void> {
  update((draft) => {
    Object.assign(draft.etablissement, input);
  });
}

// ---------------------------------------------------------------------------
// Démo

export async function setOffre(offre: Offre): Promise<void> {
  update((draft) => {
    draft.etablissement.offre = offre;
    if (offre === "digital") draft.role = "gerant";
  });
}

export async function setRole(role: Role): Promise<void> {
  update((draft) => {
    draft.role = role;
  });
}

export async function resetDemo(): Promise<void> {
  commit(seed());
}
