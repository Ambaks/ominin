import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CollectMenu } from "@/components/collect/collect-menu";
import { isCollectActive } from "@/lib/collect/server";
import { fetchRestaurant } from "@/lib/public-menu";
import { collectSiteUrl } from "@/lib/site";

/*
 * Page de commande à emporter : la carte du menu QR (mêmes articles,
 * formules, tarifs, thème), commandée sans table, payée en ligne sur le
 * compte du restaurant et retirée à l'heure choisie. Même cache que le menu :
 * disponibilité, prix et créneau font foi en base, dans place_order.
 */
export const revalidate = 60;

const getPage = cache(async (slug: string) => {
  const data = await fetchRestaurant(slug);
  if (!data) return null;
  return { ...data, active: await isCollectActive(data.id) };
});

export async function generateMetadata({
  params,
}: PageProps<"/collect/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();
  const title = `${data.restaurant.name} — Commande à emporter`;
  const description = `Commandez et payez en ligne, retrait chez ${data.restaurant.name} · ${data.restaurant.address}`;
  const image = data.restaurant.coverImage ?? data.restaurant.poster?.src;
  return {
    title,
    description,
    alternates: { canonical: `${collectSiteUrl}/${slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${collectSiteUrl}/${slug}`,
      images: image ? [image] : undefined,
    },
  };
}

function Unavailable({ name, phone }: { name: string; phone: string | null }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
        Click & collect
      </p>
      <h1 className="font-display text-2xl font-medium tracking-tight">{name}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        La commande à emporter en ligne n&apos;est pas disponible pour cet
        établissement.
        {phone && (
          <>
            {" "}Vous pouvez le contacter au{" "}
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              className="font-semibold text-ember-1"
            >
              {phone}
            </a>
            .
          </>
        )}
      </p>
    </div>
  );
}

export default async function CollectPage({
  params,
}: PageProps<"/collect/[slug]">) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();
  const {
    id,
    restaurant,
    onlinePayment,
    onlineMinOrder,
    closedItems,
    paymentProvider,
    squareLocationId,
    loyalty,
    formules,
    openingHours,
    collectSlotMinutes,
  } = data;

  // Payée à la commande : sans encaisseur en ligne (Stripe, Square, ou la
  // démonstration, sans débit) ni horaires, rien ne peut se commander.
  const payable =
    onlinePayment &&
    (paymentProvider === "stripe" ||
      paymentProvider === "demo" ||
      (paymentProvider === "square" && squareLocationId !== null));
  if (!data.active || !payable || !openingHours) {
    return <Unavailable name={restaurant.name} phone={restaurant.phone ?? null} />;
  }

  return (
    <CollectMenu
      config={{
        slug,
        tableNumber: null,
        orderingEnabled: true,
        restaurantName: restaurant.name,
        onlinePayment: true,
        paymentProvider,
        squareLocationId,
        loyalty,
        onlineMinOrder,
        etablissementId: id,
        closedItems,
        collect: { hours: openingHours, slotMinutes: collectSlotMinutes },
      }}
      restaurant={restaurant}
      formules={formules}
      openingHours={openingHours}
    />
  );
}
