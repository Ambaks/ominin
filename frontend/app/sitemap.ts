import type { MetadataRoute } from "next";
import { clipSiteUrl, collectSiteUrl, menuSiteUrl, siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/*
 * Sitemap unique pour tous les hosts : portail, landing de chaque produit, et
 * un lien par menu public. Les entrées inter-domaines sont légitimes parce que
 * le robots.txt servi par chaque sous-domaine désigne ce même sitemap.
 * Les slugs sont lus en anonyme (policy RLS « public read » sur
 * etablissements) ; si la base est indisponible, on dégrade proprement aux
 * routes statiques plutôt que de casser le crawl.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/sur-mesure`, changeFrequency: "monthly", priority: 0.8 },
    { url: menuSiteUrl, changeFrequency: "weekly", priority: 0.9 },
    { url: collectSiteUrl, changeFrequency: "weekly", priority: 0.9 },
    { url: clipSiteUrl, changeFrequency: "weekly", priority: 0.9 },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("etablissements")
      .select("slug, created_at, etablissement_settings(features)");
    for (const row of data ?? []) {
      const { slug, created_at } = row;
      // Menu QR fermé : la page répond 404, elle n'a rien à faire au crawl.
      const features = row.etablissement_settings?.features as
        | { qr?: boolean }
        | null;
      if (features?.qr === false) continue;
      routes.push({
        url: `${menuSiteUrl}/m/${slug}`,
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
