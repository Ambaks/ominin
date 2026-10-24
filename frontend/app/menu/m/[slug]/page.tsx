import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CallServerButton } from "@/components/menu/call-server-button";
import { CartBar } from "@/components/menu/cart-bar";
import { MenuBody } from "@/components/menu/menu-body";
import { AffichesBanner, FormulesSection, FormuleTiles } from "@/components/menu/formules";
import { HappyHourPill } from "@/components/menu/happy-hour-pill";
import { Hero } from "@/components/menu/hero";
import { LoyaltyWelcome } from "@/components/menu/loyalty-welcome";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import { MenuTicker } from "@/components/menu/menu-ticker";
import { TicketTracker } from "@/components/menu/order-ticket";
import { PanisBackdrop } from "@/components/menu/panis-backdrop";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { LoyaltyMemberProvider } from "@/lib/menu/loyalty-member";
import { withCompactPreview } from "@/lib/menu/compact-preview";
import { HAPPY_HOUR_SECTION_ID, happyHourOf, withHappyHourSection } from "@/lib/menu/happy-hour";
import { FORMULES_LINK } from "@/lib/menu/format";
import { brandName, hasVelours, restaurantThemeClass } from "@/lib/menu-data";
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

// Aucune carte pré-rendue au build : chacune se rend au premier scan, puis
// sert depuis le cache. Table et iframe (?table=, ?embed=) se lisent dans le
// navigateur — searchParams rendrait la page à chaque visite.
export async function generateStaticParams() {
  return [];
}

const getRestaurant = cache(fetchRestaurant);

export async function generateMetadata({
  params,
}: PageProps<"/menu/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRestaurant(slug);
  // Menu QR fermé : le restaurant n'a pas de carte publique chez Ominin.
  if (!data || !data.qrMenu) notFound();
  const { restaurant } = data;
  const title = `${brandName(restaurant)} — Menu`;
  const description = `${restaurant.tagline} · ${restaurant.address}`;
  const shareImage = restaurant.coverImage ?? restaurant.poster;
  const images = shareImage ? [shareImage] : undefined;
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
    // Le raccourci d'écran d'accueil porte ses icônes et son nom, pas ceux d'Ominin.
    ...(restaurant.icons && {
      icons: {
        icon: { url: restaurant.icons.tab, sizes: "32x32", type: "image/png" },
        apple: restaurant.icons.homeScreen,
      },
      appleWebApp: { capable: false, title: restaurant.name },
    }),
  };
}

/** La barre du navigateur aux couleurs de l'établissement. */
export async function generateViewport({
  params,
}: PageProps<"/menu/m/[slug]">): Promise<Viewport> {
  const { slug } = await params;
  const themeColor = (await getRestaurant(slug))?.restaurant.themeColor;
  return themeColor ? { themeColor } : {};
}

