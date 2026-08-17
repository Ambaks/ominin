import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/*
 * Un seul robots.txt sert tous les hosts (le proxy ne réécrit pas les chemins
 * avec extension), et les espaces privés n'ont pas le même chemin selon le
 * host : /gestion sur menu.ominin.com, /menu/gestion sur le domaine principal
 * quand le sous-domaine est inerte, /gestion aussi sur collect.ominin.com
 * (l'espace y est servi via l'arborescence menu). On interdit toutes les
 * formes — un chemin inexistant sur un host donné est sans effet.
 */
const PRIVATE_PATHS = [
  "/gestion/",
  "/onboarding",
  "/connexion",
  "/inscription",
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
        ...PRIVATE_PATHS.map((p) => `/collect${p}`),
        // CRM interne : aucun chemin public, l'arbre entier est interdit.
        "/admin",
        "/admin/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
