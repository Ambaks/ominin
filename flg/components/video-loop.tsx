"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/*
 * Boucle de chantier muette : ne se charge et ne joue que visible à l'écran,
 * reste sur son image fixe quand le visiteur a demandé moins d'animations.
 */
export function VideoLoop({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const video = ref.current;
    if (!video || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-label={label}
      className={`object-cover ${className ?? ""}`}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
