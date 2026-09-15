import type { Badge, MenuCategory, MenuItem, OptionGroup } from "@/lib/menu-data";
import { notifyOrderEvent } from "@/lib/push/events";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "./constants";
import {
  rowToFormule,
  rowToMenuItem,
  rowToOrder,
  rowToPriceRule,
  rowToStaff,
  toJson,
} from "./mappers";
import { commit, getState, refreshOrdersNow } from "./store";
import type {
  CashDetails,
  EncaissementMode,
  Etablissement,
  Formule,
  GestionState,
  Order,
  OrderStatus,
  PriceRule,
  PriceRuleDirection,
  PriceRuleTarget,
  PriceRuleUnit,
  Role,
  Staff,
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
  /** Nom sur le ticket de cuisine ; vide, le nom de la carte sort tel quel. */
  printName?: string;
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
    print_name: input.printName || null,
    stock: input.stock,
    options: toJson(input.options),
    vat_rate: input.vatRate,
  };
}

export async function createItem(input: ItemInput): Promise<MenuItem> {
  const supabase = createClient();
  // En queue de sa catégorie : le gérant le remonte ensuite s'il le veut.
  const position =
    getState().categories.find((c) => c.id === input.categoryId)?.items
      .length ?? 0;
  const row = must(
    await supabase
      .from("items")
      .insert({
        etablissement_id: etablissementId(),
        position,
        ...itemColumns(input),
      })
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
  // Changer de catégorie, c'est arriver en queue de la nouvelle.
  const { category: from } = findItem(getState(), itemId);
  const target =
    from.id === input.categoryId
      ? undefined
      : getState().categories.find((c) => c.id === input.categoryId);
  const row = must(
    await supabase
      .from("items")
      .update(
        target
          ? { ...itemColumns(input), position: target.items.length }
          : itemColumns(input)
      )
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
  // Un seul UPDATE ensembliste au lieu d'une requête par catégorie.
  check(await supabase.rpc("reorder_categories", { p_ids: orderedIds }));
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  apply((draft) => {
    draft.categories.sort(
      (a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)
    );
  });
}

/** Ordre des articles d'une catégorie : un seul UPDATE, comme les catégories. */
export async function reorderItems(
  categoryId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = createClient();
  check(await supabase.rpc("reorder_items", { p_ids: orderedIds }));
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  apply((draft) => {
    const category = draft.categories.find((c) => c.id === categoryId);
    if (!category) throw new Error("Catégorie introuvable.");
    category.items.sort(
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
  const { data: orderId, error } = await supabase.rpc("place_order", {
    p_slug: getState().etablissement.slug,
    p_table_number: tableNumber,
    p_items: lines.map((line) => ({
      item_id: line.itemId,
      quantity: line.quantity,
      choices: line.choices,
    })),
  });
  if (error) throw new Error(error.message);
  notifyOrderEvent(orderId, "en_attente");
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
 * groupe). La RPC marque les lignes, pose le pourboire et les jambes de
 * règlement, puis clôt les commandes entièrement réglées ; le snapshot est
 * relu plutôt que rejoué — c'est la base qui décide de ce qui se clôt.
 *
 * En mixte, cashDetails.cashAmount porte la part réglée en espèces : la carte
 * prend le reste, et la RPC ventile les deux jambes de la plus ancienne
 * commande à la plus récente.
 */
export async function payOrderItems(
  /** Quantité réglée par ligne : deux nems d'une même ligne se règlent séparément. */
  items: { itemId: string; quantity: number }[],
  mode: EncaissementMode,
  cashDetails?: CashDetails,
  tip?: number
): Promise<void> {
  const supabase = createClient();
  const cash = mode === "carte" ? undefined : cashDetails;
  check(
    await supabase.rpc("pay_order_items", {
      p_items: items.map((item) => ({
        item_id: item.itemId,
        quantity: item.quantity,
      })),
      p_mode: mode,
      p_cash_given: cash?.cashGiven ?? null,
      p_cash_change: cash?.cashChange ?? null,
      p_tip: tip ?? null,
      p_cash_amount: mode === "mixte" ? cash?.cashAmount ?? null : null,
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
 * est vérifiée côté SQL et le snapshot n'est retouché que si la commande s'y
 * trouve. La commande à jour est retournée pour que la page rafraîchisse sa
 * propre liste.
 */

export interface PaymentCorrection {
  mode: EncaissementMode;
  /** Mixte : part réglée en espèces, la carte prend le reste. */
  cashAmount?: number;
  cashGiven?: number;
  cashChange?: number;
}

function replaceOrder(order: Order): Order {
  return apply((draft) => {
    const index = draft.orders.findIndex((o) => o.id === order.id);
    if (index !== -1) draft.orders[index] = order;
    return order;
  });
}

/**
 * Réécrit un encaissement au comptoir — mode, répartition, monnaie rendue.
 * La RPC repose les jambes et le mode des lignes, puis la commande est relue.
 */
export async function updateOrderPayment(
  orderId: string,
  correction: PaymentCorrection
): Promise<Order> {
  const supabase = createClient();
  const cash = correction.mode === "carte" ? undefined : correction;
  check(
    await supabase.rpc("update_order_payment", {
      p_order_id: orderId,
      p_mode: correction.mode,
      p_cash_amount:
        correction.mode === "mixte" ? correction.cashAmount ?? null : null,
      p_cash_given: cash?.cashGiven ?? null,
      p_cash_change: cash?.cashChange ?? null,
    })
  );
  const row = must(
    await supabase
      .from("orders")
      .select("*, order_items(*), order_payments(*)")
      .eq("id", orderId)
      .single()
  );
  return replaceOrder(rowToOrder(row));
}

/**
 * Annule un encaissement au comptoir — espèces, carte ou les deux : la
 * commande passe annulée et le règlement est effacé (le trigger emporte ses
 * jambes). Un règlement en ligne ne s'annule pas d'ici : c'est une
 * transaction réelle chez le prestataire.
 */
export async function voidPayment(orderId: string): Promise<Order> {
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
      .eq("paid_online", false)
      .not("payment_mode", "is", null)
      .select("*, order_items(*), order_payments(*)")
      .single()
  );
  return replaceOrder(rowToOrder(row));
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
    // Sa fiche porte le même nom tant que le gérant ne l'a pas renommée.
    const own = draft.staff.find((s) => s.userId === draft.userId);
    if (own) own.name = trimmed;
  });
}

/**
 * Nouveau serveur, sans compte : le gérant le nomme et lui pose son code de
 * badgeage, la base lui donne son jeton de planning. C'est le chemin normal
 * en salle — un compte ne sert qu'à ceux qui ouvrent l'espace de gestion
 * eux-mêmes.
 */
export async function createStaff(
  name: string,
  role: Role,
  code: string
): Promise<Staff> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom ne peut pas être vide.");
  const supabase = createClient();
  const row = must(
    await supabase.rpc("create_staff", {
      p_etablissement_id: etablissementId(),
      p_name: trimmed,
      p_role: role,
      p_code: code,
    })
  );
  const staff = rowToStaff(row);
  return apply((draft) => {
    draft.staff.push(staff);
    return staff;
  });
}

export async function renameStaff(staffId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Le nom ne peut pas être vide.");
  const supabase = createClient();
  check(await supabase.from("staff").update({ name: trimmed }).eq("id", staffId));
  apply((draft) => {
    const staff = draft.staff.find((s) => s.id === staffId);
    if (staff) staff.name = trimmed;
  });
}

/** Pose ou remplace le code de badgeage d'une fiche. */
export async function setStaffCode(staffId: string, code: string): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.rpc("set_staff_code", { p_staff_id: staffId, p_code: code })
  );
  apply((draft) => {
    const staff = draft.staff.find((s) => s.id === staffId);
    if (staff) staff.codeSet = true;
  });
}

/**
 * Masquer une fiche la retire de la badgeuse, du planning et de l'affectation
 * des tables sans rien effacer ; la réafficher la ramène telle quelle.
 */
export async function setStaffHidden(
  staffId: string,
  hidden: boolean
): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("staff").update({ hidden }).eq("id", staffId));
  apply((draft) => {
    const staff = draft.staff.find((s) => s.id === staffId);
    if (staff) staff.hidden = hidden;
  });
}

/**
 * Retirer quelqu'un de l'équipe : sa fiche part, avec son lien de planning et
 * ses créneaux. Ses badgeages restent au journal sous le nom qu'ils portent —
 * un décompte du temps de travail se conserve même après le départ.
 */
export async function deleteStaff(staffId: string): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("staff").delete().eq("id", staffId));
  apply((draft) => {
    draft.staff = draft.staff.filter((s) => s.id !== staffId);
  });
}

