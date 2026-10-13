import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { FormulesSection } from "@/components/menu/formules";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import { MenuTicker } from "@/components/menu/menu-ticker";
import { TicketTracker } from "@/components/menu/order-ticket";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { brandName, FORMULES_LINK, getRestaurant, restaurantThemeClass } from "@/lib/menu-data";
import { tableParam } from "@/lib/menu/table-param";

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
 *
 * ?service=fast-food montre le parcours fast food : commande sans table, puis
 * le ticket numéroté, dont l'aperçu fait avancer les étapes à la main.
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
  const title = `${brandName(restaurant)} — Carte (aperçu)`;
  const description = [brandName(restaurant), restaurant.address]
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
    // Ses icônes et son nom sur l'écran d'accueil, comme une boutique (voir
    // shop/[slug]/layout) : le raccourci d'un client portait « Ominin ».
    ...(restaurant.icons && {
      icons: {
        icon: { url: restaurant.icons.tab, sizes: "32x32", type: "image/png" },
        apple: restaurant.icons.homeScreen,
      },
      appleWebApp: { capable: false, title: restaurant.name },
    }),
  };
}

/** La barre du navigateur aux couleurs de l'établissement, sauf sur la version Ominin. */
export async function generateViewport({
  params,
  searchParams,
}: PageProps<"/menu/demo/[slug]">): Promise<Viewport> {
  const { slug } = await params;
  const { theme } = await searchParams;
  const themeColor = theme === "ominin" ? undefined : getRestaurant(slug)?.themeColor;
  return themeColor ? { themeColor } : {};
}

export default async function MenuPreviewPage({
  params,
  searchParams,
}: PageProps<"/menu/demo/[slug]">) {
  const { slug } = await params;
  const { theme, service, table } = await searchParams;
  const fastFood = service === "fast-food";
  // ?table=7 : le numéro d'une vraie table de l'établissement, pour une
  // capture ; illisible, la table fictive.
  const tableNumber = tableParam(table) ?? DEMO_TABLE;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  const themeClass = theme === "ominin" ? undefined : restaurantThemeClass(slug);

  // Comme la page en production (fetchRestaurant) : une formule désactivée
  // ne se montre pas. Ses jours de service, eux, ne filtrent pas l'aperçu,
  // montré n'importe quel jour.
  const formules = (restaurant.formules ?? []).filter((formule) => formule.disponible);
  const categoryLinks = [
    ...(formules.length > 0 ? [FORMULES_LINK] : []),
    ...restaurant.categories.map(({ id, name }) => ({ id, name })),
  ];

  return (
    <CartProvider
      config={{
        slug,
        tableNumber: fastFood ? null : tableNumber,
        orderingEnabled: true,
        serviceMode: fastFood ? "fast_food" : "restaurant",
        restaurantName: restaurant.name,
        estimatorLive: restaurant.estimatorLive,
        // Fast food : le choix du règlement fait partie de ce qu'on montre ;
        // à table, quand l'établissement y règle en ligne.
        onlinePayment: fastFood || Boolean(restaurant.onlinePayment),
        paymentProvider: "stripe",
        squareLocationId: null,
        preview: true,
      }}
    >
      <div
        data-menu-root
        data-slug={slug}
        data-service={fastFood ? "fast-food" : undefined}
        className={`${brandFontVariables} ${themeClass ?? ""} flex flex-1 flex-col bg-background text-foreground`}
      >
        <MenuTicker items={restaurant.ticker} />
        <Hero restaurant={restaurant} firstSectionId={categoryLinks[0]?.id} />
        <MenuHighlights highlights={restaurant.highlights} />
        {/* Fixés en bas, les tickets et le panier viennent tôt dans l'ordre de
            tabulation, dans l'ordre de l'écran : ils ne se cherchent pas au
            bout de la carte. */}
        <TicketTracker />
        <CartBar />
        <CategoryNav
          categories={categoryLinks}
          themeLocked={Boolean(themeClass)}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 pb-10 pt-5 sm:pt-10 lg:max-w-5xl lg:gap-24 lg:px-10 lg:py-14">
          {formules.length > 0 && <FormulesSection formules={formules} />}
          {restaurant.categories.map((category) => (
            <MenuSection
              key={category.id}
              category={category}
              // La première photo ne se charge d'emblée qu'en tête de carte :
              // sous des formules, elle est déjà loin sous le premier écran.
              first={category.id === categoryLinks[0]?.id}
            />
          ))}
        </main>
        <MenuFooter restaurant={restaurant} themeToggle={!themeClass} />
      </div>
    </CartProvider>
  );
}
