import { menuSiteUrl } from "@/lib/site";
import type { SignupKind } from "./signup-form";

/** Les types qui ont leur plaquette (public/commercial/plaquettes) : elle y remplace le deck. */
const PLAQUETTES: Partial<Record<SignupKind, string>> = {
  restaurant: "plaquette-restaurant.pdf",
  bar: "plaquette-bar.pdf",
  club: "plaquette-club.pdf",
  fast_food: "plaquette-fast-food.pdf",
};

export const plaquetteHref = (kind: SignupKind) => {
  const file = PLAQUETTES[kind];
  return file && `/commercial/plaquettes/${file}`;
};

/* La démo montrée pour chaque type d'établissement : le menu du client, ou l'espace de gestion du personnel. */
export interface TypeDemo {
  name: string;
  menu: string;
  gestion: string;
}

const demo = (name: string, slug: string, screen: "salle" | "comptoir"): TypeDemo => ({
  name,
  menu: `${menuSiteUrl}/demo/${slug}`,
  gestion: `${menuSiteUrl}/demo/${slug}/${screen}`,
});

export const TYPE_DEMOS: Record<SignupKind, TypeDemo> = {
  restaurant: demo("Boho", "boho", "salle"),
  bar: demo("Le Victoria", "le-victoria", "salle"),
  club: demo("L’Étoile", "l-etoile", "comptoir"),
  fast_food: demo("Big Smash", "big-smash", "comptoir"),
  cafe: demo("Caffè Panis", "caffe-panis", "salle"),
  boulangerie: demo("Boulangerie Cyprien", "boulangerie-cyprien", "comptoir"),
};