// ---------------------------------------------------------------------------
// Salle : qui tient la table, et quelles tables ne font qu'une

/** Confier une table à un serveur, ou la libérer (staffId à null). */
export async function assignTable(
  tableId: string,
  staffId: string | null
): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("tables").update({ staff_id: staffId }).eq("id", tableId));
  apply((draft) => {
    const table = draft.tables.find((t) => t.id === tableId);
    if (table) table.staffId = staffId;
  });
}

/**
 * Réunir des tables sous une même addition. Le groupe est créé en base par
 * `group_tables`, qui refuse une table déjà réunie et une table d'un autre
 * établissement.
 */
export async function groupTables(tableIds: string[]): Promise<void> {
  const supabase = createClient();
  const groupId = must(
    await supabase.rpc("group_tables", { p_table_ids: tableIds })
  );
  apply((draft) => {
    for (const table of draft.tables) {
      if (tableIds.includes(table.id)) table.groupId = groupId;
    }
  });
}

/** Séparer des tables réunies : le groupe disparaît avec elles. */
export async function ungroupTables(groupId: string): Promise<void> {
  const supabase = createClient();
  check(await supabase.rpc("ungroup_tables", { p_group_id: groupId }));
  apply((draft) => {
    for (const table of draft.tables) {
      if (table.groupId === groupId) table.groupId = null;
    }
  });
}

