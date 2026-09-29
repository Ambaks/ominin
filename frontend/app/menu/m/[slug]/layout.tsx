import { preloadBrandAssets } from "@/components/menu/hero";
import { getRestaurant, restaurantThemeClass } from "@/lib/menu-data";

/*
 * Ce qui ne dépend que de l'adresse, avant la carte — qui attend la base :
 * le thème de l'établissement, que le squelette de chargement porte déjà
 * (plus d'éclair du noir d'Ominin avant le prune de BOHO), et le
 * préchargement de ses polices et de son affiche, qui partent avec les
 * premiers octets au lieu d'attendre les requêtes de la carte.
 */
export default async function MenuLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (restaurant) preloadBrandAssets(restaurant);
  return (
    <div className={`${restaurantThemeClass(slug) ?? ""} flex flex-1 flex-col`}>
      {children}
    </div>
  );
}
