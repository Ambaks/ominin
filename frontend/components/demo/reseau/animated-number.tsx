"use client";

import { useEffect, useRef, useState } from "react";

/** Un chiffre qui glisse vers sa nouvelle valeur ; sans mouvement, il saute. */
export function AnimatedNumber({
  value,
  format,
  duration,
}: {
  value: number;
  format: (value: number) => string;
  duration: number;
}) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = instant ? 1 : Math.min(1, (now - start) / duration);
      shownRef.current = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      setShown(shownRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return format(shown);
}