/**
 * Renvoie à l'imprimante les tickets de commandes déjà passées en cuisine —
 * rouleau fini, bourrage, ticket égaré. La RPC refait la file pour toutes les
 * imprimantes de l'établissement et abandonne au passage ce qui y attendait
 * encore : un boîtier revenu d'une panne ne sort pas deux fois le même
 * ticket. Rien à toucher dans le store, la file d'impression n'y vit pas.
 */
export async function reprintTickets(orderIds: string[]): Promise<number> {
  const supabase = createClient();
  return must(
    await supabase.rpc("reprint_order_tickets", { p_order_ids: orderIds })
  );
}

/** Code d'accès de la tablette ; vide, il retire le verrou. */
export async function setAdminPin(code: string): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.rpc("set_admin_pin", {
      p_etablissement_id: etablissementId(),
      p_code: code,
    })
  );
  apply((draft) => {
    draft.etablissement.adminPinSet = code.trim().length > 0;
  });
}

export async function verifyAdminPin(code: string): Promise<boolean> {
  const supabase = createClient();
  return must(
    await supabase.rpc("verify_admin_pin", {
      p_etablissement_id: etablissementId(),
      p_code: code,
    })
  );
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
  | "adminPinSet"
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

/**
 * Bascule l'encaisseur actif (Stripe ↔ Square). Le paiement par carte est
 * coupé le temps de la bascule : la garde en base le rejetterait de toute
 * façon si le nouveau fournisseur n'est pas encore capable d'encaisser.
 */
export async function setPaymentProvider(
  provider: "stripe" | "square"
): Promise<void> {
  const supabase = createClient();
  const dbValue = provider === "stripe" ? null : provider;
  check(
    await supabase
      .from("etablissements")
      .update({ payment_provider: dbValue, online_payment: false })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.paymentProvider = dbValue;
    draft.etablissement.onlinePayment = false;
  });
}

