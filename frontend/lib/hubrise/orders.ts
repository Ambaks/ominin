import type { createAdminClient } from "@/lib/supabase/admin";
import type { OptionGroup } from "@/lib/menu-data";
import { HubriseError } from "./client";
import { HUBRISE } from "./config";
import { callHubrise, type Connection } from "./connection";
import { money, parisIso, splitName, toE164 } from "./format";
import { counterLegs, counterPayment } from "./payments";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Commande Ominin → commande HubRise (POST /location/orders).
 *
 * Trois pièges, tous venus du modèle de la base :
 *  - order_items.unit_price INCLUT les suppléments d'options (place_order
 *    additionne prix + suppléments), alors que HubRise veut le prix de base
 *    sur la ligne et le supplément sur l'option : sans la soustraction, le
 *    total serait compté deux fois.
 *  - order_items.options ne garde que des noms (groupe, choix) : les codes
 *    de la caisse se retrouvent par ces noms dans la carte actuelle. Un choix
 *    relié à un SKU (une taille) donne son SKU à la ligne et quitte les
 *    options ; son supplément reste dans le prix de la ligne.
 *  - une formule n'a pas d'article derrière elle (item_id nul, son seul nom) :
 *    chaque unité part en deal HubRise, un plat par ligne avec son code, le
 *    prix de la formule sur la première ligne.
 */

interface OrderRow {
  id: string;
  etablissement_id: string;
  order_number: number | null;
  type: "sur_place" | "collect";
  status: string;
  paid_online: boolean;
  tip_amount: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_note: string | null;
  pickup_at: string | null;
  loyalty_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  square_payment_id: string | null;
  sumup_checkout_id: string | null;
  tables: { number: number } | null;
  etablissements: { show_table_number: boolean };
  order_items: {
    item_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    vat_rate: number | null;
    options: { groupName: string; choiceName: string; supplement: number }[];
    components: { name: string; item_id?: string | null }[] | null;
  }[];
  order_payments: { id: string; mode: string; amount: number; till_payment: boolean }[];
}

const ORDER_SELECT =
  "id, etablissement_id, order_number, type, status, paid_online, tip_amount, customer_name, customer_phone, customer_note, pickup_at, loyalty_customer_id, stripe_payment_intent_id, square_payment_id, sumup_checkout_id, tables (number), etablissements (show_table_number), order_items (item_id, name, quantity, unit_price, vat_rate, options, components), order_payments (id, mode, amount, till_payment)";

export interface BuiltOrder {
  /** null : la commande ne se transmet plus (annulée avant l'envoi). */
  payload: Record<string, unknown> | null;
}

/** Code HubRise d'un article, d'un choix ou d'une formule, d'après la carte reliée. */
interface RefIndex {
  sku: Map<string, string>;
  /** (article, groupe, choix) → option de la caisse */
  option: Map<string, { ref: string; listName: string | null }>;
  /** (article, groupe, choix) → SKU de la caisse : une taille */
  choiceSku: Map<string, string>;
  /** (article, nom du groupe, nom du choix) → (id du groupe, id du choix) */
  names: Map<string, { groupId: string; choiceId: string }>;
  /** nom de la formule → code du deal */
  deal: Map<string, string>;
}

async function loadRefs(
  admin: Admin,
  etablissementId: string,
  itemIds: string[],
  formuleNames: string[]
): Promise<RefIndex> {
  const index: RefIndex = {
    sku: new Map(),
    option: new Map(),
    choiceSku: new Map(),
    names: new Map(),
    deal: new Map(),
  };

  const [{ data: refs }, { data: items }, { data: formules }] = await Promise.all([
    itemIds.length
      ? admin
          .from("hubrise_ref_map")
          .select("item_id, group_id, choice_id, target, ref, option_list_name")
          .eq("etablissement_id", etablissementId)
          .in("item_id", itemIds)
      : { data: [] },
    itemIds.length
      ? admin.from("items").select("id, options").in("id", itemIds)
      : { data: [] },
    formuleNames.length
      ? admin
          .from("formules")
          .select("name, hubrise_formule_map (ref)")
          .eq("etablissement_id", etablissementId)
          .in("name", formuleNames)
      : { data: [] },
  ]);

  for (const row of refs ?? []) {
    const key = `${row.item_id}|${row.group_id}|${row.choice_id}`;
    if (!row.choice_id) index.sku.set(row.item_id, row.ref);
    else if (row.target === "sku") index.choiceSku.set(key, row.ref);
    else index.option.set(key, { ref: row.ref, listName: row.option_list_name });
  }
  for (const formule of formules ?? []) {
    const ref = formule.hubrise_formule_map?.ref;
    if (ref) index.deal.set(formule.name, ref);
  }
  for (const item of items ?? []) {
    for (const group of (item.options as unknown as OptionGroup[]) ?? []) {
      for (const choice of group.choices) {
        index.names.set(`${item.id}|${group.name}|${choice.name}`, {
          groupId: group.id,
          choiceId: choice.id,
        });
      }
    }
  }
  return index;
}

