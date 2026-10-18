"use client";

import { useEffect, useRef, useState } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatCents } from "@/lib/club/format";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * Un montant qui défile jusqu'à sa nouvelle valeur, à l'euro près en route.
 * Écrit directement dans le texte à chaque image : React ne rend qu'une fois.
 */
export function RollingAmount({ cents, className = "" }: { cents: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Le texte rendu ne change jamais : React n'y touche plus, l'effet l'écrit.
  const [initial] = useState(cents);
  const current = useRef(cents);

  useEffect(() => {
    const node = ref.current;
    const from = current.current;
    if (!node || from === cents) return;
    if (prefersReducedMotion()) {
      current.current = cents;
      node.textContent = formatCents(cents);
      return;
    }
    // L'origine est la première image, sur la même horloge que les suivantes.
    let start: number | null = null;
    let raf = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(Math.max((now - start) / CLUB_TIMING.roll, 0), 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = progress === 1 ? cents : Math.round((from + (cents - from) * eased) / 100) * 100;
      current.current = value;
      node.textContent = formatCents(value);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents]);

  return (
    <span className={`club-mono ${className}`}>
      <span ref={ref} aria-hidden>
        {formatCents(initial)}
      </span>
      <span className="sr-only">{formatCents(cents)}</span>
    </span>
  );
}
