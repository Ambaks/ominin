import type { CategoryLayout } from "@/lib/menu-data";

/** Les deux présentations des catégories du menu QR, telles que la gestion
 * du restaurant et l'admin Ominin les proposent. */
export const CATEGORY_LAYOUTS: { id: CategoryLayout; label: string; body: string }[] = [
  {
    id: "top",
    label: "En haut",
    body: "Les catégories en pastilles dans une barre au-dessus de la carte, qui défile avec le doigt.",
  },
  {
    id: "rail",
    label: "À gauche",
    body: "Une colonne fine le long de la carte : la catégorie en cours, la précédente et la suivante. La toucher déplie toutes les catégories.",
  },
];
