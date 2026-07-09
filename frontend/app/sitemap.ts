import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/*
 * Landing + un lien par menu public. Les slugs sont lus en anonyme (policy
 * RLS « public read » sur etablissements) ; si la base est indisponible, on
 * dégrade proprement à la seule landing plutôt que de casser le crawl.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("etablissements")
      .select("slug, created_at");
    for (const { slug, created_at } of data ?? []) {
      routes.push({
        url: `${siteUrl}/m/${slug}`,
        lastModified: created_at ? new Date(created_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Base injoignable : sitemap réduit aux routes statiques.
  }

  return routes;
}
