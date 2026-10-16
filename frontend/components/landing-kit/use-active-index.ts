"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Index de l'élément dont le centre est le plus près de la ligne de lecture,
 * recalculé à chaque défilement (un saut d'ancre compris). La ligne est le
 * milieu de l'écran ; quand `cover` est visible (un visuel collé en haut,
 * sous lg), c'est le milieu de la zone libre sous lui, pour que le visuel
 * change avant que la carte ne le recouvre.
 */
export function useActiveIndex<T extends HTMLElement>() {
  const [active, setActive] = useState(0);
  const items = useRef<(T | null)[]>([]);
  const cover = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const box = cover.current?.getBoundingClientRect();
      const line = box?.height ? (box.bottom + window.innerHeight) / 2 : window.innerHeight / 2;
      let best = 0;
      let bestDistance = Infinity;
      items.current.forEach((node, i) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - line);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** Ref à poser sur l'élément d'index `i`. */
  const itemRef = (i: number) => (node: T | null) => {
    items.current[i] = node;
  };

  return { active, itemRef, cover };
}