/** Active/désactive le choix « payer par carte » sur le menu QR (gérant). */
export async function setOnlinePayment(enabled: boolean): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("etablissements")
      .update({ online_payment: enabled })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.onlinePayment = enabled;
  });
}

export async function setCollectSlotCapacity(capacity: number): Promise<void> {
  const supabase = createClient();
  check(
    await supabase
      .from("etablissements")
      .update({ collect_slot_capacity: capacity })
      .eq("id", etablissementId())
  );
  apply((draft) => {
    draft.etablissement.collectSlotCapacity = capacity;
  });
}

// ---------------------------------------------------------------------------
// Tarifs planifiés

export interface PriceRuleInput {
  name: string;
  direction: PriceRuleDirection;
  unit: PriceRuleUnit;
  value: number;
  days: number[];
  startsAt: string | null;
  endsAt: string | null;
  targets: PriceRuleTarget[];
}

function priceRuleColumns(input: PriceRuleInput) {
  return {
    name: input.name,
    direction: input.direction,
    unit: input.unit,
    value: input.value,
    days: input.days,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };
}

/** Les cibles se réécrivent en bloc : à quatre lignes, un diff coûte plus cher. */
async function replaceTargets(
  ruleId: string,
  targets: PriceRuleTarget[]
): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("price_rule_targets").delete().eq("rule_id", ruleId));
  if (!targets.length) return;
  check(
    await supabase.from("price_rule_targets").insert(
      targets.map((target) => ({
        rule_id: ruleId,
        category_id: target.kind === "category" ? target.id : null,
        item_id: target.kind === "item" ? target.id : null,
      }))
    )
  );
}

export async function createPriceRule(
  input: PriceRuleInput
): Promise<PriceRule> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("price_rules")
      .insert({ etablissement_id: etablissementId(), ...priceRuleColumns(input) })
      .select()
      .single()
  );
  await replaceTargets(row.id, input.targets);
  const rule = rowToPriceRule({ ...row, price_rule_targets: [] });
  rule.targets = input.targets;
  return apply((draft) => {
    draft.priceRules.unshift(rule);
    return rule;
  });
}

export async function updatePriceRule(
  ruleId: string,
  input: PriceRuleInput
): Promise<PriceRule> {
  const supabase = createClient();
  const row = must(
    await supabase
      .from("price_rules")
      .update(priceRuleColumns(input))
      .eq("id", ruleId)
      .select()
      .single()
  );
  await replaceTargets(ruleId, input.targets);
  const rule = rowToPriceRule({ ...row, price_rule_targets: [] });
  rule.targets = input.targets;
  return apply((draft) => {
    const index = draft.priceRules.findIndex((r) => r.id === ruleId);
    if (index === -1) throw new Error("Tarif introuvable.");
    draft.priceRules[index] = rule;
    return rule;
  });
}

/**
 * L'interrupteur de la liste : suspendre un tarif sans perdre ses jours ni ses
 * articles, le temps d'une saison creuse.
 */
export async function setPriceRuleActive(
  ruleId: string,
  actif: boolean
): Promise<void> {
  const supabase = createClient();
  check(
    await supabase.from("price_rules").update({ actif }).eq("id", ruleId)
  );
  apply((draft) => {
    const rule = draft.priceRules.find((r) => r.id === ruleId);
    if (rule) rule.actif = actif;
  });
}

export async function deletePriceRule(ruleId: string): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("price_rules").delete().eq("id", ruleId));
  apply((draft) => {
    draft.priceRules = draft.priceRules.filter((r) => r.id !== ruleId);
  });
}
