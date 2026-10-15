import { cache } from "react";
import { isCollectActive } from "@/lib/collect/server";
import { fetchRestaurant } from "@/lib/public-menu";

/** La boutique de Cyprien en base : celle dont le site prend les commandes. */
export const CYPRIEN_SLUG = "boulangerie-cyprien";

/** Carte, horaires et paiement de la boutique, avec l'état de son click & collect. */
export const getShop = cache(async () => {
  const data = await fetchRestaurant(CYPRIEN_SLUG);
  if (!data) return null;
  return { ...data, active: await isCollectActive(data.id) };
});
