import type { Badge, MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "./constants";
import { rowToFormule, rowToMenuItem, rowToOrder, toJson } from "./mappers";
import { commit, getState, refreshOrdersNow } from "./store";
import type {
  EncaissementMode,
  Etablissement,
  Formule,
  GestionState,
  Order,
  OrderStatus,
  PaymentProvider,
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
  vatRate: number;
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
    // vat_rate arrive avec la migration 20260817000001 (types à régénérer).
    vat_rate: input.vatRate,
  } as Omit<TablesInsert<"items">, "etablissement_id">;
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
  // reorder_categories est ajoutée par la migration 20260709000004 (types à
  // régénérer) : un seul UPDATE ensembliste au lieu d'une requête par catégorie.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ error: { message: string } | null }>;
  check(await rpc("reorder_categories", { p_ids: orderedIds }));
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  apply((draft) => {
    draft.categories.sort(
      (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)
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
// Commandes

function findOrder(state: GestionState, orderId: string): Order {
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) throw new Error("Commande introuvable.");
  return order;
}

export interface StaffOrderLine {
  itemId: string;
  quantity: number;
  choices: { group_id: string; choice_id: string }[];
}

/**
 * Commande prise en salle par un membre de l'équipe (client qui commande
 * directement au serveur). Même RPC que le menu QR : place_order valide
 * articles, stock et options, et ouvre la table si son numéro est nouveau.
 * La commande attend son encaissement ; elle part en cuisine une fois payée.
 */
export async function createStaffOrder(
  tableNumber: number,
  lines: StaffOrderLine[]
): Promise<void> {
  const supabase = createClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const { data: orderId, error } = await rpc("place_order", {
    p_slug: getState().etablissement.slug,
    p_table_number: tableNumber,
    p_items: lines.map((line) => ({
      item_id: line.itemId,
      quantity: line.quantity,
      choices: line.choices,
    })),
  });
  if (error) throw new Error(error.message);
  notifyOrderEvent(orderId as string, "en_attente");
  await refreshOrdersNow();
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  /** ISO — estimation « prête vers » posée avec le passage en préparation. */
  estimatedReadyAt?: string
): Promise<Order> {
  assertTransition(findOrder(getState(), orderId), status);
  const supabase = createClient();
  check(
    await supabase
      .from("orders")
      .update(
        estimatedReadyAt !== undefined
          ? { status, estimated_ready_at: estimatedReadyAt }
          : { status }
      )
      .eq("id", orderId)
  );
  // Push vers la salle (prête) ou la cuisine (annulée) ; la route écarte
  // l'auteur du geste via sa session. Fire-and-forget : la mutation a réussi.
  notifyOrderEvent(orderId, status);
  return apply((draft) => {
    const order = findOrder(draft, orderId);
    order.status = status;
    if (estimatedReadyAt !== undefined) order.estimatedReadyAt = estimatedReadyAt;
    return order;
  });
}

/**
 * Encaisse une sélection d'articles (commandes servies d'une table ou d'un
 * groupe). La RPC marque les lignes, pose le pourboire et clôt les commandes
 * entièrement réglées (mode unique ou mixte) ; le snapshot est relu plutôt
 * que rejoué — c'est la base qui décide de ce qui se clôt.
 */
export async function payOrderItems(
  itemIds: string[],
  mode: EncaissementMode,
  cashDetails?: { cashGiven: number; cashChange: number },
  tip?: number
): Promise<void> {
  const supabase = createClient();
  const cash = mode === "especes" ? cashDetails : undefined;
  check(
    await supabase.rpc("pay_order_items", {
      p_item_ids: itemIds,
      p_mode: mode,
      p_cash_given: cash?.cashGiven ?? null,
      p_cash_change: cash?.cashChange ?? null,
      p_tip: tip ?? null,
    })
  );
  await refreshOrdersNow();
}

/**
 * Marque servis des articles d'une table (commandes payées). La RPC clôt
 * chaque commande dont la dernière ligne arrive à table ; snapshot relu.
 */
export async function serveOrderItems(itemIds: string[]): Promise<void> {
  const supabase = createClient();
  check(await supabase.rpc("serve_order_items", { p_item_ids: itemIds }));
  await refreshOrdersNow();
}

/*
 * Corrections d'encaissement (gérant, page Paiements). Les commandes visées
 * peuvent venir de l'historique paginé, absent du snapshot local : la cible
 * est vérifiée côté SQL (.eq payment_mode) et le snapshot n'est retouché que
 * si la commande s'y trouve. La commande à jour est retournée pour que la
 * page rafraîchisse sa propre liste.
 */

export async function updateCashDetails(
  orderId: string,
  cashGiven: number,
  cashChange: number
): Promise<Order> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("orders")
      .update({ cash_given: cashGiven, cash_change: cashChange })
      .eq("id", orderId)
      .eq("payment_mode", "especes")
      .select("*, order_items(*)")
      .single()
  );
  const order = rowToOrder(row);
  return apply((draft) => {
    const index = draft.orders.findIndex((o) => o.id === orderId);
    if (index !== -1) draft.orders[index] = order;
    return order;
  });
}

/**
 * Annule un encaissement en espèces : la commande passe annulée et le
 * paiement est effacé (transition payee → annulee ouverte au seul gérant,
 * espèces uniquement — migration 20260831000001).
 */
export async function voidCashPayment(orderId: string): Promise<Order> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("orders")
      .update({
        status: "annulee",
        payment_mode: null,
        cash_given: null,
        cash_change: null,
      })
      .eq("id", orderId)
      .eq("payment_mode", "especes")
      .select("*, order_items(*)")
      .single()
  );
  const order = rowToOrder(row);
  return apply((draft) => {
    const index = draft.orders.findIndex((o) => o.id === orderId);
    if (index !== -1) draft.orders[index] = order;
    return order;
  });
}

