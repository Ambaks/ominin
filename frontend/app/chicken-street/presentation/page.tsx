import type { Metadata } from "next";
import { chickenStreetBrand } from "@/components/pitch/brands/chicken-street";
import { Deck } from "@/components/pitch/slides";
import { chickenStreet } from "@/lib/pitch/chicken-street";
import "@/components/pitch/deck.css";

export const metadata: Metadata = {
  title: "Présentation — Chicken Street × Ominin",
};

/** La présentation au siège : à l'écran pour la relire, en PDF pour l'envoyer. */
export default function PresentationPage() {
  return <Deck pitch={chickenStreet} brand={chickenStreetBrand} />;
}
