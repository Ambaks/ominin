import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/collect/order-confirmation";
import { fetchRestaurant } from "@/lib/public-menu";

export const metadata: Metadata = {
  title: "Commande — Click & collect",
};

/*
 * Retour de Stripe Checkout. La commande est créée par le webhook, avec un
 * léger différé : le composant client interroge /api/collect/order jusqu'à
 * la voir apparaître, puis suit son statut (préparation → prête).
 */
export default async function ConfirmationPage({
  params,
  searchParams,
}: PageProps<"/collect/[slug]/confirmation">) {
  const { slug } = await params;
  const { session_id } = await searchParams;
  if (typeof session_id !== "string" || !session_id) notFound();

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
      <OrderConfirmation sessionId={session_id} slug={slug} />
    </div>
  );
}
