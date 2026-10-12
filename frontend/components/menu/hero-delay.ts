import type { CSSProperties } from "react";

/**
 * Délai d'entrée d'un élément .hero-entrance, passé par variable : posé en
 * animation-delay dans le style en ligne, il l'emportait sur la feuille, et
 * un thème ne pouvait plus régler la chorégraphie de son héros.
 */
export const heroDelay = (delay: string) =>
  ({ "--hero-delay": delay }) as CSSProperties;
