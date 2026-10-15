"use client";

import { useEffect } from "react";

/*
 * La pastille allumée glisse d'une catégorie à l'autre au lieu de sauter :
 * une seule pastille, peinte par le rail (commander.css), qu'on pose ici sur
 * la catégorie que la barre partagée vient d'allumer. Tant qu'elle n'est pas
 * posée (avant l'hydratation), chaque pastille garde son propre fond.
 */
export function CategoryGlide() {
  useEffect(() => {
    const rail = document.querySelector<HTMLElement>(".cy-order .category-rail");
    if (!rail) return;

    const place = () => {
      const pill = rail.querySelector<HTMLElement>("[aria-current]");
      const last = rail.lastElementChild as HTMLElement | null;
      if (!pill || !last) {
        rail.removeAttribute("data-glide");
        return;
      }
      // Jusqu'au bord de la dernière pastille, pas scrollWidth : la pastille
      // peinte compte dans le défilement du rail, elle l'aurait allongé.
      rail.style.setProperty("--cy-glide-span", `${last.offsetLeft + last.offsetWidth}px`);
      rail.style.setProperty("--cy-glide-x", `${pill.offsetLeft}px`);
      rail.style.setProperty("--cy-glide-y", `${pill.offsetTop}px`);
      rail.style.setProperty("--cy-glide-w", `${pill.offsetWidth}px`);
      rail.style.setProperty("--cy-glide-h", `${pill.offsetHeight}px`);
      rail.setAttribute("data-glide", "");
    };

    place();
    // La barre déplace aria-current ; une police chargée ou un écran tourné
    // change la taille des pastilles.
    const current = new MutationObserver(place);
    current.observe(rail, { subtree: true, attributeFilter: ["aria-current"] });
    const sizes = new ResizeObserver(place);
    sizes.observe(rail);
    for (const pill of rail.children) sizes.observe(pill);

    return () => {
      current.disconnect();
      sizes.disconnect();
      rail.removeAttribute("data-glide");
    };
  }, []);

  return null;
}
