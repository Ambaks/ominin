"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/*
 * Apparition au défilement (.club-reveal, data-shown la première fois que
 * l'élément entre à l'écran). Sans script, l'élément n'est jamais masqué
 * (club.css, @media (scripting: enabled)) ; sans IntersectionObserver, il
 * s'affiche tout de suite.
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
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.shown = "";
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.shown = "";
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
