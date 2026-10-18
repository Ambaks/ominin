"use client";

import { useEffect, useRef } from "react";
import type { Sky } from "@/components/menu/etoile/sky";

/*
 * Le ciel des pages d'un club : celui de la carte de L'Étoile (sky.ts), un
 * canevas WebGL fixé derrière la page, chargé après elle — three.js ne pèse
 * pas sur le premier affichage. Sans WebGL, en économie de données ou sur
 * un appareil modeste, la nébuleuse CSS de .club-sky reste seule. Les
 * sections [data-chapter] font tourner le ciel au défilement. Posé par le
 * layout : il survit d'une page du club à l'autre.
 *
 * Une page le fige le temps qu'elle demande l'attention (feuille de table,
 * paiement, billet) : useSkyPause.
 */

/* En dessous (Go de mémoire, cœurs), le ciel WebGL n'est pas lancé. */
const LOW_END = { memoryGb: 2, cores: 2 } as const;

const pausers = new Set<symbol>();
let onPausersChange: (() => void) | null = null;

export function useSkyPause(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const token = Symbol("pause");
    pausers.add(token);
    onPausersChange?.();
    return () => {
      pausers.delete(token);
      onPausersChange?.();
    };
  }, [active]);
}

function lowEnd(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  return (
    Boolean(nav.connection?.saveData) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= LOW_END.memoryGb) ||
    nav.hardwareConcurrency <= LOW_END.cores
  );
}

export function ClubSky() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sky = useRef<Sky | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || lowEnd()) return;
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

    // Figé seulement une fois la Voie lactée apparue : jamais un ciel à moitié peint.
    let settledAt = Infinity;
    let wait = 0;
    const apply = () => {
      clearTimeout(wait);
      const pause = pausers.size > 0;
      const left = settledAt - performance.now();
      if (pause && left > 0) {
        if (Number.isFinite(left)) wait = window.setTimeout(apply, left);
        return;
      }
      sky.current?.setPaused(pause);
    };
    onPausersChange = apply;
    let fadeMs = 0;
    const shown = new MutationObserver(() => {
      if (!host.querySelector("canvas[data-on]")) return;
      shown.disconnect();
      settledAt = performance.now() + fadeMs;
      apply();
    });
    import("@/components/menu/etoile/sky")
      .then(({ createSky, SKY }) => {
        if (disposed) return;
        fadeMs = SKY.dust.fadeMs;
        sky.current = createSky(host, { reducedMotion });
        shown.observe(host, { subtree: true, attributes: true, attributeFilter: ["data-on"] });
        measure();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      onPausersChange = null;
      clearTimeout(wait);
      shown.disconnect();
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
