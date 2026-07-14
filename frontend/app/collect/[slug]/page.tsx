import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CollectExperience } from "@/components/collect/collect-experience";
import { isCollectActive } from "@/lib/collect/server";
import { fetchRestaurant } from "@/lib/public-menu";

/*
 * Page de commande à emporter d'un établissement. Même stratégie de cache
 * que le menu QR : lecture anonyme revalidée périodiquement — la
 * disponibilité et les prix font de toute façon foi côté serveur au moment
 * du checkout (/api/collect/checkout).
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
  return {
    title: `${data.restaurant.name} — Click & collect`,
    description: `Commandez à emporter chez ${data.restaurant.name} · ${data.restaurant.address}`,
  };
}

export default async function CollectPage({
  params,
}: PageProps<"/collect/[slug]">) {
  const { slug } = await params;
  const data = await getPage(slug);
  if (!data) notFound();

  if (!data.active) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
        <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
          Click & collect
        </p>
        <h1 className="font-display text-2xl font-medium tracking-tight">
          {data.restaurant.name}
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          La commande à emporter en ligne n&apos;est pas disponible pour cet
          établissement. Vous pouvez le contacter directement
          {data.restaurant.phone && (
            <>
              {" "}
              au{" "}
              <a
                href={`tel:${data.restaurant.phone.replace(/\s/g, "")}`}
                className="font-semibold text-ember-1"
              >
                {data.restaurant.phone}
              </a>
            </>
          )}
          .
        </p>
      </div>
    );
  }

  return <CollectExperience restaurant={data.restaurant} />;
}
