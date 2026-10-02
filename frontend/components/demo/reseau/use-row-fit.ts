"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Nombre de lignes entières (`[data-row]`) que tient un conteneur à hauteur
 * contrainte — celui dont le débordement n'est pas visible —, son en-tête de
 * tableau déduit ; null quand il suit son contenu. Une ligne coupée au bord
 * du cadre passait pour un bug. Une ligne mesure son contenu
 * (`[data-row-content]`), plus les marges et bordures qui l'entourent : étirée
 * pour remplir le cadre, elle ne compte pas plus haut qu'elle n'est.
 */
export function useRowFit(ref: RefObject<HTMLElement | null>): number | null {
  const [fit, setFit] = useState<number | null>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      // Les lignes visibles seulement : une variante masquée (display: none)
      // mesure zéro.
      const shown = (selector: string) =>
        [...box.querySelectorAll<HTMLElement>(selector)].find((node) => node.getBoundingClientRect().height > 0);
      const row = shown("[data-row]");
      if (!row || getComputedStyle(box).overflowY === "visible") return setFit(null);
      const head = shown("thead")?.getBoundingClientRect().height ?? 0;
      const content = row.querySelector<HTMLElement>("[data-row-content]") ?? row;
      let height = content.getBoundingClientRect().height;
      for (let node = content.parentElement; node && content !== row; node = node.parentElement) {
        const style = getComputedStyle(node);
        height +=
          parseFloat(style.paddingTop) +
          parseFloat(style.paddingBottom) +
          parseFloat(style.borderTopWidth) +
          parseFloat(style.borderBottomWidth);
        if (node === row) break;
      }
      setFit(Math.max(1, Math.floor((box.clientHeight - head) / height)));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [ref]);
  return fit;
}
