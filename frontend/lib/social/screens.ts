import type { SocialBrand } from "./brands";

/*
 * Captures d'écran que l'agent social peut poser dans un téléphone sur une
 * image de carrousel. Le rédacteur (backend) les lit par /api/social/screens
 * et choisit l'id qui illustre ce que dit l'image : la description est tout
 * ce qu'il en sait, elle dit précisément ce qu'on voit. Uniquement des démos
 * aux données fictives, jamais l'écran d'un client.
 *
 * Fichiers : public/social/screens/<id>.jpg, 780 px de large (écran de
 * 390 px en densité 2), une hauteur d'écran de téléphone.
 */

export interface Screen {
  id: string;
  brand: Exclude<SocialBrand, "ominin">;
  description: string;
  /** "bottom" : ce qui compte est en bas de l'écran (un volet qui monte) ; le
   * téléphone, qui sort du cadre, en montre alors le bas plutôt que le haut. */
  focus?: "bottom";
}

export const SCREENS: readonly Screen[] = [
  {
    id: "menu-carte",
    brand: "menu",
    description:
      "Le client arrive sur la carte après avoir scanné le QR de sa table : photo d'ambiance et nom du restaurant, barre des catégories, une formule du midi et le bouton « Appeler un serveur ».",
  },
  {
    id: "menu-plats",
    brand: "menu",
    description:
      "Les pizzas de la carte au téléphone : grandes cartes plat avec photo, badge « Top vente », description, prix et bouton « + Ajouter ».",
  },
  {
    id: "menu-plat",
    brand: "menu",
    focus: "bottom",
    description:
      "Un plat ouvert pour choisir son option : choix de la taille, prix mis à jour et bouton « Ajouter · 18,00 € », la carte floutée derrière.",
  },
  {
    id: "menu-panier",
    brand: "menu",
    focus: "bottom",
    description:
      "Le panier du client à table : « Votre commande – Table 12 », trois articles avec quantités, total et bouton « Envoyer la commande ».",
  },
  {
    id: "collect-commande",
    brand: "collect",
    description:
      "Commande à emporter sur le site du commerce : la carte en liste avec photos et prix, trois plats ajoutés et le bouton « Commander – 40,00 € ».",
  },
  {
    id: "collect-paiement",
    brand: "collect",
    description:
      "Récapitulatif avant paiement d'une commande à emporter : les plats, le total, le nom du client, le choix du retrait (aujourd'hui ou demain, dès que possible ou créneau) et le bouton « Payer 40,00 € ».",
  },
  {
    id: "collect-suivi",
    brand: "collect",
    description:
      "Le client suit sa commande en direct : frise Reçue, En préparation, Prête, Retirée, l'heure à laquelle elle sera prête et un bouton « Itinéraire » vers le commerce.",
  },
  {
    id: "collect-gestion",
    brand: "collect",
    description:
      "Côté commerçant : la commande à emporter qui arrive en direct, payée en ligne, avec ses plats et le bouton « Commencer la préparation ».",
  },
  {
    id: "shop-vitrine",
    brand: "shop",
    description:
      "L'accueil d'une boutique en ligne de bougies artisanales aux couleurs de la marque : bandeau « Livraison offerte dès 60 € d'achat », grand visuel de bougies avec « Coulées à la main, dans notre atelier », bouton « Découvrir nos créations » et les collections en pastilles rondes (Bougies, Diffuseurs, Coffrets).",
  },
  {
    id: "shop-produit",
    brand: "shop",
    description:
      "La fiche d'un produit dans la boutique en ligne : grande photo d'une bougie en céramique avec le badge « Best-seller », fil d'Ariane, nom « Figuier sauvage », prix « 32 € TTC » et le début de la description.",
  },
];

export const SCREEN_BY_ID = new Map(SCREENS.map((screen) => [screen.id, screen]));

export function screenPath(id: string): string {
  return `/social/screens/${id}.jpg`;
}
