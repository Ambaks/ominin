"use client";

import { useEffect, useRef, useState } from "react";
import { CLUB_TIMING } from "@/components/club/timing";
import { formatCents } from "@/lib/club/format";

/* Un montant qui défile jusqu'à sa nouvelle valeur, à l'euro près en route. */
export function RollingAmount({ cents, className = "" }: { cents: number; className?: string }) {
  const [shown, setShown] = useState(cents);
  const current = useRef(cents);

  useEffect(() => {
    const from = current.current;
    if (from === cents) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const progress = reduced ? 1 : Math.min((now - start) / CLUB_TIMING.roll, 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = progress === 1 ? cents : Math.round((from + (cents - from) * eased) / 100) * 100;
      current.current = value;
      setShown(value);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [cents]);

  return (
    <span className={`club-nums ${className}`}>
      <span aria-hidden>{formatCents(shown)}</span>
      <span className="sr-only">{formatCents(cents)}</span>
    </span>
  );
}
