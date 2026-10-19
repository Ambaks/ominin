import type { Metadata } from "next";
import { CklDeck } from "@/components/pitch/groupe-ckl/deck";
import "@/components/pitch/deck.css";
import "@/components/pitch/groupe-ckl/deck.css";

export const metadata: Metadata = {
  title: "Présentation — Groupe CKL × Ominin",
};

/** La présentation au Groupe CKL : à l'écran pour la lire ou la présenter, en PDF pour la laisser. */
export default function PresentationPage() {
  return <CklDeck />;
}
