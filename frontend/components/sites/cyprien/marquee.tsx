"use client";

import { useState } from "react";
import { Grain } from "./stamp";

/*
 * Bandeau défilant des produits. Deux copies identiques font la boucle ; la
 * seconde est muette pour les lecteurs d’écran. Un bouton l’arrête (critère
 * 2.2.2 : tout ce qui bouge plus de cinq secondes doit pouvoir s’arrêter).
 */
export function Marquee({ items, label }: { items: readonly string[]; label: string }) {
  const [paused, setPaused] = useState(false);
  const group = (hidden: boolean) => (
    <ul className="cy-marquee-group" aria-hidden={hidden || undefined}>
      {items.map((item, index) => (
        <li key={item} className={index % 2 ? "cy-marquee-italic" : undefined}>
          {item}
          <Grain className="cy-marquee-grain" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="cy-marquee" aria-label={label} data-paused={paused || undefined}>
      <div className="cy-marquee-viewport">
        <div className="cy-marquee-track">
          {group(false)}
          {group(true)}
        </div>
      </div>
      <button
        type="button"
        className="cy-marquee-toggle"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        <span className="sr-only">Arrêter le défilement</span>
        <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          {paused ? <path d="M3 1.5v9l7-4.5z" fill="currentColor" /> : <path d="M3 2h2v8H3zM7 2h2v8H7z" fill="currentColor" />}
        </svg>
      </button>
    </section>
  );
}
