"use client";

import { useCallback, useRef } from "react";
import { CLUB_MAGNET } from "@/components/club/timing";
import { finePointer, prefersReducedMotion } from "@/lib/club/media";

/*
 * Le bouton principal, au bureau, se laisse attirer par le curseur qui
 * l'approche (au plus CLUB_MAGNET.pull px, à moins de CLUB_MAGNET.reach px
 * de ses bords), puis revient en ressort (transition de .club-magnet).
 * Rien au toucher ni en mouvement réduit. Une ref de rappel : le bouton
 * peut apparaître après le premier rendu (une étape de la feuille).
 */
export function useMagnetic<T extends HTMLElement>() {
  const detach = useRef<(() => void) | null>(null);
  return useCallback((node: T | null) => {
    detach.current?.();
    detach.current = null;
    if (!node || !finePointer() || prefersReducedMotion()) return;
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
      node.style.translate = pull ? `${((dx / length) * pull).toFixed(2)}px ${((dy / length) * pull).toFixed(2)}px 0` : "";
    };
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (!raf) raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    detach.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      node.style.translate = "";
    };
  }, []);
}
