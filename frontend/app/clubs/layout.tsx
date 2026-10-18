import type { Viewport } from "next";
import { ClubSky } from "@/components/club/club-sky";
import { clubFonts } from "@/lib/club/fonts";
import "@/components/club/club.css";

/*
 * Ominin Club côté client (club.ominin.com/<slug>) : la page du club, ses
 * soirées, le plan des tables et les réservations. Un ciel commun à toutes.
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
