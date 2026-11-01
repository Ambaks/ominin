import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BohoSite } from "@/components/sites/boho/site";
import { SiteMotion } from "@/components/sites/motion";
import { fetchBulleOffer } from "@/lib/bulles/public";
import { bohoFontVariables } from "@/lib/menu/brand-fonts";
import { fetchRestaurant } from "@/lib/public-menu";
import { BOHO_THEME_COLOR, bohoPhotos } from "@/lib/sites/boho";
import { siteOriginOf } from "@/lib/sites/bespoke";
import { isSiteOpen } from "@/lib/sites/public";
import "@/components/sites/boho/boho.css";
import "@/components/sites/boho/bulles.css";

/*
 * Le site d'un établissement, ouvert par la capacité « Site web », en attendant
 * un domaine à lui. Seul le Boho en a un pour l'instant. Rendu puis revalidé
 * comme le menu : la carte et les horaires suivent la gestion sans toucher la
 * base à chaque visite. Cocher ou décocher la case prend effet dans ce délai.
 */
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const getRestaurant = cache(fetchRestaurant);
const getSiteOpen = cache(isSiteOpen);
const getOffer = cache(fetchBulleOffer);

const DESCRIPTION =
  "Restaurant chicha à l'ambiance bohème, avenue des États-Unis à Toulouse : grillades, cocktails, chichas";

export async function generateMetadata({
  params,
}: PageProps<"/menu/w/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!(await getSiteOpen(slug))) notFound();
  const description = (await getOffer(slug))
    ? `${DESCRIPTION}, et des bulles chauffées à réserver dans le jardin.`
    : `${DESCRIPTION}.`;
  const origin = siteOriginOf(slug);
  return {
    title: "BOHO · Restaurant chicha à Toulouse",
    description,
    // Aperçu tant que le domaine du Boho ne pointe pas ici.
    ...(origin ? { alternates: { canonical: origin } } : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      title: "BOHO · Côté Jardin",
      description,
      images: [bohoPhotos.terrasse.src],
    },
  };
}

export const viewport: Viewport = {
  themeColor: BOHO_THEME_COLOR,
  colorScheme: "dark",
};

export default async function BohoSitePage({ params }: PageProps<"/menu/w/[slug]">) {
  const { slug } = await params;
  if (!(await getSiteOpen(slug))) notFound();
  const [data, offer] = await Promise.all([getRestaurant(slug), getOffer(slug)]);
  if (!data) notFound();

  return (
    <div className={`bo-site ${bohoFontVariables}`}>
      <BohoSite restaurant={data.restaurant} offer={offer} />
      <SiteMotion root=".bo-site" />
    </div>
  );
}
