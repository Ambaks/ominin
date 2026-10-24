/*
 * La carte d'un restaurant du registre (lib/menu-data) insérée pour un
 * établissement : catégories et articles. Partagée par seed-restaurant et
 * club-demo.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Restaurant } from "../lib/menu-data";
import type { Database, Json, TablesInsert } from "../lib/supabase/database.types";
import { must } from "../lib/supabase/result";

const toJson = (value: unknown): Json => value as Json;

/** Rend le nombre de catégories et d'articles insérés. */
export async function insertCarte(
  db: SupabaseClient<Database>,
  etablissementId: string,
  restaurant: Restaurant
): Promise<{ categories: number; items: number }> {
  const categories = must(
    await db
      .from("categories")
      .insert(
        restaurant.categories.map((category, position) => ({
          etablissement_id: etablissementId,
          name: category.name,
          tagline: category.tagline ?? null,
          position,
        }))
      )
      .select("id")
  );

  const itemSeeds = restaurant.categories.flatMap((category, i) =>
    category.items.map((item) => ({ categoryId: categories[i].id, item }))
  );
  // Les groupes conditionnels (`when`) ne vivent que côté client : place_order
  // exigerait un groupe caché et la gestion perdrait la condition.
  const conditionnel = itemSeeds.find(({ item }) => item.options?.some((group) => group.when));
  if (conditionnel) {
    throw new Error(
      `${conditionnel.item.id} a un groupe conditionnel (when) : place_order et la gestion ne le gèrent pas encore.`
    );
  }
  const items = must(
    await db
      .from("items")
      .insert(
        itemSeeds.map(({ categoryId, item }): TablesInsert<"items"> => ({
          etablissement_id: etablissementId,
          category_id: categoryId,
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
          // Absent du registre ⇒ la valeur par défaut de la colonne (10 %).
          // Un alcool porté à 20 % dans le registre doit l'être aussi en
          // caisse : le seed perdait ce taux.
          vat_rate: item.vatRate,
          print_name: item.printName ?? null,
          notice_hours: item.noticeHours ?? null,
        })),
        // La liste des colonnes vient des clés, undefined compris : sans
        // missing=default, un taux absent partait en NULL et violait le
        // not null de vat_rate au lieu de prendre les 10 % par défaut.
        { defaultToNull: false }
      )
      .select("id")
  );
  return { categories: categories.length, items: items.length };
}