function paymentTransaction(order: OrderRow) {
  if (order.stripe_payment_intent_id)
    return { provider: "stripe", transaction_id: order.stripe_payment_intent_id };
  if (order.square_payment_id)
    return { provider: "square", transaction_id: order.square_payment_id };
  if (order.sumup_checkout_id)
    return { provider: "sumup", transaction_id: order.sumup_checkout_id };
  return null;
}

/**
 * Client de la commande : un client fidélité est créé ou mis à jour dans la
 * liste de clients juste avant la commande (consigne de HubRise), un invité
 * part dans la commande elle-même. Un échec ici ne retient jamais la
 * commande, sauf le 401 qui bloque toute la connexion.
 */
async function customerFields(
  admin: Admin,
  connection: Connection,
  order: OrderRow
): Promise<Record<string, unknown>> {
  const phone = toE164(order.customer_phone);
  const identity = {
    ...splitName(order.customer_name),
    ...(phone ? { phone } : {}),
  };
  const guest = Object.keys(identity).length ? { customer: identity } : {};

  if (!order.loyalty_customer_id || !connection.customer_list_id) return guest;
  try {
    const { data: loyalty } = await admin
      .from("loyalty_customers")
      .select("id, contact, hubrise_customer_id")
      .eq("id", order.loyalty_customer_id)
      .maybeSingle();
    if (!loyalty) return guest;

    const contact = loyalty.contact.includes("@")
      ? { email: loyalty.contact }
      : { phone: toE164(loyalty.contact) ?? phone };
    const fields = {
      ...identity,
      ...Object.fromEntries(
        Object.entries(contact).filter(([, value]) => value)
      ),
    };
    const base = `/customer_lists/${connection.customer_list_id}/customers`;
    if (loyalty.hubrise_customer_id) {
      await callHubrise(admin, connection, `${base}/${loyalty.hubrise_customer_id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      return { customer_id: loyalty.hubrise_customer_id };
    }
    const created = await callHubrise<{ id: string }>(admin, connection, base, {
      method: "POST",
      body: JSON.stringify({ private_ref: loyalty.id, ...fields }),
    });
    await admin
      .from("loyalty_customers")
      .update({ hubrise_customer_id: created.id })
      .eq("id", loyalty.id);
    return { customer_id: created.id };
  } catch (error) {
    if (error instanceof HubriseError && error.status === 401) throw error;
    console.error("[hubrise] client non transmis, commande envoyée en invité", {
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return guest;
  }
}

export async function buildOrder(
  admin: Admin,
  connection: Connection,
  orderId: string
): Promise<BuiltOrder | null> {
  const { data } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();
  const order = data as unknown as OrderRow | null;
  if (!order) return null;
  if (order.status === "annulee") return { payload: null };

  const refs = await loadRefs(
    admin,
    order.etablissement_id,
    order.order_items.flatMap((line) => [
      ...(line.item_id ? [line.item_id] : []),
      ...(line.components ?? []).flatMap((component) =>
        component.item_id ? [component.item_id] : []
      ),
    ]),
    order.order_items.flatMap((line) => (line.item_id ? [] : [line.name]))
  );

  const deals: Record<string, { name: string; ref?: string }> = {};
  const items = order.order_items.flatMap((line) => {
    let skuRef = line.item_id ? refs.sku.get(line.item_id) : undefined;
    const options: Record<string, unknown>[] = [];
    let supplements = 0;
    for (const option of line.options) {
      const ids = line.item_id
        ? refs.names.get(`${line.item_id}|${option.groupName}|${option.choiceName}`)
        : undefined;
      const key = ids ? `${line.item_id}|${ids.groupId}|${ids.choiceId}` : "";
      const size = refs.choiceSku.get(key);
      if (size) {
        skuRef = size;
        continue;
      }
      const mapped = refs.option.get(key);
      supplements += option.supplement ?? 0;
      options.push({
        option_list_name: mapped?.listName ?? option.groupName,
        name: option.choiceName,
        ...(mapped ? { ref: mapped.ref } : {}),
        price: money(option.supplement ?? 0),
        quantity: 1,
      });
    }
    const tax = line.vat_rate != null ? { tax_rate: String(line.vat_rate) } : {};
    const base = line.unit_price - supplements;

    if (line.item_id || !line.components?.length) {
      return [
        {
          product_name: line.name,
          ...(skuRef ? { sku_ref: skuRef } : {}),
          price: money(base),
          quantity: String(line.quantity),
          ...tax,
          options,
        },
      ];
    }

    const dealRef = refs.deal.get(line.name);
    return Array.from({ length: line.quantity }, () => {
      const dealKey = String(Object.keys(deals).length);
      deals[dealKey] = { name: line.name, ...(dealRef ? { ref: dealRef } : {}) };
      return line.components!.map((component, index) => {
        const ref = component.item_id ? refs.sku.get(component.item_id) : undefined;
        return {
          product_name: component.name,
          ...(ref ? { sku_ref: ref } : {}),
          price: money(index === 0 ? base : 0),
          quantity: "1",
          ...tax,
          options: index === 0 ? options : [],
          deal_line: { deal_key: dealKey },
        };
      });
    }).flat();
  });

  const tip = order.tip_amount ?? 0;
  const total =
    order.order_items.reduce(
      (sum, line) => sum + line.quantity * line.unit_price,
      0
    ) + tip;

  const pickup = order.pickup_at ? new Date(order.pickup_at) : null;
  // HubRise refuse une heure attendue passée : un retrait déjà écoulé (envoi
  // tardif après une panne) repart « dès que possible ».
  const scheduled = order.type === "collect" && pickup && pickup > new Date();
  const serviceTypeRef =
    order.type === "collect"
      ? connection.service_type_ref_collection
      : connection.service_type_ref_eat_in;
  const transaction = paymentTransaction(order);
  // Déjà encaissée au comptoir dans Ominin quand elle part (envoi en retard) :
  // ses jambes partent avec elle, marquées — la synchronisation des
  // règlements les trouvera en place.
  const legs = counterLegs(order.order_payments, total - tip);

  return {
    payload: {
      status: "new",
      ref: order.order_number != null ? String(order.order_number) : undefined,
      private_ref: order.id,
      service_type: order.type === "collect" ? "collection" : "eat_in",
      ...(serviceTypeRef ? { service_type_ref: serviceTypeRef } : {}),
      ...(scheduled
        ? { expected_time: parisIso(pickup), asap: false }
        : { asap: true }),
      ...(order.customer_note ? { customer_notes: order.customer_note } : {}),
      items,
      ...(Object.keys(deals).length ? { deals } : {}),
      ...(tip > 0
        ? {
            charges: [
              {
                name: HUBRISE.labels.tip,
                price: money(tip),
                ...(connection.tip_charge_ref ? { ref: connection.tip_charge_ref } : {}),
              },
            ],
          }
        : {}),
      // Réglée en ligne : un paiement égal au total. Au comptoir : ses jambes.
      // Sinon aucun — HubRise lit une commande sans paiement comme à encaisser.
      ...(order.paid_online
        ? {
            payments: [
              {
                name: connection.payment_name ?? HUBRISE.labels.payment,
                ...(connection.payment_ref ? { ref: connection.payment_ref } : {}),
                amount: money(total),
                ...(transaction ? { info: transaction } : {}),
              },
            ],
          }
        : legs.length
          ? { payments: legs.map((leg) => counterPayment(leg, connection)) }
          : {}),
      // Une commande numérotée (fast food) ne donne sa table que si le
      // gérant l'affiche à l'équipe.
      ...(order.type === "sur_place" &&
      order.tables &&
      (order.order_number == null || order.etablissements.show_table_number)
        ? { custom_fields: { restaurant: { table_name: String(order.tables.number) } } }
        : {}),
      ...(await customerFields(admin, connection, order)),
    },
  };
}
