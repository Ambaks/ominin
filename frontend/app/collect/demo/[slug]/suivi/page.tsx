import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewTracking } from "@/components/collect/preview-tracking";
import { TrackingShell } from "@/components/collect/tracking-shell";
import { getRestaurant } from "@/lib/menu-data";

/*
 * Suivi d'aperçu d'une commande à emporter : la page que le client verrait
 * après paiement, dans le même cadre que collect.ominin.com/<slug>/confirmation,
 * rejouée sur la commande passée depuis ../commande. Jamais indexée.
 */

export const metadata: Metadata = {
  title: "Votre commande à emporter (aperçu)",
  robots: { index: false, follow: false },
};

export default async function CollectPreviewTrackingPage({
  params,
}: PageProps<"/collect/demo/[slug]/suivi">) {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant?.collect) notFound();

  return (
    <TrackingShell
      slug={slug}
      name={restaurant.name}
      address={restaurant.address}
      phone={restaurant.phone}
    >
      <PreviewTracking
        slug={slug}
        restaurantName={restaurant.name}
        address={restaurant.address}
        phone={restaurant.phone}
      />
    </TrackingShell>
  );
}
