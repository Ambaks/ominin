import type { CartConfig } from "@/lib/menu/cart";
import type { fetchRestaurant } from "@/lib/public-menu";

export type PublicMenu = NonNullable<Awaited<ReturnType<typeof fetchRestaurant>>>;

/** Le panier du menu QR d'un établissement, tel que sa fiche en base le règle. */
export function menuCartConfig(slug: string, data: PublicMenu): CartConfig {
  const orderingEnabled = data.offre === "smart" || data.offre === "connect";
  // Fast food : on commande sans service à table et l'on retire au comptoir ;
  // le QR peut être unique ou celui d'une table.
  const fastFood = orderingEnabled && data.serviceMode === "fast_food";
  return {
    slug,
    // La table du QR suit la commande, en fast food aussi : le client y
    // retire au comptoir, la table reste notée (voir show_table_number).
    tableNumber: null,
    tableFromUrl: true,
    orderingEnabled,
    serviceMode: data.serviceMode,
    barPickup: fastFood && data.barPickup,
    restaurantName: data.restaurant.name,
    onlinePayment: orderingEnabled && data.onlinePayment,
    onlineMinOrder: data.onlineMinOrder,
    paymentProvider: data.paymentProvider,
    squareLocationId: data.squareLocationId,
    tableTracking: orderingEnabled && !fastFood && data.restaurant.suivi === true,
    afterMealLive: orderingEnabled && !fastFood && Boolean(data.restaurant.afterMeal?.live),
    loyalty: data.loyalty,
    // Sans commande, rien à fermer : pas de relecture.
    etablissementId: orderingEnabled ? data.id : undefined,
    closedItems: orderingEnabled ? data.closedItems : undefined,
    pairings: data.pairings,
    formuleOffers: data.formuleOffers,
  };
}
