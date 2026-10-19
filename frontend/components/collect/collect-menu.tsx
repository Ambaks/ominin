import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { AffichesBanner, FormulesSection } from "@/components/menu/formules";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import type { Formule } from "@/lib/gestion/types";
import { describeOpeningHours, isOpenAt, type OpeningHours } from "@/lib/collect/hours";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider, type CartConfig } from "@/lib/menu/cart";
import { FORMULES_LINK, formatPrice } from "@/lib/menu/format";
import { restaurantThemeClass, type Restaurant } from "@/lib/menu-data";

/*
 * La page de commande à emporter, servie par collect.ominin.com/<slug> (la
 * base fait foi) et par son aperçu /collect/demo/<slug>/commande (le
 * registre statique, CartConfig.preview) : un seul rendu, pour que l'aperçu
 * montré au gérant soit la page que verront ses clients.
 */
export function CollectMenu({
  config,
  restaurant,
  formules,
  openingHours,
}: {
  config: CartConfig;
  restaurant: Restaurant;
  formules: Formule[];
  openingHours: OpeningHours;
}) {
  // Mêmes règles que le menu QR (app/menu/m/[slug]/page.tsx).
  const affiches = restaurant.affiches ?? [];
  const affichesInHero = restaurant.poster != null && affiches.length > 0;
  const tiles = formules.filter((formule) => !formule.affiche);
  const showFormules = tiles.length > 0 || (!affichesInHero && affiches.length > 0);
  const categoryLinks = [
    ...(showFormules ? [FORMULES_LINK] : []),
    ...restaurant.categories.map(({ id, name }) => ({ id, name })),
  ];
  const theme = restaurantThemeClass(config.slug);
  const openNow = isOpenAt(openingHours, new Date());
  const { onlineMinOrder } = config;

  return (
    <CartProvider config={config}>
      <div
        data-menu-root
        className={`${brandFontVariables} ${theme ?? ""} flex flex-1 flex-col bg-background text-foreground`}
      >
        <Hero
          restaurant={restaurant}
          firstSectionId={categoryLinks[0]?.id}
          banner={
            affichesInHero ? <AffichesBanner affiches={affiches} /> : undefined
          }
        />
        <div className="mx-auto w-full max-w-2xl px-5 pt-5 lg:max-w-5xl lg:px-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm">
            <span className="font-semibold">À emporter</span>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${openNow ? "text-ember-1" : "text-muted"}`}
            >
              <span
                aria-hidden
                className={`size-2 rounded-full ${openNow ? "ember-gradient" : "border border-current"}`}
              />
              {openNow ? "Ouvert : retrait dès que possible" : "Fermé : commandez pour plus tard"}
            </span>
            <span className="w-full text-xs text-muted">
              Payé en ligne, prêt à l&apos;heure choisie
              {onlineMinOrder != null && ` · commande minimum ${formatPrice(onlineMinOrder)}`}
              {" · "}
              {describeOpeningHours(openingHours)}
            </span>
          </div>
        </div>
        <MenuHighlights highlights={restaurant.highlights} />
        <CartBar />
        <CategoryNav categories={categoryLinks} themeLocked={Boolean(theme)} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 pb-28 pt-5 sm:pt-10 lg:max-w-5xl lg:gap-24 lg:px-10 lg:py-14">
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
            restaurant.categories.map((category) => (
              <MenuSection
                key={category.id}
                category={category}
                // La première photo ne se charge d'emblée qu'en tête de carte :
                // sous des formules, elle est déjà loin sous le premier écran.
                first={category.id === categoryLinks[0]?.id}
              />
            ))
          )}
        </main>
        <MenuFooter restaurant={restaurant} themeToggle={!theme} />
      </div>
    </CartProvider>
  );
}
