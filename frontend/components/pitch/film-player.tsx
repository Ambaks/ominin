"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Le film en tête de page : l'affiche d'abord, la vidéo au toucher — rien ne
 * se télécharge avant, la page reste légère sur un téléphone. Sans source
 * (hébergement pas encore décidé), l'affiche seule.
 */
export function FilmPlayer({ src, poster, alt }: { src: string | null; poster: string; alt: string }) {
  const [playing, setPlaying] = useState(false);

  const frame = "relative aspect-video overflow-hidden rounded-2xl border border-(--ocp-line) bg-black md:rounded-3xl";

  if (src && playing) {
    return (
      <div className={frame}>
        <video src={src} poster={poster} controls autoPlay playsInline className="absolute inset-0 h-full w-full" />
      </div>
    );
  }

  const cover = <Image src={poster} alt={alt} fill priority sizes="(min-width: 1200px) 1152px, 100vw" className="object-cover" />;

  if (!src) return <div className={frame}>{cover}</div>;

  return (
    <button type="button" onClick={() => setPlaying(true)} className={`${frame} group block w-full text-left`}>
      {cover}
      <span className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
      <span className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-(--ocp-yellow) py-2 pl-2 pr-5 text-sm font-bold text-(--ocp-black) shadow-lg md:bottom-6 md:left-6 md:text-base">
        <span className="flex size-9 items-center justify-center rounded-full bg-(--ocp-black) text-(--ocp-yellow) md:size-10">
          <svg viewBox="0 0 24 24" aria-hidden className="ml-0.5 size-4 fill-current">
            <path d="M7 4.5v15l12.5-7.5z" />
          </svg>
        </span>
        Voir le film
      </span>
    </button>
  );
}
