import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuCategory } from "@/lib/menu-data";
import type { Database } from "@/lib/supabase/database.types";

/*
 * Tarifs planifiés, côté lecture. Le calcul — quels jours, quelles heures,
 * quelle règle l'emporte — vit tout entier dans la fonction SQL
 * `tarifs_actifs` : c'est elle qui fait foi, puisque c'est elle que
 * `place_order` consulte pour figer le prix d'une ligne. Ce module ne fait
 * que la joindre et poser le résultat sur la carte, pour que le prix affiché
 * soit exactement le prix facturé.
 */

/** Le prix du moment pour un article, et la règle qui l'explique. */
export interface Tarif {
  price: number;
  ruleName: string;
}

/** Par identifiant d'article. Vide ⇒ tout se vend au prix de la carte. */
export type TarifMap = Map<string, Tarif>;

export async function fetchActiveTarifs(
  supabase: SupabaseClient<Database>,
  etablissementId: string
): Promise<TarifMap> {
  const { data, error } = await supabase.rpc("tarifs_actifs", {
    p_etablissement: etablissementId,
  });
  if (error) throw new Error(error.message);
  return new Map(
    (data ?? []).map((row) => [
      row.item_id,
      { price: Number(row.price), ruleName: row.rule_name },
    ])
  );
}

/**
 * Repose les prix du moment sur la carte. `price` est écrasé plutôt que
 * doublé d'un champ : tout ce qui lit un article — la fiche, le panier, le
 * total — parle alors du prix réellement pratiqué, sans avoir à connaître
 * l'existence des tarifs planifiés. `tarif` ne sert qu'à l'expliquer au
 * client, qui a droit de savoir pourquoi la chicha n'est pas au prix d'hier.
 */
export function applyTarifs(
  categories: MenuCategory[],
  tarifs: TarifMap
): MenuCategory[] {
  if (tarifs.size === 0) return categories;
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item) => {
      const tarif = tarifs.get(item.id);
      if (!tarif) return item;
      return {
        ...item,
        price: tarif.price,
        tarif: { name: tarif.ruleName, basePrice: item.price },
      };
    }),
  }));
}