export default async function MenuPage({
  params,
}: PageProps<"/menu/m/[slug]">) {
  const { slug } = await params;
  const data = await getRestaurant(slug);
  // Menu QR fermé : le restaurant n'a pas de carte publique chez Ominin.
  if (!data || !data.qrMenu) notFound();
  const {
    id,
    restaurant,
    offre,
    onlinePayment,
    onlineMinOrder,
    closedItems,
    paymentProvider,
    squareLocationId,
    serviceMode,
    barPickup,
    callServer,
    loyalty,
    formules,
    pairings,
    formuleOffers,
  } = data;

  // Les affiches des offres se montrent sous l'affiche du restaurant ; sans
  // elle, en tête de la section des formules, avant les tuiles de celles
  // qu'aucune affiche ne porte.
  const affiches = restaurant.affiches ?? [];
  const affichesInHero = restaurant.poster != null && affiches.length > 0;
  // Une formule à heures (le petit déjeuner) se range dans la happy hour.
  const tiles = formules.filter((formule) => !formule.affiche && !formule.hours);
  const showFormules = tiles.length > 0 || (!affichesInHero && affiches.length > 0);

  const orderingEnabled = offre === "smart" || offre === "connect";
  // Fast food : on commande sans service à table et l'on retire au comptoir ;
  // le QR peut être unique ou celui d'une table.
  const fastFood = orderingEnabled && serviceMode === "fast_food";

  // La happy hour se lit sur la carte telle qu'elle s'affiche (vignettes et
  // leurs photos comprises) ; sa section s'ajoute aux catégories, dans la
  // roue aussi.
  const categories = withCompactPreview(slug, restaurant.categories);
  const happyHour = happyHourOf(categories, formules, new Date());
  const sections = withHappyHourSection(categories, happyHour);
  const happyHourTiles = happyHour && happyHour.formules.length > 0 && (
    <FormuleTiles
      formules={happyHour.formules.map(({ formule }) => formule)}
      wasPrices={Object.fromEntries(
        happyHour.formules.flatMap(({ formule, wasPrice }) =>
          wasPrice === undefined ? [] : [[formule.id, wasPrice]]
        )
      )}
    />
  );

  const categoryLinks = [
    ...(showFormules ? [FORMULES_LINK] : []),
    ...sections.map(({ id, name }) => ({ id, name })),
  ];

  /*
   * Données structurées Restaurant + Menu : pour un établissement sans fiche
   * Google, la page /m/<slug> est souvent la seule source que les moteurs
   * peuvent lire. L'image n'est jointe que si elle est déjà absolue — un
   * chemin local relatif donnerait une URL fausse hors du domaine du menu.
   */
  const shareImage = restaurant.coverImage ?? restaurant.poster;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.tagline,
    address: restaurant.address,
    telephone: restaurant.phone,
    url: `${menuSiteUrl}/m/${slug}`,
    ...(shareImage?.startsWith("http") ? { image: shareImage } : {}),
    hasMenu: {
      "@type": "Menu",
      hasMenuSection: restaurant.categories.map((category) => ({
        "@type": "MenuSection",
        name: category.name,
        hasMenuItem: category.items.map((item) => ({
          "@type": "MenuItem",
          name: item.name,
          ...(item.description ? { description: item.description } : {}),
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: "EUR",
          },
        })),
      })),
    },
  };

  return (
    <CartProvider
      config={{
        slug,
        // La table du QR suit la commande, en fast food aussi : le client y
        // retire au comptoir, la table reste notée (voir show_table_number).
        tableNumber: null,
        tableFromUrl: true,
        orderingEnabled,
        serviceMode,
        barPickup: fastFood && barPickup,
        restaurantName: restaurant.name,
        onlinePayment: orderingEnabled && onlinePayment,
        onlineMinOrder,
        paymentProvider,
        squareLocationId,
        tableTracking: orderingEnabled && !fastFood && restaurant.suivi === true,
        loyalty,
        // Sans commande, rien à fermer : pas de relecture.
        etablissementId: orderingEnabled ? id : undefined,
        closedItems: orderingEnabled ? closedItems : undefined,
        pairings,
        formuleOffers,
      }}
    >
      {/* Le thème de l'établissement (s'il existe) habille menu ET panier :
          la barre est fixed mais reste dans le sous-arbre des variables. */}
      <LoyaltyMemberProvider
        slug={slug}
        enabled={orderingEnabled && loyalty != null}
        wheel={restaurant.loyaltyWheel}
      >
        <div
          data-menu-root
          data-slug={slug}
          data-service={fastFood ? "fast-food" : undefined}
          className={`${brandFontVariables} ${restaurantThemeClass(slug) ?? ""} flex flex-1 flex-col bg-background text-foreground`}
        >
          {/* « < » échappé : un nom ou une description contenant
              « </script> » fermerait la balise et injecterait du script. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
            }}
          />
          {restaurantThemeClass(slug) && hasVelours(slug) && <PanisBackdrop />}
          <MenuTicker items={restaurant.ticker} />
          <Hero
            restaurant={restaurant}
            firstSectionId={categoryLinks[0]?.id}
            banner={
              affichesInHero ? <AffichesBanner affiches={affiches} /> : undefined
            }
          />
          <MenuHighlights highlights={restaurant.highlights} />
          {/* Fixés en bas, les tickets et le panier viennent tôt dans l'ordre de
              tabulation, dans l'ordre de l'écran : ils ne se cherchent pas au
              bout de la carte. */}
          <TicketTracker />
          <CartBar />
          <MenuBody
            layout={restaurant.categoryLayout}
            categories={categoryLinks}
            themeLocked={Boolean(restaurantThemeClass(slug))}
            bottomPadding="pb-28"
          >
            {showFormules && (
              <FormulesSection
                formules={tiles}
                affiches={affichesInHero ? undefined : affiches}
              />
            )}
            {restaurant.categories.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">
                La carte est en préparation — revenez bientôt.
              </p>
            ) : (
              sections.map((category) => (
                <MenuSection
                  key={category.id}
                  category={category}
                  // La première photo ne se charge d'emblée qu'en tête de carte :
                  // sous des formules, elle est déjà loin sous le premier écran.
                  first={category.id === categoryLinks[0]?.id}
                >
                  {category.id === HAPPY_HOUR_SECTION_ID && happyHourTiles}
                </MenuSection>
              ))
            )}
          </MenuBody>
          <MenuFooter
            restaurant={restaurant}
            themeToggle={!restaurantThemeClass(slug)}
          />
          {callServer && <CallServerButton />}
          {happyHour && <HappyHourPill happyHour={happyHour} />}
          <LoyaltyWelcome
            brand={brandName(restaurant)}
            logo={restaurant.logo}
            icon={restaurant.icons?.homeScreen}
            wordmark={restaurant.logoIsName}
            motif={restaurant.loyaltyMotif}
          />
        </div>
      </LoyaltyMemberProvider>
    </CartProvider>
  );
}
