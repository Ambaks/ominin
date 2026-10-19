"use client";

import { useEffect, useRef, useState } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatCents } from "@/lib/club/format";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * Un montant de bandeau : les euros en grand, les centimes en petit (un
 * chiffre de 10 330,13 € tient dans une case de téléphone), qui défile
 * jusqu'à sa nouvelle valeur comme les montants des pages du club.
 * Écrit directement dans le texte à chaque image : React ne rend qu'une fois.
 */

/** « 10 330,13 € » → [« 10 330 », « ,13 € »] ; sans centimes, [« 10 330 », « € »]. */
function split(cents: number): [string, string] {
  const text = formatCents(cents);
  const comma = text.indexOf(",");
  if (comma !== -1) return [text.slice(0, comma), text.slice(comma)];
  const euro = text.lastIndexOf("€");
  return [text.slice(0, euro).trimEnd(), ` €`];
}

export function Money({ cents }: { cents: number }) {
  const whole = useRef<HTMLSpanElement>(null);
  const part = useRef<HTMLSpanElement>(null);
  const [initial] = useState(() => split(cents));
  const current = useRef(cents);

  useEffect(() => {
    const from = current.current;
    if (from === cents || !whole.current || !part.current) return;
    const write = (value: number) => {
      const [big, small] = split(value);
      if (whole.current) whole.current.textContent = big;
      if (part.current) part.current.textContent = small;
    };
    if (prefersReducedMotion()) {
      current.current = cents;
      write(cents);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(Math.max((now - start) / CLUB_TIMING.roll, 0), 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = progress === 1 ? cents : Math.round(from + (cents - from) * eased);
      current.current = value;
      write(value);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents]);

  return (
    <span className="whitespace-nowrap tabular-nums">
      <span aria-hidden>
        <span ref={whole}>{initial[0]}</span>
        <span ref={part} className="text-[0.6em] font-medium text-muted">
          {initial[1]}
        </span>
      </span>
      <span className="sr-only">{formatCents(cents)}</span>
    </span>
  );
}