// ---------------------------------------------------------------------------
// Équipe

/** Nom d'affichage du membre connecté (policy « self update » : sa ligne seule). */
export async function updateDisplayName(name: string): Promise<void> {
  const state = getState();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom ne peut pas être vide.");
  const supabase = createClient();
  check(
    await supabase
      .from("memberships")
      .update({ display_name: trimmed })
      .eq("user_id", state.userId)
      .eq("etablissement_id", state.etablissement.id)
  );
  apply((draft) => {
    const member = draft.members.find((m) => m.userId === draft.userId);
    if (member) member.displayName = trimmed;
  });
}

// ---------------------------------------------------------------------------
// Établissement

export type EtablissementInput = Omit<
  Etablissement,
  | "id"
  | "slug"
  | "offre"
  | "onlinePayment"
  | "paymentProvider"
  | "collectSlotCapacity"
>;

export async function updateEtablissement(
  input: EtablissementInput
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("etablissements")
      .update({
        name: input.name,
        tagline: input.tagline,
        address: input.address,
        phone: input.phone,
        hours: input.hours,
        google_review_url: input.googleReviewUrl ?? null,
      })
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

export async function setPaymentProvider(
  provider: PaymentProvider | null
): Promise<void> {
  const supabase = createClient();
  // Colonne ajoutée par la migration 20260817000001 (types à régénérer).
  check(
    await (supabase as unknown as {
      from: (t: string) => ReturnType<typeof supabase.from>;
    })
      .from("etablissements")
      .update({ payment_provider: provider })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.paymentProvider = provider;
  });
}

export async function setCollectSlotCapacity(capacity: number): Promise<void> {
  const supabase = createClient();
  check(
    await (supabase as unknown as {
      from: (t: string) => ReturnType<typeof supabase.from>;
    })
      .from("etablissements")
      .update({ collect_slot_capacity: capacity })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.collectSlotCapacity = capacity;
  });
}
