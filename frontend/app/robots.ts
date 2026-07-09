import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/*
 * Espaces privés et endpoints hors index : gestion (app connectée),
 * onboarding, login, callback auth et routes API. Le reste (landing,
 * menus publics /m/[slug]) est indexable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/gestion/", "/onboarding", "/login", "/auth/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
