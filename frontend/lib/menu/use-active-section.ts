"use client";

import { useEffect, useState } from "react";

/** Lien vers une section de la carte, pour la barre du haut et le rail. */
export interface CategoryLink {
  id: string;
  name: string;
}

/** Ligne qu'un titre de section doit passer pour allumer sa catégorie, en part de la hauteur d'écran. */
const ACTIVE_LINE = 0.4;

/**
 * La catégorie allumée et la part de la carte déjà parcourue, relues à
 * chaque défilement : la dernière section dont le titre a passé la ligne des
 * 40 % de l'écran, la première tant qu'aucun ne l'a passée, la dernière en
 * bas de page. (Un observateur
 * d'intersection à bande haute laissait allumée la section du dessous quand
 * on remontait : deux sections y tenaient à la fois, celle du dessus n'y
 * rentrait jamais.) Partagé par la barre du haut et le rail de gauche.
 */
export function useActiveSection(categories: { id: string }[]) {
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
        const line = window.innerHeight * ACTIVE_LINE;
        let active = categories[0]?.id;
        for (const { id } of categories) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= line) active = id;
        }
        // En bas de page, les dernières sections courtes n'atteignent jamais
        // la ligne : la dernière s'allume.
        if (max > 0 && window.scrollY >= max - 1) active = categories.at(-1)?.id ?? active;
        setActiveId(active);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [categories]);

  return { activeId, progress };
}
