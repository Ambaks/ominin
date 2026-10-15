"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/*
 * Révélations au défilement, en amélioration progressive : le HTML rendu par
 * le serveur montre tout. On ne cache ([data-motion] sur la racine) que ce
 * qui est encore sous la ligne de flottaison, et ce avant le premier rendu
 * peint : rien de visible ne clignote, et sans JavaScript rien n’est caché.
 */
export function CyprienMotion() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".cy-site");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const fold = window.innerHeight;
    for (const element of root.querySelectorAll("[data-reveal]:not(.is-in)")) {
      const { top } = element.getBoundingClientRect();
      // Déjà à l’écran, ou dans le premier écran de la page (Next remet le
      // défilement en haut après une navigation) : visible tout de suite.
      if (top < fold || top + window.scrollY < fold) element.classList.add("is-in");
      else observer.observe(element);
    }
    root.dataset.motion = "on";

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
