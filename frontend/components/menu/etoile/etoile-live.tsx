import { CartBar } from "@/components/menu/cart-bar";
import { TicketTracker } from "@/components/menu/order-ticket";
import { etoileFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { menuCartConfig, type PublicMenu } from "@/lib/menu/cart-config";
import { etoileSceneCategories, restaurantThemeClass } from "@/lib/menu-data";
import { clubSiteUrl } from "@/lib/site";
import { EtoileMenu } from "./etoile-menu";

/*
 * La scène de L'Étoile sur la carte en base (club.ominin.com/<slug>/carte) :
 * la commande d'un QR de table y est apportée à la table, celle d'un QR sans
 * table se retire au bar ; l'équipe, connectée sur le sous-domaine du club,
 * y scanne le code de retrait.
 */
export function EtoileLive({ slug, data }: { slug: string; data: PublicMenu }) {
  const categories = etoileSceneCategories(data.restaurant.categories);
  return (
    <CartProvider
      config={{
        ...menuCartConfig(slug, data),
        tableDelivery: true,
        drinksOnly: categories.every((category) => category.boissons),
        staffSite: clubSiteUrl,
      }}
    >
      <div
        data-menu-root
        data-slug={slug}
        className={`${etoileFontVariables} ${restaurantThemeClass(slug) ?? ""} flex flex-1 flex-col`}
      >
        <EtoileMenu restaurant={{ ...data.restaurant, categories }} />
        <TicketTracker />
        <CartBar />
      </div>
    </CartProvider>
  );
}
