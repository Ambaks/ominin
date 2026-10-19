import type { SocialBrand } from "./brands";

/*
 * Démos filmées que l'agent social peut monter dans un Reel, posées dans un
 * téléphone. Chaque clip est un parcours joué par Playwright sur une démo
 * publique aux données fictives et filmé au moment du rendu
 * (social-video/scripts/record.ts, un enregistreur par id) : il suit donc
 * toujours l'interface du jour. Le rédacteur (backend) les lit par
 * /api/social/clips ; la description est tout ce qu'il en sait.
 */

export interface Clip {
  id: string;
  brand: Exclude<SocialBrand, "ominin">;
  description: string;
}

export const CLIPS: readonly Clip[] = [
  {
    id: "menu-carte",
    brand: "menu",
    description:
      "Le client à table vient de scanner le QR : la carte s'ouvre sur son téléphone et il la fait défiler — catégories, plats en photo, prix.",
  },
  {
    id: "menu-commande",
    brand: "menu",
    description:
      "Le client à table choisit la taille d'une pizza, ajoute trois plats en quelques touches et ouvre son panier, prêt à envoyer la commande en cuisine.",
  },
  {
    id: "collect-commande",
    brand: "collect",
    description:
      "Commande à emporter sur le site du commerce : le client ajoute trois plats, choisit son retrait et paie par carte en un geste.",
  },
  {
    id: "collect-cuisine",
    brand: "collect",
    description:
      "Côté commerçant : la commande payée arrive en direct, il lance la préparation et annonce un délai de 15 minutes.",
  },
  {
    id: "collect-suivi",
    brand: "collect",
    description:
      "Le client suit sa commande à emporter en direct : elle passe en préparation et affiche l'heure à laquelle elle sera prête.",
  },
];
