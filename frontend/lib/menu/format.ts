import type { Allergen, Badge, DishTag, MenuItem } from "@/lib/menu-data";

/*
 * Libellés et mise en forme de la carte. Séparés du registre des
 * établissements (lib/menu-data) : un composant client qui n'a besoin que
 * d'un prix formaté ne télécharge pas toutes les cartes de démonstration.
 */

export const BADGE_LABELS: Record<Badge, string> = {
  maison: "Recette maison",
  top: "Top vente",
  nouveau: "Nouveauté",
};

/** Les quatorze allergènes à déclarer (règlement INCO, annexe II), sous leur nom courant. */
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  crustaces: "Crustacés",
  oeuf: "Œufs",
  poisson: "Poissons",
  arachides: "Arachides",
  soja: "Soja",
  lait: "Lait",
  "fruits-a-coque": "Fruits à coque",
  celeri: "Céleri",
  moutarde: "Moutarde",
  sesame: "Sésame",
  sulfites: "Sulfites",
  lupin: "Lupin",
  mollusques: "Mollusques",
};

/** La ligne des allergènes d'un plat, dans l'ordre du règlement (celui de ALLERGEN_LABELS), quel que soit celui de la saisie. */
export const allergenLine = (allergens: Allergen[]) =>
  `Allergènes\u00a0: ${(Object.keys(ALLERGEN_LABELS) as Allergen[])
    .filter((allergen) => allergens.includes(allergen))
    .map((allergen) => ALLERGEN_LABELS[allergen])
    .join(", ")}`;

export const DISH_TAG_LABELS: Record<DishTag, string> = {
  vegetarien: "Végétarien",
  fermente: "Fermenté",
};

/**
 * L'entrée « Formules » de la barre des catégories, et l'ancre de la section
 * qu'elle vise. Ici et non dans components/menu/formules (module client) :
 * les pages serveur n'y recevaient qu'une référence, sans id.
 */
export const FORMULES_LINK = { id: "formules", name: "Formules" };

/** Nom d'une ligne de commande : avec son format, « Mandu x4 », « Coca 33 cl ». */
export const lineName = (item: MenuItem) =>
  item.detail ? `${item.name} ${item.detail}` : item.name;

/** Le verbe du bouton d'ajout : un menu à plusieurs choix se compose, un seul choix se choisit. */
export function addVerb(item: MenuItem): "Composer" | "Choisir" | "Ajouter" {
  const groups = item.options?.length ?? 0;
  return groups > 1 ? "Composer" : groups > 0 ? "Choisir" : "Ajouter";
}

/** Espace insécable avant € : le prix ne se coupe jamais de sa devise. */
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")}\u00a0€`;
}
