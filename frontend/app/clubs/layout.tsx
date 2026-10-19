import type { Viewport } from "next";
import { ClubSky } from "@/components/club/club-sky";
import { clubFonts } from "@/lib/club/fonts";
import "@/components/club/tokens.css";
import "@/components/club/club.css";

/*
 * Ominin Club côté client (club.ominin.com/<slug>) : la page du club, ses
 * soirées, leurs offres de tables et les réservations. Un ciel commun, visible
 * sur l'accueil et le passe, effacé sur les écrans de choix et de paiement
 * (.club-calm).
 */
export const viewport: Viewport = {
  themeColor: "#070a1c",
  colorScheme: "dark",
};

export default function ClubsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`club ${clubFonts}`}>
      <ClubSky />
      {children}
    </div>
  );
}
