import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { getRestaurant, restaurantThemeClass } from "@/lib/menu-data";

/*
 * Aperçu de la carte d'un prospect, servi depuis le registre statique
 * (lib/menu-data) : la même page que le menu QR, aux couleurs et à la
 * typographie de l'établissement, mais sans base — on montre son menu en
 * visite commerciale avant tout seed. Le parcours de commande est ouvert sur
 * une table fictive pour que les modales d'options et le panier se montrent,
 * mais en mode aperçu (CartConfig.preview) : rien n'est compté ni envoyé. La
 * route est publique et la plupart des slugs existent en base — sans ce
 * garde-fou, une commande passée ici partait en cuisine chez le vrai client.
 * Données de démonstration : jamais indexée.
 *
 * ?theme=ominin retire l'habillage de l'établissement : la même carte dans la
 * palette et les polices d'Ominin. De quoi poser la question au gérant —
 * « vos couleurs ou les nôtres ? » — sans reconstruire une seconde page.
 */

/** Table fictive : sans numéro scanné, les boutons resteraient désactivés. */
const DEMO_TABLE = 1;

export async function generateMetadata({
  params,
}: PageProps<"/menu/demo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  // Titre, description et aperçu de lien propres à l'établissement : sans
  // eux, un lien de démo envoyé au gérant (WhatsApp, SMS) montrait la
  // promesse commerciale et le logo d'Ominin.
  // « Carte » : sur une page dont le produit phare est un « Menu Solo »,
  // « menu » prêtait à confusion.
  const title = `${restaurant.name} — Carte (aperçu)`;
  const description = [restaurant.name, restaurant.address]
    .filter(Boolean)
    .join(" · ");
  const shareImage = restaurant.coverImage ?? restaurant.poster;
  const images = shareImage ? [shareImage] : undefined;
  return {
    title,
    description,
    openGraph: { title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
    robots: { index: false, follow: false },
  };
}

export default async function MenuPreviewPage({
  params,
  searchParams,
}: PageProps<"/menu/demo/[slug]">) {
  const { slug } = await params;
  const { theme } = await searchParams;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  const themeClass = theme === "ominin" ? undefined : restaurantThemeClass(slug);

  const categoryLinks = restaurant.categories.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <CartProvider
      config={{
        slug,
        tableNumber: DEMO_TABLE,
        orderingEnabled: true,
        onlinePayment: false,
        paymentProvider: "stripe",
        squareLocationId: null,
        preview: true,
      }}
    >
      <div
        data-menu-root
        className={`${brandFontVariables} ${themeClass ?? ""} flex flex-1 flex-col bg-background text-foreground`}
      >
        <Hero restaurant={restaurant} />
        <MenuHighlights highlights={restaurant.highlights} />
        <CategoryNav
          categories={categoryLinks}
          themeLocked={Boolean(themeClass)}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 pb-10 pt-5 sm:pt-10 lg:max-w-5xl lg:gap-24 lg:px-10 lg:py-14">
          {restaurant.categories.map((category, i) => (
            <MenuSection key={category.id} category={category} first={i === 0} />
          ))}
        </main>
        <MenuFooter restaurant={restaurant} themeToggle={!themeClass} />
        <CartBar />
      </div>
    </CartProvider>
  );
}
