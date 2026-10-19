"use client";

import { useEffect, useRef, useState } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatCents } from "@/lib/club/format";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * Un montant qui défile jusqu'à sa nouvelle valeur, au centime (les
 * centimes ne s'affichent en route que si la valeur d'arrivée en a : pas de
 * « 262 » qui saute à « 262,50 »). instant : la valeur s'écrit tout de suite
 * (un curseur qu'on fait glisser). Écrit directement dans le texte à chaque
 * image : React ne rend qu'une fois.
 */
export function RollingAmount({
  cents,
  className = "",
  instant = false,
}: {
  cents: number;
  className?: string;
  instant?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // Le texte rendu ne change jamais : React n'y touche plus, l'effet l'écrit.
  const [initial] = useState(cents);
  const current = useRef(cents);

  useEffect(() => {
    const node = ref.current;
    const from = current.current;
    if (!node || from === cents) return;
    if (instant || prefersReducedMotion()) {
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
      const raw = Math.round(from + (cents - from) * eased);
      // En route, à l'euro si l'arrivée est ronde ; au centime sinon.
      const value = progress === 1 ? cents : cents % 100 === 0 ? Math.round(raw / 100) * 100 : raw;
      current.current = value;
      node.textContent = formatCents(value);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents, instant]);

  return (
    <span className={`club-mono ${className}`}>
      <span ref={ref} aria-hidden>
        {formatCents(initial)}
      </span>
      <span className="sr-only">{formatCents(cents)}</span>
    </span>
  );
}
