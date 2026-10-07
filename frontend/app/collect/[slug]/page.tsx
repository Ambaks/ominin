import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { FormulesBanner, FormulesSection } from "@/components/menu/formules";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuHighlights } from "@/components/menu/menu-highlights";
import { MenuSection } from "@/components/menu/menu-section";
import { formatOpeningHours, isOpenAt } from "@/lib/collect/hours";
import { isCollectActive } from "@/lib/collect/server";
import { brandFontVariables } from "@/lib/menu/brand-fonts";
import { CartProvider } from "@/lib/menu/cart";
import { restaurantThemeClass } from "@/lib/menu-data";
import { fetchRestaurant } from "@/lib/public-menu";
import { collectSiteUrl } from "@/lib/site";

/*
 * Page de commande à emporter : la carte du menu QR (mêmes articles,
 * formules, tarifs, thème), commandée sans table, payée en ligne sur le
 * compte du restaurant et retirée à l'heure choisie. Même cache que le menu :
 * disponibilité, prix et créneau font foi en base, dans place_order.
 */
export const revalidate = 60;

const getPage = cache(async (slug: string) => {
  const data = await fetchRestaurant(slug);
  if (!data) return null;
  return { ...data, active: await isCollectActive(data.id) };
});

export async function generateMetadata({
  params,
}: PageProps<"/collect/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();
  const title = `${data.restaurant.name} — Commande à emporter`;
  const description = `Commandez et payez en ligne, retrait chez ${data.restaurant.name} · ${data.restaurant.address}`;
  const image = data.restaurant.coverImage ?? data.restaurant.poster;
  return {
    title,
    description,
    alternates: { canonical: `${collectSiteUrl}/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${collectSiteUrl}/${slug}`,
      images: image ? [image] : undefined,
    },
  };
}

function Unavailable({ name, phone }: { name: string; phone: string | null }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        Click & collect
      </p>
      <h1 className="font-display text-2xl font-medium tracking-tight">{name}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        La commande à emporter en ligne n&apos;est pas disponible pour cet
        établissement.
        {phone && (
          <>
            {" "}Vous pouvez le contacter au{" "}
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="font-semibold text-ember-1"
            >
              {phone}
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}

export default async function CollectPage({
  params,
}: PageProps<"/collect/[slug]">) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();
  const {
    restaurant,
    onlinePayment,
    paymentProvider,
    squareLocationId,
    loyalty,
    formules,
    openingHours,
    collectSlotMinutes,
  } = data;

  // Payée à la commande : sans encaisseur en ligne (Stripe ou Square) ni
  // horaires, rien ne peut se commander.
  const payable =
    onlinePayment &&
    (paymentProvider === "stripe" ||
      (paymentProvider === "square" && squareLocationId !== null));
  if (!data.active || !payable || !openingHours) {
    return <Unavailable name={restaurant.name} phone={restaurant.phone ?? null} />;
  }

  const banner = restaurant.formulesBanner;
  const showBanner =
    restaurant.poster != null &&
    banner != null &&
    formules.some((formule) => banner.formules.includes(formule.name));
  const categoryLinks = [
    ...(!showBanner && formules.length > 0
      ? [{ id: "formules", name: "Formules" }]
      : []),
    ...restaurant.categories.map(({ id, name }) => ({ id, name })),
  ];
  const theme = restaurantThemeClass(slug);
  const openNow = isOpenAt(openingHours, new Date());

  return (
    <CartProvider
      config={{
        slug,
        tableNumber: null,
        orderingEnabled: true,
        restaurantName: restaurant.name,
        onlinePayment: true,
        paymentProvider,
        squareLocationId,
        loyalty,
        collect: { hours: openingHours, slotMinutes: collectSlotMinutes },
      }}
    >
      <div
        data-menu-root
        className={`${brandFontVariables} ${theme ?? ""} flex flex-1 flex-col bg-background text-foreground`}
      >
        <Hero
          restaurant={restaurant}
          banner={
            showBanner ? (
              <FormulesBanner banner={banner} formules={formules} />
            ) : undefined
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
              Payé en ligne, prêt à l&apos;heure choisie · {formatOpeningHours(openingHours)}
            </span>
          </div>
        </div>
        <MenuHighlights highlights={restaurant.highlights} />
        <CartBar />
        <CategoryNav categories={categoryLinks} themeLocked={Boolean(theme)} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 pb-28 pt-5 sm:pt-10 lg:max-w-5xl lg:gap-24 lg:px-10 lg:py-14">
          {!showBanner && formules.length > 0 && (
            <FormulesSection formules={formules} />
          )}
          {restaurant.categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              La carte est en préparation — revenez bientôt.
            </p>
          ) : (
            restaurant.categories.map((category, i) => (
              <MenuSection key={category.id} category={category} first={i === 0} />
            ))
          )}
        </main>
        <MenuFooter restaurant={restaurant} themeToggle={!theme} />
      </div>
    </CartProvider>
  );
}
