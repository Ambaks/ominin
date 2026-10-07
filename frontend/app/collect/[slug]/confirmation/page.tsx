import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/collect/order-confirmation";
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
  if (typeof commande !== "string" || !commande) notFound();

  const data = await fetchRestaurant(slug);
  if (!data) notFound();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 py-10">
      <header>
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Click & collect
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight">
          {data.restaurant.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {data.restaurant.address}
          {data.restaurant.phone && ` · ${data.restaurant.phone}`}
        </p>
      </header>
      <OrderConfirmation
        orderId={commande}
        slug={slug}
        restaurantName={data.restaurant.name}
        address={data.restaurant.address}
        phone={data.restaurant.phone}
      />
    </div>
  );
}
