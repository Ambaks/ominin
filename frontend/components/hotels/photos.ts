import type { StaticImageData } from "next/image";
import type { HotelPhoto } from "@/lib/hotels-landing-data";
import beach from "@/public/hotels/beach.webp";
import breakfast from "@/public/hotels/breakfast.webp";
import cachetCarte from "@/public/hotels/cachet-carte.webp";
import cachetChevalet from "@/public/hotels/cachet-chevalet.webp";
import cachetPlaque from "@/public/hotels/cachet-plaque.webp";
import deck from "@/public/hotels/deck.webp";
import hero from "@/public/hotels/hero.webp";
import horizon from "@/public/hotels/horizon.webp";
import lobby from "@/public/hotels/lobby.webp";
import pool from "@/public/hotels/pool.webp";
import room from "@/public/hotels/room.webp";
import rooftop from "@/public/hotels/rooftop.webp";
import spa from "@/public/hotels/spa.webp";
import suite from "@/public/hotels/suite.webp";
import terrace from "@/public/hotels/terrace.webp";

/* Photos libres (Unsplash) et visuels de la proposition Plage Palace (le cachet, l'horizon), hébergées ici : flou de chargement et tailles servies par next/image. */
export const photos: Record<HotelPhoto, StaticImageData> = {
  hero,
  pool,
  beach,
  rooftop,
  lobby,
  spa,
  room,
  breakfast,
  deck,
  suite,
  terrace,
  cachetPlaque,
  cachetCarte,
  cachetChevalet,
  horizon,
};
