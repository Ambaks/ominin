import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { EtoileLive } from "@/components/menu/etoile/etoile-live";
import { etoileScene } from "@/lib/menu-data";
import { fetchRestaurant } from "@/lib/public-menu";
import { menuSiteUrl } from "@/lib/site";

/*
 * La carte d'un club sur son sous-domaine (club.ominin.com/<slug>/carte),
 * hors de la mise en page des pages du club : la scène de L'Étoile a son
 * propre ciel et son propre défilement. Un club sans scène a sa carte au menu
 * QR. Comme le menu, la page se revalide : la carte changée en gestion y
 * paraît dans la minute.
 */
export const revalidate = 60;

const getRestaurant = cache(fetchRestaurant);

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]/carte">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRestaurant(slug);
  if (!data) return {};
  return {
    title: `${data.restaurant.name} — La carte`,
    robots: { index: false, follow: false },
  };
}

export default async function ClubCartePage({ params }: PageProps<"/clubs/[slug]/carte">) {
  const { slug } = await params;
  if (!etoileScene(slug)) permanentRedirect(`${menuSiteUrl}/m/${slug}`);
  const data = await getRestaurant(slug);
  if (!data || !data.qrMenu) notFound();
  return <EtoileLive slug={slug} data={data} />;
}
