"use client";

import { useEffect, useRef } from "react";
import type { Sky } from "@/components/menu/etoile/sky";

/*
 * Le ciel des pages d'un club : celui de la carte de L'Étoile (sky.ts), un
 * canevas WebGL fixé derrière la page, chargé après elle — three.js ne pèse
 * pas sur le premier affichage. Sans WebGL, la nébuleuse CSS de .club-sky
 * reste seule. Les sections [data-chapter] font tourner le ciel au
 * défilement. Posé par le layout : il survit d'une page du club à l'autre.
 */
export function ClubSky() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sky = useRef<Sky | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    const measure = () => {
      const tops = [...document.querySelectorAll<HTMLElement>("[data-chapter]")].map(
        (section) => section.getBoundingClientRect().top + window.scrollY
      );
      sky.current?.setChapters(tops);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    import("@/components/menu/etoile/sky")
      .then(({ createSky }) => {
        if (disposed) return;
        sky.current = createSky(host, { reducedMotion });
        measure();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      observer.disconnect();
      sky.current?.dispose();
      sky.current = null;
    };
  }, []);

  return (
    <div className="club-sky" aria-hidden>
      <div ref={hostRef} className="club-sky-host" />
    </div>
  );
}
