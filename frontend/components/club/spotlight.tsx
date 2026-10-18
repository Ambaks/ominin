"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { PLAN_POINTER } from "@/components/club/timing";

/*
 * Au bureau, une lumière dorée suit le curseur sur les cartes d'un groupe
 * (--mx, --my sur la carte survolée, rejoints en douceur une fois par
 * image). Rien au toucher ni en mouvement réduit.
 */
export function Spotlight({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (
      !root ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let raf = 0;
    let card: HTMLElement | null = null;
    const target = { x: 0, y: 0 };
    const light = { x: 0, y: 0 };
    const frame = () => {
      raf = 0;
      if (!card) return;
      light.x += (target.x - light.x) * PLAN_POINTER.lerp;
      light.y += (target.y - light.y) * PLAN_POINTER.lerp;
      card.style.setProperty("--mx", `${light.x}px`);
      card.style.setProperty("--my", `${light.y}px`);
      if (Math.hypot(target.x - light.x, target.y - light.y) > 0.5) raf = requestAnimationFrame(frame);
    };
    const onMove = (event: PointerEvent) => {
      const over = (event.target as Element).closest<HTMLElement>("[data-spotlight]");
      if (!over) return;
      const box = over.getBoundingClientRect();
      target.x = event.clientX - box.left;
      target.y = event.clientY - box.top;
      if (over !== card) {
        card = over;
        Object.assign(light, target);
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };
    root.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
