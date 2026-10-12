import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brandName, getRestaurant } from "@/lib/menu-data";
import { SCENARIOS } from "../_service/fixtures";
import { hasSalleDemo } from "./fixtures";
import { SalleDemo } from "./salle-demo";

/*
 * La salle d'un restaurant à table, vue du personnel : l'onglet Commandes
 * de l'espace de gestion, ses cartes « À servir » par table, joué sur un
 * service de démonstration (./fixtures) — sans connexion, sans base. Les
 * gestes restent dans l'onglet ouvert. Jamais indexée.
 *
 * ?scenario=rush (défaut) : la salle du midi, où d'autres tables commandent
 * sous les yeux à mesure qu'elles se libèrent. ?scenario=fige : la même
 * salle, sans arrivée.
 * L'écran s'ouvre à l'heure du service de ./fixtures, quelle que soit celle
 * de l'appareil : un midi, à toute heure.
 */

export async function generateMetadata({ params }: PageProps<"/menu/demo/[slug]/salle">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasSalleDemo(slug)) notFound();
  return {
    title: `${brandName(restaurant)} — Salle (démonstration)`,
    robots: { index: false, follow: false },
  };
}

export default async function SalleDemoPage({ params, searchParams }: PageProps<"/menu/demo/[slug]/salle">) {
  const { slug } = await params;
  const { scenario } = await searchParams;
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasSalleDemo(slug)) notFound();
  const played = SCENARIOS.find((name) => name === scenario) ?? "rush";

  return (
    // Un service par adresse : changer de scénario rouvre la salle, horloge comprise.
    <SalleDemo key={`${slug}:${played}`} slug={slug} name={`${restaurant.name} · Salle`} scenario={played} />
  );
}
