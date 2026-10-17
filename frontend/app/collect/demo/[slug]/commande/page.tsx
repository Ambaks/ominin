import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectMenu } from "@/components/collect/collect-menu";
import { COLLECT_DEMO } from "@/lib/collect/demo/data";
import { brandName, getRestaurant } from "@/lib/menu-data";

/*
 * Aperçu de la page de commande à emporter d'un client, servi depuis le
 * registre statique (lib/menu-data) avant tout seed : le rendu de
 * collect.ominin.com/<slug>, aux couleurs de l'établissement, sur ses
 * horaires du registre (collect.openingHours). Mode aperçu (CartConfig.preview) : panier, créneaux
 * et coordonnées se montrent, mais rien n'est compté, envoyé ni payé — la
 * dernière étape ouvre le suivi d'aperçu (../suivi). Jamais indexée.
 */

export async function generateMetadata({
  params,
}: PageProps<"/collect/demo/[slug]/commande">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant?.collect) notFound();
  const title = `${brandName(restaurant)} — Commande à emporter (aperçu)`;
  const description = `Commandez et payez en ligne, retrait chez ${brandName(restaurant)} · ${restaurant.address}`;
  const image = restaurant.coverImage ?? restaurant.poster;
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
    robots: { index: false, follow: false },
  };
}

export default async function CollectPreviewPage({
  params,
}: PageProps<"/collect/demo/[slug]/commande">) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant?.collect) notFound();
  const { openingHours } = restaurant.collect;

  return (
    <CollectMenu
      config={{
        slug,
        tableNumber: null,
        orderingEnabled: true,
        restaurantName: restaurant.name,
        onlinePayment: true,
        paymentProvider: "stripe",
        squareLocationId: null,
        preview: true,
        collect: {
          hours: openingHours,
          slotMinutes: COLLECT_DEMO.slots.intervalMinutes,
        },
      }}
      restaurant={restaurant}
      // Comme en production : une formule désactivée ne se montre pas.
      formules={(restaurant.formules ?? []).filter((formule) => formule.disponible)}
      openingHours={openingHours}
    />
  );
}
