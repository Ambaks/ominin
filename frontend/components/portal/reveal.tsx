"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Révélation au scroll : le wrapper porte .reveal (masqué tant que
 * l'IntersectionObserver n'a pas vu l'élément entrer dans le viewport), puis
 * .is-visible déclenche la montée en fondu définie dans globals.css. Le délai
 * décale les éléments d'une même rangée. Wrapper séparé exprès : les cartes
 * animent déjà leur transform au survol, cumuler les deux sur le même nœud
 * ferait sauter l'un ou l'autre.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Mouvement réduit : globals.css rend .reveal visible et inerte quoi
    // qu'il arrive — inutile d'observer.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Déclenche un peu avant que l'élément n'affleure le bas du viewport.
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
