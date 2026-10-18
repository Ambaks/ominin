"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Le temps qui reste pour régler une table tenue, en anneau qui se vide.
 * Compté depuis l'horloge de la page (performance.now) et non celle de
 * l'appareil : une montre en avance ou en retard ne change rien.
 */
const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SECOND = 1000;
/* Sous ce seuil, l'anneau passe à l'urgence et le lecteur d'écran est prévenu. */
const LAST_MINUTE = 60 * SECOND;

export function HoldCountdown({
  remainingMs,
  totalMs,
  onExpire,
}: {
  remainingMs: number;
  totalMs: number;
  onExpire: () => void;
}) {
  const [left, setLeft] = useState(() => Math.max(0, remainingMs));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const deadline = performance.now() + remainingMs;
    let timer = 0;
    const tick = () => {
      const rest = Math.max(0, deadline - performance.now());
      setLeft(rest);
      if (rest === 0) {
        expire.current();
        return;
      }
      timer = window.setTimeout(tick, rest % SECOND || SECOND);
    };
    timer = window.setTimeout(tick, Math.max(0, remainingMs) % SECOND);
    return () => clearTimeout(timer);
  }, [remainingMs]);

  const seconds = Math.ceil(left / SECOND);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const urgent = left <= LAST_MINUTE;
  return (
    <div className="club-countdown" data-urgent={urgent || undefined}>
      <svg viewBox="0 0 56 56" aria-hidden>
        <circle className="club-countdown-track" cx="28" cy="28" r={RADIUS} />
        <circle
          className="club-countdown-ring"
          cx="28"
          cy="28"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - left / totalMs)}
        />
      </svg>
      <span className="club-countdown-time club-nums" role="timer" aria-label={`Temps restant : ${label}`}>
        {label}
      </span>
      <span className="sr-only" aria-live="polite">
        {urgent && left > 0 ? "Moins d'une minute pour régler la table." : ""}
      </span>
    </div>
  );
}
