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

export function isProduct(segment: string): segment is Product {
  return (PRODUCTS as readonly string[]).includes(segment);
}
