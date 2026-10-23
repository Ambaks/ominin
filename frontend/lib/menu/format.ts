import type { Allergen, Badge, DishTag, MenuItem, OptionGroup } from "@/lib/menu-data";

/*
 * Libellés et mise en forme de la carte. Séparés du registre des
 * établissements (lib/menu-data) : un composant client qui n'a besoin que
 * d'un prix formaté ne télécharge pas toutes les cartes de démonstration.
 */

/**
 * Où le client règle et retire sa commande — le comptoir, ou le bar au
 * retrait au bar —, et où elle part une fois réglée.
 */
export const counterWords = (bar: boolean) =>
  bar
    ? { place: "bar", preparation: "en\u00a0préparation" }
    : { place: "comptoir", preparation: "en\u00a0cuisine" };

/** La carte de démonstration d'Ominin (landing, démo Collect, espace de test). */
export const DEMO_SLUG = "trattoria-lucia";

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

/** La description et, sur sa ligne, les prix des formats : tout ce que la fiche dit d'un article. */
export const descriptionWithTarifs = (item: MenuItem) =>
  [item.description, item.tarifs].filter(Boolean).join("\n");

const plainTerm = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[….\s]+$/u, "")
    .trim();

/**
 * La description relue dans la feuille d'options, sans les lignes qui ne
 * font que nommer ses choix ou ses groupes (« Orange, ananas, pomme » au-dessus
 * des mêmes jus, « Entrée + Plat » au-dessus des mêmes groupes) : la
 * composition d'un cocktail reste. Tous les groupes, montrés ou non : le
 * texte ne bouge pas quand une cuisson paraît.
 */
export function sheetDescription(item: MenuItem): string {
  const names = new Set(
    (item.options ?? []).flatMap((group) => [group.name, ...group.choices.map((choice) => choice.name)]).map(plainTerm)
  );
  return (item.description ?? "")
    .split("\n")
    .filter((line) => !line.split(/\s*(?:,|·|\+|\bou\b)\s*/).every((term) => names.has(plainTerm(term))))
    .join("\n");
}

/** En formats, le prix affiché est celui du plus petit : il se lit « dès ». */
export const hasFormats = (item: MenuItem) =>
  item.options?.some((group) => group.formats) ?? false;

/**
 * Les groupes qui se montrent pour ces choix : un groupe à condition (`when`)
 * attend l'un de ses choix dans un groupe lui-même montré, placé avant lui.
 * Caché, il ne compte ni dans la validation, ni dans le prix, ni sur le ticket.
 */
export function visibleGroups(
  groups: OptionGroup[],
  selected: Record<string, string[]>
): OptionGroup[] {
  const shown = new Set<string>();
  return groups.filter((group) => {
    const { when } = group;
    const visible =
      !when ||
      (shown.has(when.group) &&
        (selected[when.group] ?? []).some((id) => when.choices.includes(id)));
    if (visible) shown.add(group.id);
    return visible;
  });
}

/** Les choix des seuls groupes montrés : un groupe qui se cache perd les siens. */
export const keepVisible = (
  groups: OptionGroup[],
  selected: Record<string, string[]>
): Record<string, string[]> =>
  Object.fromEntries(
    visibleGroups(groups, selected).flatMap((group) =>
      selected[group.id] ? [[group.id, selected[group.id]]] : []
    )
  );

/** Le verbe du bouton d'ajout : un menu à plusieurs choix se compose, un seul choix se choisit. */
export function addVerb(item: MenuItem): "Composer" | "Choisir" | "Ajouter" {
  // Un groupe à condition (la cuisson du steak) suit un choix, il n'en ajoute pas.
  const groups = item.options?.filter((group) => !group.when).length ?? 0;
  return groups > 1 ? "Composer" : groups > 0 ? "Choisir" : "Ajouter";
}

/** Espace insécable avant € : le prix ne se coupe jamais de sa devise. */
export function formatPrice(price: number): string {
  return `${price.toFixed(2).replace(".", ",")}\u00a0€`;
}
