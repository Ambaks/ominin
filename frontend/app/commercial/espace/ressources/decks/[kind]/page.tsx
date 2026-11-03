import Image from "next/image";
import { notFound } from "next/navigation";
import { DeckSlide } from "@/components/commercial/deck/slides";
import { DeckViewer } from "@/components/commercial/deck/viewer";
import { deckFor } from "@/lib/commercial/decks";
import { PLAQUETTE_PAGE_SIZE, plaquettePages } from "@/lib/commercial/demos";
import { requireRunningContract } from "@/lib/commercial/session";

/* Le deck ou la plaquette d'un type d'établissement, montré au gérant pendant la visite ; gardé hors ligne par public/commercial-sw.js. */
export default async function DeckPage({ params }: PageProps<"/commercial/espace/ressources/decks/[kind]">) {
  await requireRunningContract();
  const deck = deckFor((await params).kind);
  if (!deck) notFound();
  const plaquette = plaquettePages(deck.kind);
  return (
    <DeckViewer
      title={deck.label}
      slides={
        plaquette
          ? plaquette.map((src, i) => (
              <Image
                key={src}
                src={src}
                alt={`Plaquette ${deck.label}, page ${i + 1}`}
                {...PLAQUETTE_PAGE_SIZE}
                unoptimized
                priority
                className="mx-auto h-auto w-full max-w-2xl rounded-lg"
              />
            ))
          : deck.slides.map((slide, i) => <DeckSlide key={i} slide={slide} />)
      }
    />
  );
}
