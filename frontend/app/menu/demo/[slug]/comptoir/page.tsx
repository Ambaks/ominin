import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRestaurant } from "@/lib/menu-data";
import { ComptoirDemo } from "./comptoir-demo";
import { hasCounterDemo, SCENARIOS } from "./fixtures";

/*
 * Le comptoir d'un restaurant fast food, vu du personnel : l'onglet
 * Commandes de l'espace de gestion, ses cartes « Marquer prête » et
 * « Remettre »,
 * joué sur un service de démonstration (./fixtures) — sans connexion, sans
 * base. Les gestes restent dans l'onglet ouvert. Jamais indexée.
 *
 * ?scenario=rush (défaut) : le coup de feu commence — une file courte, puis
 * une commande payée arrive à intervalles fixes, toujours les mêmes, dans le
 * même ordre. ?scenario=fige : la file pleine, sans arrivée.
 * Les commandes sont datées depuis l'ouverture de l'écran : leur temps
 * d'attente se lit juste.
 */

export async function generateMetadata({
  params,
}: PageProps<"/menu/demo/[slug]/comptoir">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasCounterDemo(slug)) notFound();
  return {
    title: `${restaurant.name} — Comptoir (démonstration)`,
    robots: { index: false, follow: false },
  };
}

export default async function ComptoirDemoPage({
  params,
  searchParams,
}: PageProps<"/menu/demo/[slug]/comptoir">) {
  const { slug } = await params;
  const { scenario } = await searchParams;
  const restaurant = getRestaurant(slug);
  if (!restaurant || !hasCounterDemo(slug)) notFound();

  return (
    <ComptoirDemo
      slug={slug}
      name={restaurant.name}
      scenario={SCENARIOS.find((name) => name === scenario) ?? "rush"}
    />
  );
}
