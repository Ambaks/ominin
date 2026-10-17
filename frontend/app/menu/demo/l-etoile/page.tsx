import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CartBar } from "@/components/menu/cart-bar";
import { EtoileMenu } from "@/components/menu/etoile/etoile-menu";
import { etoileFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { tableParam } from "@/lib/menu/table-param";
import { getRestaurant, restaurantThemeClass } from "@/lib/menu-data";

/*
 * Aperçu de la carte sur mesure de L'Étoile. Le segment statique passe avant
 * /menu/demo/[slug] : même registre, même panier en mode aperçu (rien n'est
 * compté ni envoyé), mais la mise en scène propre au club
 * (components/menu/etoile) à la place de la carte partagée.
 */

const SLUG = "l-etoile";
/** Table fictive : sans numéro scanné, les boutons resteraient désactivés. */
const DEMO_TABLE = 1;

export const metadata: Metadata = {
  title: "L'Étoile — Carte (aperçu)",
  description: "L'Étoile · Club & Rooftop · 2 Avenue d'Atlanta, 31200 Toulouse",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#060d1a",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default async function EtoileDemoPage({ searchParams }: PageProps<"/menu/demo/l-etoile">) {
  const restaurant = getRestaurant(SLUG);
  if (!restaurant) notFound();
  const { table } = await searchParams;
  const tableNumber = tableParam(table) ?? DEMO_TABLE;

  return (
    <CartProvider
      config={{
        slug: SLUG,
        tableNumber,
        orderingEnabled: true,
        serviceMode: "restaurant",
        restaurantName: restaurant.name,
        onlinePayment: true,
        paymentProvider: "stripe",
        squareLocationId: null,
        preview: true,
      }}
    >
      <div
        data-menu-root
        data-slug={SLUG}
        className={`${etoileFontVariables} ${restaurantThemeClass(SLUG) ?? ""} flex flex-1 flex-col`}
      >
        <EtoileMenu restaurant={restaurant} tableNumber={tableNumber} />
        <CartBar />
      </div>
    </CartProvider>
  );
}
