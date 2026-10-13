import type { Metadata } from "next";
import { baiKoBrand } from "@/components/pitch/brands/bai-ko";
import { Deck } from "@/components/pitch/slides";
import { baiKo } from "@/lib/pitch/bai-ko";
import "@/components/pitch/deck.css";

export const metadata: Metadata = {
  title: "Présentation — Baï-Kō × Ominin",
};

/** La présentation à Baï-Kō : à l'écran pour la relire, en PDF pour la laisser. */
export default function PresentationPage() {
  return <Deck pitch={baiKo} brand={baiKoBrand} />;
}
