import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CartBar } from "@/components/menu/cart-bar";
import { CategoryNav } from "@/components/menu/category-nav";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuSection } from "@/components/menu/menu-section";
import { assembleCategories } from "@/lib/gestion/mappers";
import { CartProvider } from "@/lib/menu/cart";
import type { Restaurant } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/server";

/** L'offre et le réglage paiement de l'établissement pilotent le panier. */
type MenuData = Restaurant & { offre: string; onlinePayment: boolean };

/*
 * Menu public : lecture anonyme de la base (policies RLS « public read »).
 * Les modifications faites dans l'espace de gestion sont visibles ici
 * immédiatement. cache() déduplique entre generateMetadata et la page.
 */
const getRestaurant = cache(async (slug: string): Promise<MenuData | null> => {
  const supabase = await createClient();

  // Catégories et items embarqués par PostgREST : un seul aller-retour
  // sur la page la plus consultée (chaque scan de QR code).
  const { data: etablissement, error } = await supabase
    .from("etablissements")
    .select("*, categories(*), items(*)")
    .eq("slug", slug)
    .order("position", { referencedTable: "categories", ascending: true })
    .order("created_at", { referencedTable: "items", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!etablissement) return null;

  return {
    slug: etablissement.slug,
    name: etablissement.name,
    tagline: etablissement.tagline,
    coverImage: etablissement.cover_image ?? undefined,
    address: etablissement.address,
    phone: etablissement.phone,
    hours: etablissement.hours,
    offre: etablissement.offre,
    // Colonne de la migration 20260709000002 (types à régénérer) ; absente ⇒ false.
    onlinePayment:
      (etablissement as { online_payment?: boolean }).online_payment ?? false,
    categories: assembleCategories(
      etablissement.categories,
      etablissement.items
    ).filter((category) => category.items.length > 0),
  };
});

export async function generateMetadata({
  params,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();
  return {
    title: `${restaurant.name} — Menu`,
    description: `${restaurant.tagline} · ${restaurant.address}`,
  };
}

export default async function MenuPage({
  params,
  searchParams,
}: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const { embed, table } = await searchParams;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();

  const parsedTable = Number(Array.isArray(table) ? table[0] : table);
  const tableNumber =
    Number.isInteger(parsedTable) && parsedTable > 0 ? parsedTable : null;
  const orderingEnabled =
    restaurant.offre === "smart" || restaurant.offre === "connect";

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
        onlinePayment: orderingEnabled && restaurant.onlinePayment,
      }}
    >
      <div className="flex flex-1 flex-col">
        <Hero restaurant={restaurant} />
        <CategoryNav categories={categoryLinks} embedded={embed === "1"} />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-10 pb-28 lg:max-w-5xl lg:gap-16 lg:px-10 lg:py-14">
          {restaurant.categories.map((category, index) => (
            <MenuSection key={category.id} category={category} index={index} />
          ))}
        </main>
        <MenuFooter restaurant={restaurant} />
      </div>
      <CartBar />
    </CartProvider>
  );
}
