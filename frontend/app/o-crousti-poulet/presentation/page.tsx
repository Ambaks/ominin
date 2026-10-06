import type { Metadata } from "next";
import { oCroustiPouletBrand } from "@/components/pitch/brands/o-crousti-poulet";
import { Deck } from "@/components/pitch/slides";
import { oCroustiPoulet } from "@/lib/pitch/o-crousti-poulet";
import "@/components/pitch/deck.css";

export const metadata: Metadata = {
  title: "Présentation — O’Crousti Poulet × Ominin",
};

/** La présentation au siège : à l'écran pour la relire, en PDF pour l'envoyer. */
export default function PresentationPage() {
  return <Deck pitch={oCroustiPoulet} brand={oCroustiPouletBrand} />;
}
