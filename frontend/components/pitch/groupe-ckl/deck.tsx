import type { CSSProperties } from "react";
import { deckScaleScript } from "@/components/pitch/slides";
import { deck, motion, pdfHref } from "@/lib/pitch/groupe-ckl";
import { Presenter } from "./presenter";
import { slides } from "./slides";

/*
 * La présentation au Groupe CKL : les diapositives à la suite (la page se
 * lit en défilant), un mode « Présenter » plein écran (presenter.tsx) et
 * l'export PDF (scripts/pitch-pdf.mjs, une page par .deck-frame).
 *
 * Deux scripts en ligne, exécutés pendant l'analyse du HTML, sans attendre
 * l'hydratation : le premier, avant les diapositives, allume le mouvement
 * (data-motion) si le visiteur ne l'a pas réduit — leurs éléments naissent
 * donc cachés, sans éclair ; le dernier pose data-seen sur chaque
 * diapositive qui arrive à l'écran (ses éléments entrent) et data-inview
 * tant qu'elle y est (les impulsions du schéma ne tournent qu'à l'écran).
 */

const motionScript = `matchMedia("(prefers-reduced-motion: no-preference)").matches && document.currentScript.parentElement.setAttribute("data-motion", "")`;

const revealScript = `(() => {
  const deck = document.currentScript.closest(".ckl-deck");
  const observer = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      target.toggleAttribute("data-inview", isIntersecting);
      if (isIntersecting && deck.dataset.mode !== "present") target.setAttribute("data-seen", "");
    }
  }, { threshold: ${motion.revealThreshold} });
  deck.querySelectorAll(".deck-frame").forEach((frame) => observer.observe(frame));
})()`;

/** Les durées du mouvement, en variables pour deck.css. */
const motionVars = {
  "--ckl-enter-ms": `${motion.enterMs}ms`,
  "--ckl-stagger-ms": `${motion.staggerMs}ms`,
  "--ckl-present-delay-ms": `${motion.presentDelayMs}ms`,
  "--ckl-slide-ms": `${motion.slideMs}ms`,
  "--ckl-slide-out-ms": `${motion.slideOutMs}ms`,
  "--ckl-slide-in-delay-ms": `${motion.slideInDelayMs}ms`,
  "--ckl-shift-px": `${motion.slideShiftPx}px`,
  "--ckl-race-ms": `${motion.raceMsPerSecond}ms`,
  "--ckl-pulse-ms": `${motion.pulseMs}ms`,
  "--ckl-pulse-pause-ms": `${motion.pulsePauseMs}ms`,
  "--ckl-pulse-cycles": motion.pulseCycles,
  "--ckl-spot-ms": `${motion.spotlightMs}ms`,
} as CSSProperties;

export function CklDeck() {
  return (
    // Les scripts posent des attributs sur la racine et les diapositives avant l'hydratation.
    <div className="ckl-deck" data-mode="scroll" style={motionVars} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      <Presenter ui={deck.ui} pdfHref={pdfHref} swipePx={motion.swipePx} />
      <main className="deck" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: deckScaleScript }} />
        {slides.map((SlideContent, i) => (
          <SlideContent key={i} index={i + 1} total={slides.length} />
        ))}
        <script dangerouslySetInnerHTML={{ __html: revealScript }} />
      </main>
    </div>
  );
}
