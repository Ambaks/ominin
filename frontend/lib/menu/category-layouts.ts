import type { CategoryLayout } from "@/lib/menu-data";

/** Les présentations des catégories du menu QR, telles que la gestion
 * du restaurant et l'admin Ominin les proposent. */
export const CATEGORY_LAYOUTS: {
  id: CategoryLayout;
  label: string;
  body: string;
  /** Confirmation au gérant, puis à l'admin Ominin. */
  saved: string;
  savedAdmin: string;
}[] = [
  {
    id: "top",
    label: "En haut",
    body: "Les catégories en pastilles dans une barre au-dessus de la carte, qui défile avec le doigt.",
    saved: "Catégories en haut : votre menu les affiche en barre.",
    savedAdmin: "Catégories en haut sur son menu.",
  },
  {
    id: "rail",
    label: "À gauche",
    body: "Une colonne fine le long de la carte : la catégorie en cours, la précédente et la suivante. La toucher déplie toutes les catégories.",
    saved: "Catégories à gauche : votre menu les affiche en icônes.",
    savedAdmin: "Catégories à gauche sur son menu.",
  },
  {
    id: "wheel",
    label: "Roue",
    body: "Une petite roue translucide au bord de l'écran, posée sur la carte. Le doigt dessus, elle s'agrandit et se lance d'une catégorie à l'autre.",
    saved: "Catégories en roue : votre menu les affiche par-dessus la carte.",
    savedAdmin: "Catégories en roue sur son menu.",
  },
];
