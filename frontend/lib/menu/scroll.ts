/** Défilement doux, sauf si le client a demandé moins de mouvement. */
export const scrollBehavior = (): ScrollBehavior =>
  matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
