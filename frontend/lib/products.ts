import {
  clipBrand,
  pricingSection as clipPricing,
  formatEuros,
} from "@/lib/clip-landing-data";
import { collectBrand } from "@/lib/collect-landing-data";
import type { Offre } from "@/lib/gestion/types";
import { collectOffer, pricingSection } from "@/lib/landing-data";
import { clipSiteUrl, collectSiteUrl, menuSiteUrl } from "@/lib/site";

/*
 * Catalogue Ominin présenté aux clients connectés : espace de gestion
 * (restaurants) et espace clipper. Aucun prix ni libellé n'est redéfini ici —
 * tout vient des données de landing, seule source de vérité des tarifs.
 * Les liens sont absolus : ces cartes sont rendues sous plusieurs hôtes
 * (ominin.com, clip.ominin.com), où un chemin relatif ne pointerait pas au
 * même endroit.
 */
export interface Product {
  id: string;
  /** Famille du produit, en surtitre de la carte. */
  eyebrow: string;
  /** Nom commercial complet, marque comprise. */
  name: string;
  tagline: string;
  /** Montant principal formaté (« 59 € »). */
  price: string;
  /** Unité accolée au montant (« /mois »). */
  priceUnit?: string;
  /** Précision sous le prix (« puis 50 €/mois par 10 comptes »). */
  priceNote?: string;
  featuresLabel?: string;
  features: string[];
  /** Page publique du produit. */
  href: string;
}

const OFFRE_EYEBROW = "Offre menu & salle";

export const offreProducts: Product[] = pricingSection.plans.map((plan) => ({
  id: plan.id,
  eyebrow: OFFRE_EYEBROW,
  name: `Ominin ${plan.name}`,
  tagline: plan.tagline,
  price: `${plan.price} €`,
  priceUnit: pricingSection.perMonth,
  featuresLabel: plan.featuresLabel,
  features: plan.features,
  // La landing des offres menu & salle vit sur le sous-domaine menu depuis
  // l'éclatement — l'apex ne sert plus que le portail.
  href: `${menuSiteUrl}/#${pricingSection.id}`,
}));

export const collectProduct: Product = {
  id: collectOffer.id,
  eyebrow: "Vente à emporter",
  name: collectBrand,
  tagline: collectOffer.tagline,
  price: `${collectOffer.price} €`,
  priceUnit: pricingSection.perMonth,
  features: collectOffer.features,
  href: collectSiteUrl,
};

export const clipProduct: Product = {
  id: "clip",
  eyebrow: "Réseaux sociaux",
  name: clipBrand,
  tagline:
    "Vos vidéos publiées sur TikTok, YouTube Shorts, Instagram et X, automatiquement.",
  price: formatEuros(clipPricing.base.price),
  priceUnit: ` ${clipPricing.base.priceNote}`,
  priceNote: `puis ${formatEuros(clipPricing.subscription.price)}${
    clipPricing.subscription.priceNote
  }`,
  featuresLabel: clipPricing.base.featuresLabel,
  features: clipPricing.base.features,
  href: clipSiteUrl,
};

/**
 * L'offre souscrite, présentée avec le cumul des fonctionnalités : les
 * paliers de la landing ne listent que leur delta (« Tout Smart, plus… »),
 * ce qui sous-vendrait ce que le client a réellement.
 */
export function currentOffreProduct(offre: Offre): Product | undefined {
  const index = offreProducts.findIndex((product) => product.id === offre);
  if (index < 0) return undefined;
  return {
    ...offreProducts[index],
    featuresLabel: undefined,
    features: pricingSection.plans
      .slice(0, index + 1)
      .flatMap((plan) => plan.features),
  };
}
