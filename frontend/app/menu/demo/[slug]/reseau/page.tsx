import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NetworkDashboard } from "@/components/demo/reseau/dashboard";
import { getNetwork } from "@/lib/demo/reseau/data";
import { contactEmail } from "@/lib/landing-data";
import { resolveClock } from "@/lib/demo/reseau/simulation";

/*
 * Vue réseau pour le siège d'une enseigne en franchise : commandes, attente
 * et restaurants en rush, sur tout le parc, en direct. Démo de prospection
 * sur données simulées (lib/demo/reseau) : seules les enseignes décrites là
 * ont une page, les autres slugs répondent 404. Jamais indexée.
 *
 * ?heure=12:34 part de cette heure et rejoue toujours la même séquence (la
 * capture d'un film), ?vitesse=0 fige l'horloge, ?vitesse=60 fait défiler
 * une heure par minute, ?jour=AAAA-MM-JJ choisit la journée — voir resolveClock.
 */

export const viewport: Viewport = {
  themeColor: "#131416",
};

export async function generateMetadata({
  params,
}: PageProps<"/menu/demo/[slug]/reseau">): Promise<Metadata> {
  const { slug } = await params;
  const network = getNetwork(slug);
  if (!network) notFound();
  return {
    title: `${network.name} — Vue réseau (démo)`,
    description: `Tous les restaurants ${network.name} en direct : commandes, attente, restaurants en rush.`,
    robots: { index: false, follow: false },
  };
}

const single = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export default async function NetworkPage({
  params,
  searchParams,
}: PageProps<"/menu/demo/[slug]/reseau">) {
  const { slug } = await params;
  const network = getNetwork(slug);
  if (!network) notFound();
  const { heure, jour, vitesse } = await searchParams;
  const clock = resolveClock(
    network,
    { heure: single(heure), jour: single(jour), vitesse: single(vitesse) },
    new Date()
  );
  return <NetworkDashboard slug={slug} clock={clock} contact={contactEmail} />;
}
