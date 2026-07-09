import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CategoryNav } from "@/components/menu/category-nav";
import { Hero } from "@/components/menu/hero";
import { MenuFooter } from "@/components/menu/menu-footer";
import { MenuSection } from "@/components/menu/menu-section";
import { assembleCategories } from "@/lib/gestion/mappers";
import type { Restaurant } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/server";

/*
 * Menu public : lecture anonyme de la base (policies RLS « public read »).
 * Les modifications faites dans l'espace de gestion sont visibles ici
 * immédiatement. cache() déduplique entre generateMetadata et la page.
 */
const getRestaurant = cache(async (slug: string): Promise<Restaurant | null> => {
  const supabase = await createClient();

  const { data: etablissement } = await supabase
    .from("etablissements")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!etablissement) return null;

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("etablissement_id", etablissement.id)
      .order("position", { ascending: true }),
    supabase
      .from("items")
      .select("*")
      .eq("etablissement_id", etablissement.id)
      .order("created_at", { ascending: true }),
  ]);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  if (itemsResult.error) throw new Error(itemsResult.error.message);

  return {
    slug: etablissement.slug,
    name: etablissement.name,
    tagline: etablissement.tagline,
    coverImage: etablissement.cover_image ?? undefined,
    address: etablissement.address,
    phone: etablissement.phone,
    hours: etablissement.hours,
    categories: assembleCategories(
      categoriesResult.data,
      itemsResult.data
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

export default async function MenuPage({ params, searchParams }: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const restaurant = await getRestaurant(slug);
  if (!restaurant) notFound();

  const categoryLinks = restaurant.categories.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <Hero restaurant={restaurant} />
      <CategoryNav categories={categoryLinks} embedded={embed === "1"} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-10 lg:max-w-5xl lg:gap-16 lg:px-10 lg:py-14">
        {restaurant.categories.map((category, index) => (
          <MenuSection key={category.id} category={category} index={index} />
        ))}
      </main>
      <MenuFooter restaurant={restaurant} />
    </div>
  );
}
