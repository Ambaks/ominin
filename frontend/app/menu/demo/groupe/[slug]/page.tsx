import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { GroupDashboard } from "@/components/demo/groupe/dashboard";
import { groupVenues } from "@/lib/demo/groupe/catalog";
import { getGroup } from "@/lib/demo/groupe/data";
import { periodSummary } from "@/lib/demo/groupe/simulation";
import { clockParams, resolveClock } from "@/lib/demo/sim";
import { contactEmail } from "@/lib/landing-data";

/*
 * Vue groupe pour le propriétaire de plusieurs établissements : chaque adresse
 * en direct — encaissé, tables, service, additions ouvertes — et la semaine,
 * côte à côte. Démo de prospection sur une journée simulée (lib/demo/groupe) :
 * seuls les groupes décrits là ont une page, les autres slugs répondent 404.
 * Jamais indexée. La période se calcule ici : le téléphone n'a que la
 * journée à simuler.
 *
 * Mêmes paramètres que la vue réseau : ?heure=12:34 rejoue toujours la même
 * séquence depuis cette heure, ?vitesse=0 fige l'horloge, ?vitesse=60 fait
 * défiler une heure par minute, ?jour=AAAA-MM-JJ choisit la journée.
 */

export const viewport: Viewport = {
  themeColor: "#121315",
};

export async function generateMetadata({ params }: PageProps<"/menu/demo/groupe/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const group = getGroup(slug);
  if (!group) notFound();
  return {
    title: `${group.name} — Vue groupe (démo)`,
    description: "Tous vos établissements en direct : encaissé, tables, service, et la semaine côte à côte.",
    robots: { index: false, follow: false },
  };
}

export default async function GroupPage({ params, searchParams }: PageProps<"/menu/demo/groupe/[slug]">) {
  const { slug } = await params;
  const group = getGroup(slug);
  if (!group) notFound();
  const clock = resolveClock(group, clockParams(await searchParams), new Date());
  const venues = groupVenues(group);
  const period = periodSummary(group, venues, clock.day, group.display.periodDays);
  return <GroupDashboard slug={slug} venues={venues} clock={clock} period={period} contact={contactEmail} />;
}
