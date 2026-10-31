import { notFound } from "next/navigation";
import { bulleDemoSlug } from "@/lib/bulles/demo";

/**
 * Les paramètres d'une page /demo/<slug>/… rendus à la page /w/<slug>/… qu'elle
 * reprend, le slug remplacé par celui de l'établissement de démonstration.
 * Une adresse qui n'est pas une démo de bulles n'existe pas.
 */
export async function demoParams<P extends { slug: string }>(params: Promise<P>): Promise<P> {
  const resolved = await params;
  const slug = bulleDemoSlug(resolved.slug);
  if (!slug) notFound();
  return { ...resolved, slug };
}
