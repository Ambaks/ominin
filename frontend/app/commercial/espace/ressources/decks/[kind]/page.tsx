import { notFound } from "next/navigation";
import { DeckSlide } from "@/components/commercial/deck/slides";
import { DeckViewer } from "@/components/commercial/deck/viewer";
import { deckFor } from "@/lib/commercial/decks";
import { requireRunningContract } from "@/lib/commercial/session";
import { commercialPrefix } from "@/lib/site";

/* Le deck d'un type d'établissement, montré au gérant pendant la visite ; gardé hors ligne par public/commercial-sw.js. */
export default async function DeckPage({ params }: PageProps<"/commercial/espace/ressources/decks/[kind]">) {
  await requireRunningContract();
  const deck = deckFor((await params).kind);
  if (!deck) notFound();
  return (
    <DeckViewer
      title={deck.label}
      backHref={`${commercialPrefix}/espace/ressources`}
      slides={deck.slides.map((slide, i) => (
        <DeckSlide key={i} slide={slide} />
      ))}
    />
  );
}
