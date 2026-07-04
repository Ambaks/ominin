import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/menu-data";
import { Hero } from "@/components/menu/hero";
import { CategoryNav } from "@/components/menu/category-nav";
import { MenuSection } from "@/components/menu/menu-section";
import { MenuFooter } from "@/components/menu/menu-footer";

export async function generateMetadata({
  params,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();
  return {
    title: `${restaurant.name} — Menu`,
    description: `${restaurant.tagline} · ${restaurant.address}`,
  };
}

export default async function MenuPage({ params }: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant) notFound();

  const categoryLinks = restaurant.categories.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <Hero restaurant={restaurant} />
      <CategoryNav categories={categoryLinks} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-12 px-5 py-10">
        {restaurant.categories.map((category, index) => (
          <MenuSection key={category.id} category={category} index={index} />
        ))}
      </main>
      <MenuFooter restaurant={restaurant} />
    </div>
  );
}
