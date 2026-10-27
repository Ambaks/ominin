"use client";

import { useEffect, useRef } from "react";

/*
 * Titre du relevé de signature. Il prend le focus en arrivant : juste après la
 * signature, le formulaire qui l'avait disparaît, la page restait au milieu du
 * contrat et un lecteur d'écran n'annonçait rien.
 */
export function SignedHeading({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Défilement explicite : focus() seul ne fait pas défiler une fenêtre
    // qui n'a pas le focus.
    window.scrollTo({ top: 0 });
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className="mt-2 scroll-mt-24 font-display text-2xl font-medium tracking-tight outline-none"
    >
      {children}
    </h1>
  );
}
