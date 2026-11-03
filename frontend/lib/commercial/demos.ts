import { menuSiteUrl } from "@/lib/site";
import type { SignupKind } from "./signup-form";

/**
 * Les types qui ont leur plaquette : elle y remplace le deck. Ses pages sont
 * des images (public/commercial/plaquettes, backend/scripts/plaquette_pages.py) :
 * un PDF ouvert sur téléphone n'offre aucun bouton pour revenir à l'appli.
 */
const PLAQUETTES: Partial<Record<SignupKind, { folder: string; pages: number }>> = {
  restaurant: { folder: "plaquette-restaurant", pages: 8 },
  bar: { folder: "plaquette-bar", pages: 8 },
  club: { folder: "plaquette-club", pages: 8 },
  fast_food: { folder: "plaquette-fast-food", pages: 8 },
};

/** Taille des images de page, en pixels. */
export const PLAQUETTE_PAGE_SIZE = { width: 1405, height: 1988 };

export const plaquettePages = (kind: SignupKind) => {
  const plaquette = PLAQUETTES[kind];
  return (
    plaquette &&
    Array.from({ length: plaquette.pages }, (_, i) => `/commercial/plaquettes/${plaquette.folder}/${i + 1}.jpg`)
  );
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
