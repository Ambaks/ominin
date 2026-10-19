import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/site";

/* La racine de club.ominin.com n'est la page d'aucun club : elle mène à la présentation aux clubs. */
export default function ClubsRoot() {
  redirect(`${siteUrl}/club`);
}
