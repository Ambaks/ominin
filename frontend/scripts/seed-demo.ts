/*
 * Insère la démo Trattoria Lucia dans Supabase en réutilisant seed()
 * (source de vérité unique — aucun contenu dupliqué en SQL).
 *
 * Usage, depuis frontend/ :  npm run seed:demo
 * Lit SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY depuis ../backend/.env
 * (clé service_role : le script bypasse RLS, ne jamais l'exposer au front).
 *
 * Idempotent : la démo existante est supprimée puis réinsérée. Les ids du
 * seed sont des slugs lisibles ("margherita", "table-3") ; la base génère
 * des uuid, d'où les tables de correspondance.
 */

import { createClient } from "@supabase/supabase-js";
import { seed } from "../lib/gestion/seed";
import { getRestaurant } from "../lib/menu-data";
import type { Database, Json, TablesInsert } from "../lib/supabase/database.types";
import { must } from "../lib/supabase/result";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquent — renseigne backend/.env."
  );
}

const db = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false },
});

const toJson = (value: unknown): Json => value as Json;

async function main() {
  const state = seed();
  const { etablissement } = state;

  // Purge de la démo précédente (cascade sur toutes les tables filles).
  const { error: purgeError } = await db
    .from("etablissements")
    .delete()
    .eq("slug", etablissement.slug);
  if (purgeError) throw new Error(purgeError.message);

  const etab = must(
    await db
      .from("etablissements")
      .insert({
        slug: etablissement.slug,
        name: etablissement.name,
        tagline: etablissement.tagline,
        address: etablissement.address,
        phone: etablissement.phone,
        hours: etablissement.hours,
        offre: etablissement.offre,
        cover_image: getRestaurant(etablissement.slug)?.coverImage ?? null,
      })
      .select("id")
      .single()
  );

  // La démo reste utilisable sans passer par Stripe.
  const { error: subscriptionError } = await db.from("subscriptions").insert({
    etablissement_id: etab.id,
    status: state.subscriptionStatus,
  });
  if (subscriptionError) throw new Error(subscriptionError.message);

  const categories = must(
    await db
      .from("categories")
      .insert(
        state.categories.map((category, position) => ({
          etablissement_id: etab.id,
          name: category.name,
          tagline: category.tagline ?? null,
          position,
        }))
      )
      .select("id")
  );
  const categoryIds = new Map(
    state.categories.map((category, i) => [category.id, categories[i].id])
  );

  const itemSeeds = state.categories.flatMap((category) =>
    category.items.map((item) => ({ categoryId: category.id, item }))
  );
  const items = must(
    await db
      .from("items")
      .insert(
        itemSeeds.map(({ categoryId, item }): TablesInsert<"items"> => ({
          etablissement_id: etab.id,
          category_id: categoryIds.get(categoryId)!,
          name: item.name,
          description: item.description ?? null,
          price: item.price,
          image: item.image ?? null,
          badges: item.badges ?? [],
          pairing: item.pairing ?? null,
          detail: item.detail ?? null,
          disponible: item.disponible ?? true,
          stock: item.stock ?? null,
          options: toJson(item.options ?? []),
        }))
      )
      .select("id")
  );
  const itemIds = new Map(itemSeeds.map(({ item }, i) => [item.id, items[i].id]));

  must(
    await db
      .from("formules")
      .insert(
        state.formules.map((formule) => ({
          etablissement_id: etab.id,
          name: formule.name,
          description: formule.description ?? null,
          price: formule.price,
          disponible: formule.disponible,
          etapes: toJson(
            formule.etapes.map((etape) => ({
              ...etape,
              articles: etape.articles.map((article) => ({
                ...article,
                itemId: article.itemId ? itemIds.get(article.itemId) : undefined,
              })),
            }))
          ),
        }))
      )
      .select("id")
  );

  const groups = must(
    await db
      .from("table_groups")
      .insert(
        state.groups.map((group) => ({
          etablissement_id: etab.id,
          created_at: group.createdAt,
        }))
      )
      .select("id")
  );
  const groupIds = new Map(state.groups.map((group, i) => [group.id, groups[i].id]));
  const groupOfTable = new Map(
    state.groups.flatMap((group) =>
      group.tableIds.map((tableId) => [tableId, groupIds.get(group.id)!] as const)
    )
  );

  const tables = must(
    await db
      .from("tables")
      .insert(
        state.tables.map((table) => ({
          etablissement_id: etab.id,
          number: table.number,
          group_id: groupOfTable.get(table.id) ?? null,
        }))
      )
      .select("id")
  );
  const tableIds = new Map(state.tables.map((table, i) => [table.id, tables[i].id]));

  const orders = must(
    await db
      .from("orders")
      .insert(
        state.orders.map((order) => ({
          etablissement_id: etab.id,
          type: order.type,
          table_id: order.tableId ? (tableIds.get(order.tableId) ?? null) : null,
          group_id: order.groupeId ? groupIds.get(order.groupeId)! : null,
          status: order.status,
          payment_mode: order.paymentMode ?? null,
          customer_name: order.customerName ?? null,
          customer_phone: order.customerPhone ?? null,
          pickup_at: order.pickupAt ?? null,
          created_at: order.createdAt,
        }))
      )
      .select("id")
  );

  must(
    await db
      .from("order_items")
      .insert(
        state.orders.flatMap((order, i) =>
          order.items.map((line) => ({
            order_id: orders[i].id,
            item_id: line.itemId ? (itemIds.get(line.itemId) ?? null) : null,
            name: line.name,
            quantity: line.quantity,
            unit_price: line.unitPrice,
            options: toJson(line.options ?? []),
          }))
        )
      )
      .select("id")
  );

  console.log(
    `Démo « ${etablissement.name} » insérée : ${categories.length} catégories, ` +
      `${items.length} plats, ${tables.length} tables, ${orders.length} commandes.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
