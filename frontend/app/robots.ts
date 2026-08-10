import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/*
 * Un seul robots.txt sert tous les hosts (le proxy ne réécrit pas les chemins
 * avec extension), et les espaces privés n'ont pas le même chemin selon le
 * host : /gestion sur menu.ominin.com, /menu/gestion sur le domaine principal
 * quand le sous-domaine est inerte. On interdit les deux formes — un chemin
 * inexistant sur un host donné est sans effet.
 */
const PRIVATE_PATHS = [
  "/gestion/",
  "/onboarding",
  "/login",
  "/espace",
  "/auth/",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...PRIVATE_PATHS,
        ...PRIVATE_PATHS.map((p) => `/menu${p}`),
        ...PRIVATE_PATHS.map((p) => `/clip${p}`),
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
