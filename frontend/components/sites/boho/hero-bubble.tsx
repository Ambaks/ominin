"use client";

import { useEffect, useRef } from "react";

/*
 * Le canevas de la bulle, posé sur le haut de page déjà complet : la photo et
 * le titre du DOM tiennent tant que la scène ne répond pas, et restent si elle
 * ne répond jamais. Le titre ne s'efface qu'une fois redessiné dans la scène.
 */
export function HeroBubble() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = canvas?.closest<HTMLElement>(".bo-hero");
    const title = hero?.querySelector<HTMLElement>(".bo-hero-title");
    const photo = hero?.querySelector<HTMLImageElement>(".bo-hero-photo img");
    if (!canvas || !hero || !title || !photo) return;

    let stop: (() => void) | null = null;
    let cancelled = false;
    const off = () => {
      delete hero.dataset.bubble;
    };

    void import("@/components/sites/boho/bubble-scene")
      .then(({ startBubbleScene }) =>
        cancelled
          ? null
          : startBubbleScene({
              canvas,
              hero,
              title,
              photo,
              still: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
              onLost: off,
            })
      )
      .then((stopScene) => {
        if (!stopScene) return;
        if (cancelled) {
          stopScene();
          return;
        }
        stop = stopScene;
        hero.dataset.bubble = "on";
      })
      .catch(off);

    return () => {
      cancelled = true;
      stop?.();
      off();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="bo-hero-canvas" />;
}
