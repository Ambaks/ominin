/*
 * Le trou noir du panier : la simulation de disque d'accrétion de la NASA
 * (Goddard, J. Schnittman), animée en boucle et posée sur le compteur de la
 * barre de commande. Il grossit avec le panier ; chaque ajout emballe le
 * disque, qui revient à son régime. En mouvement réduit, ou si la vidéo ne
 * démarre pas (iOS en économie d'énergie), sa vignette reste.
 */

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const BLACK_HOLE = {
  src: "/l-etoile/stage/trou-noir.mp4",
  poster: "/l-etoile/stage/trou-noir.jpg",
  /* Échelle du disque : panier d'un article → panier plein. */
  scale: [0.8, 1],
  /* Nombre d'articles à partir duquel le trou noir a sa taille maximale. */
  fullAt: 10,
  pulseSeconds: 1.1,
  /* Vitesse de lecture au pic d'un ajout. */
  pulseRate: 4,
} as const;

export interface BlackHole {
  setCount(count: number): void;
  pulse(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export function createBlackHole(video: HTMLVideoElement, { reducedMotion }: { reducedMotion: boolean }): BlackHole {
  let paused = true;
  let pulse = 0;
  let raf = 0;
  let last = 0;

  const play = () => {
    if (reducedMotion || paused || document.hidden) video.pause();
    else video.play().catch(() => {});
  };
  const settle = (now: number) => {
    pulse = Math.max(0, pulse - (now - last) / 1000 / BLACK_HOLE.pulseSeconds);
    last = now;
    video.playbackRate = 1 + (BLACK_HOLE.pulseRate - 1) * pulse * pulse;
    if (pulse > 0) raf = requestAnimationFrame(settle);
  };
  document.addEventListener("visibilitychange", play);
  video.poster = BLACK_HOLE.poster;
  if (!reducedMotion) {
    video.preload = "auto";
    video.src = BLACK_HOLE.src;
  }

  return {
    setCount(count) {
      const k = Math.min(1, Math.log1p(Math.max(count - 1, 0)) / Math.log1p(BLACK_HOLE.fullAt - 1));
      video.style.setProperty("--et-fill", String(BLACK_HOLE.scale[0] + (BLACK_HOLE.scale[1] - BLACK_HOLE.scale[0]) * k));
    },
    pulse() {
      if (reducedMotion) return;
      pulse = 1;
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(settle);
    },
    setPaused(next) {
      paused = next;
      play();
    },
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", play);
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
}
