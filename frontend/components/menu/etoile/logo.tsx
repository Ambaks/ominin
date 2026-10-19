import { useId } from "react";

/*
 * La marque du club fictif : une étoile à quatre branches effilées, une
 * seconde plus courte en diagonale, en argent poli.
 */
const STAR = "M50 0C51.6 30 56 44.4 100 50C56 55.6 51.6 70 50 100C48.4 70 44 55.6 0 50C44 44.4 48.4 30 50 0Z";
const GLINT = "M50 26C51 42 54 46 74 50C54 54 51 58 50 74C49 58 46 54 26 50C46 46 49 42 50 26Z";

export function EtoileMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c9cdd4" />
          <stop offset="1" stopColor="#7d828b" />
        </linearGradient>
      </defs>
      <path d={STAR} fill={`url(#${id})`} />
      <path d={GLINT} fill={`url(#${id})`} opacity="0.6" transform="rotate(45 50 50)" />
    </svg>
  );
}
