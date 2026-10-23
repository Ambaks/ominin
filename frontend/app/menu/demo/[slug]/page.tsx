import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { CartBar } from "@/components/menu/cart-bar";
import { MenuBody } from "@/components/menu/menu-body";
import { FormulesSection } from "@/components/menu/formules";
import { Hero } from "@/components/menu/hero";
import { LoyaltyWelcome } from "@/components/menu/loyalty-welcome";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import { MenuTicker } from "@/components/menu/menu-ticker";
import { TicketTracker } from "@/components/menu/order-ticket";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CATEGORY_LAYOUTS } from "@/lib/menu/category-layouts";
import { CartProvider } from "@/lib/menu/cart";
import { FORMULES_LINK } from "@/lib/menu/format";
import type { LoyaltyProgram } from "@/lib/menu/loyalty";
import { DemoLoyaltyProvider } from "@/lib/menu/loyalty-demo";
import { resolveFormuleOffers, resolvePairings } from "@/lib/menu/pairings";
import {
  brandName,
  getRestaurant,
  restaurantThemeClass,
  type DemoLoyalty,
  type MenuItem,
  type Restaurant,
} from "@/lib/menu-data";
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
 * Un établissement doté d'une fidélité d'aperçu (demoLoyalty) montre la
 * sienne : un habitué reconnu, sa roue, « Ma carte », les points d'une
 * commande — tout gardé dans le navigateur (lib/menu/loyalty-demo).
 *
 * ?service=fast-food montre le parcours fast food : commande sans table, puis
 * le ticket numéroté, dont l'aperçu fait avancer les étapes à la main.
 *
 * À table, un établissement en suivi montre la suite : le paiement en
 * ligne simulé, puis chaque commande suivie au bas de l'écran jusqu'au
 * service — rien n'est appelé, ni paiement ni base. ?retrait=bar : un QR
 * dont les commandes se retirent au bar — prête, le client y montre le code
 * de son ticket, que le bar scanne pour la marquer retirée. Avec
 * ?service=fast-food, le même retrait sur un ticket numéroté, comme en
 * production (etablissements.bar_pickup).
 *
 * ?categories=top|rail|wheel essaie une autre présentation des catégories
 * que celle de l'établissement.
 */

/** Table fictive : sans numéro scanné, les boutons resteraient désactivés. */
const DEMO_TABLE = 1;

/** Les paliers d'aperçu, rapprochés des articles de la carte comme fetchRestaurant. */
function demoProgram(restaurant: Restaurant): LoyaltyProgram | null {
  const demo = restaurant.demoLoyalty;
  if (!demo) return null;
  const items = new Map<string, MenuItem>(
    restaurant.categories.flatMap((category) => category.items.map((item) => [item.id, item]))
  );
  return {
    pointsPerEuro: demo.pointsPerEuro,
    rewards: demo.rewards.map(({ id, label, points, items: ids }) => ({
      id,
      label,
      points,
      items: ids.flatMap((itemId) => items.get(itemId) ?? []),
    })),
  };
}

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
  const { theme, service, table, retrait, categories } = await searchParams;
  const fastFood = service === "fast-food";
  // ?table=7 : le numéro d'une vraie table de l'établissement, pour une
  // capture ; illisible, la table fictive.
  const tableNumber = tableParam(table) ?? DEMO_TABLE;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  const themeClass = theme === "ominin" ? undefined : restaurantThemeClass(slug);
  const suivi = !fastFood && Boolean(restaurant.suivi);
  // La fidélité se montre à table : le ticket fast food n'en porte pas.
  const loyalty = fastFood ? null : demoProgram(restaurant);

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
        // à table, quand l'établissement y règle en ligne, ou le simule.
        onlinePayment: fastFood || suivi || Boolean(restaurant.onlinePayment),
        paymentProvider: "stripe",
        squareLocationId: null,
        preview: true,
        // L'accord du chef, comme fetchRestaurant le résout en production.
        pairings: resolvePairings(restaurant.categories, restaurant.pairings),
        formuleOffers: restaurant.pairings
          ? resolveFormuleOffers(formules, restaurant.categories)
          : undefined,
        loyalty,
        ...(suivi && {
          demoSuivi: {
            drinks: restaurant.categories
              .filter((category) => category.boissons)
              .flatMap((category) => category.items.map((item) => item.id)),
            hotDrinks: restaurant.categories
              .filter((category) => category.boissons)
              .flatMap((category) =>
                category.items.filter((item) => category.boissons === "chaudes" || item.chaud)
              )
              .map((item) => item.id),
          },
        }),
        // ?retrait=bar : là où l'aperçu suit la commande, à table ou en fast food.
        barPickup: retrait === "bar" && (fastFood || suivi),
      }}
    >
      <MaybeDemoLoyalty restaurant={restaurant} demo={loyalty ? restaurant.demoLoyalty : undefined}>
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
          <MenuBody
            layout={CATEGORY_LAYOUTS.find(({ id }) => id === categories)?.id ?? restaurant.categoryLayout}
            categories={categoryLinks}
            themeLocked={Boolean(themeClass)}
            bottomPadding="pb-10"
          >
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
          </MenuBody>
          <MenuFooter restaurant={restaurant} themeToggle={!themeClass} />
          {loyalty && (
            <LoyaltyWelcome
              brand={brandName(restaurant)}
              logo={restaurant.logo}
              icon={restaurant.icons?.homeScreen}
              wordmark={restaurant.logoIsName}
              motif={restaurant.loyaltyMotif}
            />
          )}
        </div>
      </MaybeDemoLoyalty>
    </CartProvider>
  );
}

function MaybeDemoLoyalty({
  restaurant,
  demo,
  children,
}: {
  restaurant: Restaurant;
  demo?: DemoLoyalty;
  children: React.ReactNode;
}) {
  if (!demo) return children;
  return (
    <DemoLoyaltyProvider slug={restaurant.slug} demo={demo} wheel={restaurant.loyaltyWheel}>
      {children}
    </DemoLoyaltyProvider>
  );
}
