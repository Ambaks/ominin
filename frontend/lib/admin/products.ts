import { Constants, type Database } from "@/lib/supabase/database.types";

/*
 * Les produits qu'Ominin vend. L'admin se lit par produit : le produit est le
 * premier segment de l'URL (/menu/carte), absent dans la vue d'ensemble. Sans
 * directive client — le proxy s'en sert pour retirer ce segment.
 */

export type Product = Database["public"]["Enums"]["ominin_product"];

/** Ordre du portail ominin.com, repris par la barre produit. */
export const PRODUCTS = Constants.public.Enums.ominin_product;

export const PRODUCT_LABELS: Record<Product, string> = {
  menu: "Menu",
  collect: "Collect",
  shop: "Shop",
  clip: "Clip",
  agents: "Agents",
  "sur-mesure": "Sur mesure",
};

/** Qui l'on prospecte pour ce produit : nomme l'écran des fiches CRM. */
const PROSPECT_LABELS: Record<Product, string> = {
  menu: "Restaurants",
  collect: "Restaurants",
  shop: "Boutiques",
  clip: "Clippeurs",
  agents: "Entreprises",
  "sur-mesure": "Prospects",
};

export function prospectsLabel(product: Product | null): string {
  return product ? PROSPECT_LABELS[product] : "Prospects";
}

export function isProduct(segment: string): segment is Product {
  return (PRODUCTS as readonly string[]).includes(segment);
}
