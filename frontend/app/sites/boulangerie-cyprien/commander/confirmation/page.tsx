import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderConfirmation } from "@/components/collect/order-confirmation";
import { isOrderId } from "@/lib/collect/shared";
import { restaurantThemeClass } from "@/lib/menu-data";
import { cyprienHref } from "@/lib/sites/cyprien";
import { CYPRIEN_SLUG, getShop } from "../shop";
import "../commander.css";

export const metadata: Metadata = {
  title: "Votre commande",
  robots: { index: false },
};

/*
 * Après le paiement : le composant confirme le règlement auprès de Stripe,
 * puis suit la commande (prise en charge, prête) jusqu'au retrait.
 */
export default async function ConfirmationPage({
  searchParams,
}: PageProps<"/sites/boulangerie-cyprien/commander/confirmation">) {
  const { commande } = await searchParams;
  if (typeof commande !== "string" || !isOrderId(commande)) notFound();
  const data = await getShop();
  if (!data) notFound();

  return (
    <div
      data-menu-root
      className={`${restaurantThemeClass(CYPRIEN_SLUG) ?? ""} cy-track mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pb-24 pt-12 text-foreground sm:pt-16`}
    >
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
          Click &amp; collect
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">Votre commande</h1>
      </header>
      <OrderConfirmation
        orderId={commande}
        slug={CYPRIEN_SLUG}
        restaurantName={data.restaurant.name}
        address={data.restaurant.address}
        phone={data.restaurant.phone}
        back={{ href: cyprienHref("/commander"), label: "Revenir à la commande en ligne" }}
      />
    </div>
  );
}
