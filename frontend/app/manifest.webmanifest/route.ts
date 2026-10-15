import { NextResponse } from "next/server";

/*
 * Manifeste PWA, selon le site qui le sert. Installer le site sur l'écran
 * d'accueil est le prérequis des notifications push sur iPhone/iPad, et
 * l'app s'ouvre sur start_url : celle de l'espace de gestion (/gestion, sur
 * les sous-domaines menu et collect) n'existe pas sur le host admin, qui
 * s'ouvrait donc sur une 404.
 */

const COMMON = {
  display: "standalone",
  background_color: "#0c0a08",
  theme_color: "#0c0a08",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
};

export function GET(request: Request) {
  const admin = request.headers.get("host") === process.env.NEXT_PUBLIC_ADMIN_HOST;
  const manifest = admin
    ? {
        // id distinct : l'iPhone traite l'admin comme une autre app que la gestion.
        id: "/?app=admin",
        name: "Ominin Admin",
        short_name: "Admin",
        description: "L'admin Ominin : prospects, clients et suivi du projet.",
        start_url: "/projet",
        ...COMMON,
      }
    : {
        id: "/gestion",
        name: "Ominin",
        short_name: "Ominin",
        description:
          "L'espace de gestion Ominin : commandes, menu et service de votre établissement.",
        start_url: "/gestion",
        ...COMMON,
      };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      // Le contenu dépend du host : jamais un manifeste d'un site servi à l'autre.
      Vary: "Host",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
