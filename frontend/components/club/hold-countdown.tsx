"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * Le temps qui reste pour régler une table tenue, en anneau qui se vide.
 * Compté depuis l'horloge de la page (performance.now) et non celle de
 * l'appareil : une montre en avance ou en retard ne change rien. L'anneau
 * glisse d'un seul tenant (une animation linéaire jusqu'à zéro) ; en
 * mouvement réduit, il se pose seconde après seconde.
 */
const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SECOND = 1000;
/* Sous ce seuil, l'anneau passe à l'urgence et le lecteur d'écran est prévenu. */
const LAST_MINUTE = 60 * SECOND;

const offsetAt = (left: number, total: number) => CIRCUMFERENCE * (1 - left / total);

export function HoldCountdown({
  remainingMs,
  totalMs,
  onExpire,
  what = "la table",
}: {
  remainingMs: number;
  totalMs: number;
  onExpire: () => void;
  /** Ce qui est tenu, dit au lecteur d'écran à la dernière minute. */
  what?: string;
}) {
  const [left, setLeft] = useState(() => Math.max(0, remainingMs));
  const ringRef = useRef<SVGCircleElement>(null);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const ring = ringRef.current;
    const start = Math.max(0, remainingMs);
    const deadline = performance.now() + start;
    const reduced = prefersReducedMotion();
    const sweep =
      ring && !reduced && start > 0
        ? ring.animate(
            [{ strokeDashoffset: offsetAt(start, totalMs) }, { strokeDashoffset: CIRCUMFERENCE }],
            { duration: start, easing: "linear", fill: "forwards" }
          )
        : null;
    let timer = 0;
    const tick = () => {
      const rest = Math.max(0, deadline - performance.now());
      setLeft(rest);
      if (reduced) ring?.setAttribute("stroke-dashoffset", String(offsetAt(rest, totalMs)));
      if (rest === 0) {
        expire.current();
        return;
      }
      timer = window.setTimeout(tick, rest % SECOND || SECOND);
    };
    timer = window.setTimeout(tick, start % SECOND);
    return () => {
      clearTimeout(timer);
      sweep?.cancel();
    };
  }, [remainingMs, totalMs]);

  const seconds = Math.ceil(left / SECOND);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const urgent = left <= LAST_MINUTE;
  return (
    <div className="club-countdown" data-urgent={urgent || undefined}>
      <svg viewBox="0 0 56 56" aria-hidden>
        <circle className="club-countdown-track" cx="28" cy="28" r={RADIUS} />
        <circle
          ref={ringRef}
          className="club-countdown-ring"
          cx="28"
          cy="28"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offsetAt(Math.max(0, remainingMs), totalMs)}
        />
      </svg>
      <span className="club-countdown-time" role="timer" aria-label={`Temps restant : ${label}`}>
        {label}
      </span>
      <span className="sr-only" aria-live="polite">
        {urgent && left > 0 ? `Moins d'une minute pour régler ${what}.` : ""}
      </span>
    </div>
  );
}
