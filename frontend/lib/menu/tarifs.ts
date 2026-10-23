import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuCategory, MenuItem } from "@/lib/menu-data";
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

/**
 * Par article, ou par format d'un article (`tarifKey`) — les clés de
 * place_order. Le prix d'un format est son prix entier. Vide ⇒ tout se vend
 * au prix de la carte.
 */
export type TarifMap = Map<string, Tarif>;

export const tarifKey = (itemId: string, choiceId?: string | null) =>
  choiceId ? `${itemId}:${choiceId}` : itemId;

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
      tarifKey(row.item_id, row.choice_id),
      { price: Number(row.price), ruleName: row.rule_name },
    ])
  );
}

/**
 * Le tarif du moment d'un article, tel que l'espace le rappelle : le sien,
 * sinon celui du premier de ses formats qu'une règle vise (prix entier).
 */
export function effectiveTarif(
  tarifs: TarifMap,
  item: MenuItem
): (Tarif & { format?: string }) | null {
  const own = tarifs.get(item.id);
  if (own) return own;
  for (const choice of item.options?.find((group) => group.formats)?.choices ?? []) {
    const tarif = tarifs.get(tarifKey(item.id, choice.id));
    if (tarif) return { ...tarif, format: choice.name };
  }
  return null;
}

const cents = (amount: number) => Math.round(amount * 100) / 100;

/**
 * Un article au prix du moment. Quand un format a son propre tarif (le verre
 * en happy hour, pas la bouteille), les prix entiers des formats se
 * recalculent et le moins cher redevient la base : la fiche dit « dès » le
 * bon prix, et base + supplément donne ce que place_order facturera.
 */
function withTarif(item: MenuItem, tarifs: TarifMap): MenuItem {
  const own = tarifs.get(item.id);
  const price = own?.price ?? item.price;
  const formats = item.options?.find((group) => group.formats);
  const formatTarifs = (formats?.choices ?? []).flatMap((choice) => {
    const tarif = tarifs.get(tarifKey(item.id, choice.id));
    return tarif ? [tarif] : [];
  });
  const ruleName = (own ?? formatTarifs[0])?.ruleName;
  if (!ruleName) return item;
  const tarif = { name: ruleName, basePrice: item.price };
  if (!formats || formatTarifs.length === 0) return { ...item, price, tarif };

  const full = formats.choices.map(
    (choice) => tarifs.get(tarifKey(item.id, choice.id))?.price ?? price + choice.supplement
  );
  const base = Math.min(...full);
  const choices = formats.choices.map((choice, index) => {
    const choiceTarif = tarifs.get(tarifKey(item.id, choice.id));
    return {
      ...choice,
      supplement: cents(full[index] - base),
      ...(choiceTarif && {
        tarif: { name: choiceTarif.ruleName, basePrice: cents(item.price + choice.supplement) },
      }),
    };
  });
  return {
    ...item,
    price: base,
    tarif,
    options: item.options?.map((group) => (group === formats ? { ...group, choices } : group)),
  };
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
    items: category.items.map((item) => withTarif(item, tarifs)),
  }));
}
