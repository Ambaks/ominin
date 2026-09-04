import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CallServerButton } from "@/components/menu/call-server-button";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuSection } from "@/components/menu/menu-section";
import { PaymentReturn } from "@/components/menu/payment-return";
import { CartProvider } from "@/lib/menu/cart";
import { restaurantThemeClass } from "@/lib/menu-data";
import { fetchRestaurant } from "@/lib/public-menu";
import { menuSiteUrl } from "@/lib/site";

/*
 * Menu public : lecture anonyme de la base (policies RLS « public read »).
 * Page mise en cache et revalidée périodiquement (client sans cookies) : un
 * scan QR ne touche pas la base à chaque fois. Les modifications faites dans
 * l'espace de gestion apparaissent après la revalidation (voir revalidate).
 * cache() déduplique entre generateMetadata et la page dans un même rendu.
 */
export const revalidate = 60;

const getRestaurant = cache(fetchRestaurant);

export async function generateMetadata({
  params,
}: PageProps<"/menu/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRestaurant(slug);
  if (!data) notFound();
  const { restaurant } = data;
  const title = `${restaurant.name} — Menu`;
  const description = `${restaurant.tagline} · ${restaurant.address}`;
  const images = restaurant.coverImage ? [restaurant.coverImage] : undefined;
  return {
    title,
    description,
    // Absolu : résolu contre metadataBase (l'apex), un canonical relatif
    // pointerait vers ominin.com/m/<slug>, qui redirige vers ce host.
    alternates: { canonical: `${menuSiteUrl}/m/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${menuSiteUrl}/m/${slug}`,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function MenuPage({
  params,
  searchParams,
}: PageProps<"/menu/m/[slug]">) {
  const { slug } = await params;
  const { embed, table, paiement, commande } = await searchParams;
  const data = await getRestaurant(slug);
  if (!data) notFound();
  const { restaurant, offre, onlinePayment, paymentProvider } = data;

  const parsedTable = Number(Array.isArray(table) ? table[0] : table);
  const tableNumber =
    Number.isInteger(parsedTable) && parsedTable > 0 ? parsedTable : null;
  const orderingEnabled = offre === "smart" || offre === "connect";
  // Retour de Stripe Checkout : la feuille de confirmation s'affiche par-dessus le menu.
  const paymentOutcome =
    paiement === "succes" || paiement === "annule" ? paiement : null;
  const paymentOrderId = typeof commande === "string" ? commande : null;

  const categoryLinks = restaurant.categories.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <CartProvider
      config={{
        slug,
        tableNumber,
        orderingEnabled,
        onlinePayment: orderingEnabled && onlinePayment,
        paymentProvider,
      }}
    >
      {/* Le thème de l'établissement (s'il existe) habille menu ET panier :
          la barre est fixed mais reste dans le sous-arbre des variables. */}
      <div
        className={`${restaurantThemeClass(slug) ?? ""} flex flex-1 flex-col bg-background text-foreground`}
      >
        <Hero restaurant={restaurant} />
        <CategoryNav
          categories={categoryLinks}
          embedded={embed === "1"}
          themeLocked={Boolean(restaurantThemeClass(slug))}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-10 pb-28 lg:max-w-5xl lg:gap-16 lg:px-10 lg:py-14">
          {restaurant.categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              La carte est en préparation — revenez bientôt.
            </p>
          ) : (
            restaurant.categories.map((category, index) => (
              <MenuSection key={category.id} category={category} index={index} />
            ))
          )}
        </main>
        <MenuFooter restaurant={restaurant} />
        <CartBar />
        <CallServerButton />
        {paymentOutcome && paymentOrderId && (
          <PaymentReturn
            outcome={paymentOutcome}
            orderId={paymentOrderId}
            tableNumber={tableNumber}
          />
        )}
      </div>
    </CartProvider>
  );
}
