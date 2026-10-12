"use client";

import { useEffect, useRef, useState } from "react";
import type { TickerItem } from "@/lib/menu-data";

/** L'allure du bandeau du site de Baï-Kō, mesurée : environ 45 px par seconde. */
const PIXELS_PER_SECOND = 45;

/**
 * Le bandeau défilant des annonces, repris du site de l'établissement :
 * offres, réservation, livraison. Deux copies côte à côte défilent d'une
 * largeur. Le survol l'arrête, le bouton aussi (un mouvement de plus de cinq
 * secondes doit pouvoir s'arrêter) ; sans mouvement (prefers-reduced-motion),
 * les annonces se posent à plat (globals.css). Un lecteur d'écran lit la
 * liste une fois, pas sa copie. La durée d'un tour suit la largeur d'une
 * copie (au moins l'écran) : la même allure du téléphone à l'écran large.
 */
export function MenuTicker({ items }: { items?: TickerItem[] }) {
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => setDuration(list.offsetWidth / PIXELS_PER_SECOND));
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  if (!items?.length) return null;

  const list = (copy: boolean) => (
    <ul
      ref={copy ? undefined : listRef}
      aria-hidden={copy || undefined}
      className="menu-ticker-list flex shrink-0 items-center"
    >
      {items.map((item) => (
        <li
          key={item.text}
          data-tone={item.tone}
          className="menu-ticker-item whitespace-nowrap px-6 text-[11px] font-medium uppercase tracking-[0.14em] lg:px-7 lg:text-xs"
        >
          {item.text}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      aria-label="Annonces"
      data-paused={paused || undefined}
      className="menu-ticker relative flex min-h-11 items-center overflow-hidden border-b border-hairline bg-surface"
    >
      <div
        className="menu-ticker-track flex w-max py-2.5"
        // Sans durée mesurée (avant l'hydratation), le bandeau attend, immobile.
        style={duration === null ? undefined : ({ "--ticker-duration": `${duration}s` } as React.CSSProperties)}
      >
        {list(false)}
        {list(true)}
      </div>
      <button
        type="button"
        aria-pressed={paused}
        aria-label="Arrêter le défilement des annonces"
        onClick={() => setPaused((value) => !value)}
        className="menu-ticker-pause absolute inset-y-0 right-0 flex min-h-11 min-w-11 items-center justify-center bg-linear-to-l from-surface from-60% to-transparent pl-3 text-muted transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
          {paused ? <path d="M4 2.5v11l9-5.5z" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />}
        </svg>
      </button>
    </aside>
  );
}
