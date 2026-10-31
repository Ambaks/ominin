import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BulleBooking } from "@/components/bulles/booking";
import { fetchBulleOffer } from "@/lib/bulles/public";
import { formatDuration } from "@/lib/bulles/format";
import { formatCents } from "@/lib/club/format";

/*
 * Réserver sa bulle. Réglages, bulles et jours ouverts sont rendus puis
 * revalidés ; le planning du soir choisi se lit dans le navigateur, à jour.
 */
export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

const getOffer = cache(fetchBulleOffer);

export async function generateMetadata({ params }: PageProps<"/menu/w/[slug]/bulle">): Promise<Metadata> {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) notFound();
  return {
    title: `Réserver une bulle · ${offer.etablissement.name}`,
    description: `${formatCents(offer.placeCents)} par personne, ${formatDuration(offer.durationMinutes)}, dès ${offer.minParty} personnes.`,
    robots: { index: false, follow: false },
  };
}

export default async function BullePage({ params }: PageProps<"/menu/w/[slug]/bulle">) {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer) notFound();
  return (
    <div className="bo-bulle-page">
      <div className="bo-bulle-intro">
        <h1 className="bo-script bo-bulle-title">Votre bulle</h1>
        <p className="bo-muted-night">
          {formatCents(offer.placeCents)} par personne · {formatDuration(offer.durationMinutes)} · de{" "}
          {offer.minParty} à {offer.maxParty} personnes
        </p>
      </div>
      <BulleBooking offer={offer} />
    </div>
  );
}
