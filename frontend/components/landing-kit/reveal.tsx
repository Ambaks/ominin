"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Apparition au défilement (.kit-reveal) : l'élément se marque
 * data-shown la première fois qu'il entre à l'écran, puis n'est plus suivi.
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
  as?: "div" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.shown = "";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -4% 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`kit-reveal ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
