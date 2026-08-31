import type { MetadataRoute } from "next";

/*
 * Manifeste PWA de l'espace de gestion : installer le site sur l'écran
 * d'accueil est le prérequis des notifications push sur iPhone/iPad, et donne
 * partout une app plein écran au personnel. start_url /gestion vaut sur tous
 * les hosts qui servent l'espace (sous-domaines menu et collect).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ominin",
    short_name: "Ominin",
    description:
      "L'espace de gestion Ominin : commandes, menu et service de votre établissement.",
    start_url: "/gestion",
    display: "standalone",
    background_color: "#0c0a08",
    theme_color: "#0c0a08",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
