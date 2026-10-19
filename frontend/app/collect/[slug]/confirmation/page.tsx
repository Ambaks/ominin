import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/collect/order-confirmation";
import { TrackingShell } from "@/components/collect/tracking-shell";
import { isOrderId } from "@/lib/collect/shared";
import { fetchRestaurant } from "@/lib/public-menu";

export const metadata: Metadata = {
  title: "Votre commande à emporter",
  robots: { index: false },
};

/*
 * Suivi d'une commande à emporter, après son paiement dans la feuille
 * (Stripe ou Square) : le composant client confirme le paiement puis suit le
 * statut (préparation → prête).
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps<"/collect/[slug]/confirmation">) {
  const { slug } = await params;
  const { commande } = await searchParams;
  if (typeof commande !== "string" || !isOrderId(commande)) notFound();

  const data = await fetchRestaurant(slug);
  if (!data) notFound();

  return (
    <TrackingShell
      slug={slug}
      name={data.restaurant.name}
      address={data.restaurant.address}
      phone={data.restaurant.phone}
    >
      <OrderConfirmation
        orderId={commande}
        slug={slug}
        restaurantName={data.restaurant.name}
        address={data.restaurant.address}
        phone={data.restaurant.phone}
      />
    </TrackingShell>
  );
}
