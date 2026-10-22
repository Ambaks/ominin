"use client";

import { useEffect, useState } from "react";

/**
 * Le temps jusqu'à minuit, « 13:42:07 », seconde après seconde. Seul ce
 * nombre se redessine, pas la feuille qui le porte.
 */
export function UntilTomorrow({ className }: { className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const left = Math.max(0, Math.floor((midnight.getTime() - now) / 1000));
  return (
    <span className={className}>
      {[left / 3600, (left / 60) % 60, left % 60]
        .map((part) => String(Math.floor(part)).padStart(2, "0"))
        .join(":")}
    </span>
  );
}
