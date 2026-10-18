"use client";

import { useEffect, useRef } from "react";
import { CLUB_MAGNET } from "@/components/club/timing";

/*
 * Le bouton principal, au bureau, se laisse attirer par le curseur qui
 * l'approche (au plus CLUB_MAGNET.pull px, à moins de CLUB_MAGNET.reach px
 * de ses bords), puis revient en ressort (transition de .club-magnet).
 * Rien au toucher ni en mouvement réduit.
 */
export function useMagnetic<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (
      !node ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let raf = 0;
    let pointer = { x: 0, y: 0 };
    const frame = () => {
      raf = 0;
      const box = node.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);
      const outside = Math.hypot(Math.max(Math.abs(dx) - box.width / 2, 0), Math.max(Math.abs(dy) - box.height / 2, 0));
      const pull = outside < CLUB_MAGNET.reach ? (1 - outside / CLUB_MAGNET.reach) * CLUB_MAGNET.pull : 0;
      const length = Math.hypot(dx, dy) || 1;
      node.style.translate = pull ? `${((dx / length) * pull).toFixed(2)}px ${((dy / length) * pull).toFixed(2)}px` : "";
    };
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      node.style.translate = "";
    };
  }, []);
  return ref;
}
