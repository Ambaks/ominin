import type { createAdminClient } from "@/lib/supabase/admin";
import type { OptionGroup } from "@/lib/menu-data";
import { callHubrise, type Connection } from "./connection";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Stocks de la caisse → carte. Chez HubRise, stock « 0 » = épuisé et une
 * référence absente de l'inventaire = illimitée. Les articles et choix RELIÉS
 * à la caisse suivent donc son inventaire à la lettre : c'est elle qui compte
 * ses ventes, et Ominin ne lui pousse aucun stock (consigne de HubRise). Un
 * article épuisé à la main côté Ominin ne l'est que sur la carte.
 */

interface InventoryEntry {
  sku_ref?: string | null;
  option_ref?: string | null;
  stock: string | null;
}

export async function pullInventory(admin: Admin, connection: Connection): Promise<void> {
  const [inventory, { data: refs }] = await Promise.all([
    callHubrise<InventoryEntry[]>(admin, connection, "/location/inventory"),
    admin
      .from("hubrise_ref_map")
      .select("item_id, group_id, choice_id, target, ref")
      .eq("etablissement_id", connection.etablissement_id),
  ]);

  const skuStock = new Map<string, number>();
  const optionStock = new Map<string, number>();
  for (const entry of inventory) {
    if (entry.stock === null || entry.stock === undefined) continue;
    // HubRise tient des décimales (3) ; le stock d'Ominin est un entier.
    const stock = Math.floor(Number(entry.stock));
    if (!Number.isFinite(stock)) continue;
    if (entry.sku_ref) skuStock.set(entry.sku_ref, stock);
    if (entry.option_ref) optionStock.set(entry.option_ref, stock);
  }

  // Le plat entier suit son SKU ; un choix (option, ou format relié à un SKU)
  // ne se retire qu'à lui seul.
  const itemRefs = (refs ?? []).filter((row) => row.target === "sku" && !row.choice_id);
  const choiceRefs = (refs ?? []).filter((row) => row.choice_id);

  if (itemRefs.length) {
    const { data: items } = await admin
      .from("items")
      .select("id, stock")
      .in("id", itemRefs.map((row) => row.item_id));
    const current = new Map((items ?? []).map((item) => [item.id, item.stock]));
    for (const row of itemRefs) {
      // Absente de l'inventaire : illimitée.
      const target = skuStock.get(row.ref) ?? null;
      if (current.get(row.item_id) === target) continue;
      const { error } = await admin
        .from("items")
        .update({ stock: target })
        .eq("id", row.item_id);
      if (error) throw new Error(error.message);
    }
  }

  if (choiceRefs.length) {
    const { data: items } = await admin
      .from("items")
      .select("id, options")
      .in("id", [...new Set(choiceRefs.map((row) => row.item_id))]);
    const groups = new Map(
      (items ?? []).map((item) => [item.id, item.options as unknown as OptionGroup[]])
    );
    for (const row of choiceRefs) {
      const choice = groups
        .get(row.item_id)
        ?.find((group) => group.id === row.group_id)
        ?.choices.find((candidate) => candidate.id === row.choice_id);
      if (!choice) continue;
      const stock = row.target === "sku" ? skuStock : optionStock;
      const disponible = (stock.get(row.ref) ?? 1) > 0;
      if ((choice.disponible !== false) === disponible) continue;
      const { error } = await admin.rpc("hubrise_set_choice_disponible", {
        p_item: row.item_id,
        p_group: row.group_id!,
        p_choice: row.choice_id!,
        p_disponible: disponible,
      });
      if (error) throw new Error(error.message);
    }
  }

  await admin
    .from("hubrise_connections")
    .update({ inventory_synced_at: new Date().toISOString() })
    .eq("etablissement_id", connection.etablissement_id);
}
