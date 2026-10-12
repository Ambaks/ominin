import type { Metadata } from "next";
import { bigSmashBrand } from "@/components/pitch/brands/big-smash";
import { Deck } from "@/components/pitch/slides";
import { bigSmash } from "@/lib/pitch/big-smash";
import "@/components/pitch/deck.css";

export const metadata: Metadata = {
  title: "Présentation — Big Smash × Ominin",
};

/** La présentation au siège : à l'écran pour la relire, en PDF pour l'envoyer. */
export default function PresentationPage() {
  return <Deck pitch={bigSmash} brand={bigSmashBrand} />;
}
