"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/*
 * Apparition au défilement (.club-reveal). Rien n'est jamais masqué en
 * attendant : le rendu serveur est visible ; seul un élément encore sous
 * l'écran après hydratation se met en retrait (data-pending) jusqu'à y
 * entrer.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Décalage d'apparition (ms), pour échelonner une rangée. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Déjà à l'écran au montage, ou sans IntersectionObserver : rien à jouer. Sinon, l'élément (hors de
    // l'écran, donc sans que cela se voie) se met en retrait jusqu'à son entrée.
    if (typeof IntersectionObserver === "undefined" || node.getBoundingClientRect().top < window.innerHeight) return;
    node.dataset.pending = "";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        delete node.dataset.pending;
        observer.disconnect();
      },
      { rootMargin: "0px 0px 8% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`club-reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
