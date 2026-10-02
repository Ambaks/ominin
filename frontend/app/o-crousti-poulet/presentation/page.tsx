import type { Metadata } from "next";
import { Deck } from "@/components/pitch/slides";
import "./deck.css";

export const metadata: Metadata = {
  title: "Présentation — O’Crousti Poulet × Ominin",
};

/** La présentation au siège : à l'écran pour la relire, en PDF pour l'envoyer. */
export default function PresentationPage() {
  return <Deck />;
}
