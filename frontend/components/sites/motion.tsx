"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/*
 * Révélations au défilement, en amélioration progressive : le HTML rendu par
 * le serveur montre tout. On ne cache ([data-motion] sur la racine) que ce
 * qui est encore sous la ligne de flottaison, et ce avant le premier rendu
 * peint : rien de visible ne clignote, et sans JavaScript rien n’est caché.
 * Commun aux sites de restaurants (Cyprien, Boho) : chacun nomme sa racine
 * et habille [data-reveal] dans sa feuille.
 */
export function SiteMotion({ root: rootSelector }: { root: string }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(rootSelector);
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

    // Le clavier peut atteindre un lien encore caché (au bas de l’écran, sous
    // la marge de l’observateur) : il se révèle, avec tout ce qui le contient.
    const hidden = "[data-reveal]:not(.is-in)";
    const revealFocused = (event: FocusEvent) => {
      let element = (event.target as Element).closest(hidden);
      while (element) {
        element.classList.add("is-in");
        observer.unobserve(element);
        element = element.parentElement?.closest(hidden) ?? null;
      }
    };
    root.addEventListener("focusin", revealFocused);

    return () => {
      observer.disconnect();
      root.removeEventListener("focusin", revealFocused);
    };
  }, [pathname, rootSelector]);

  return null;
}
