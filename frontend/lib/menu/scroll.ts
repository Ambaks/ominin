/** Le client a demandé moins de mouvement. */
export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Défilement doux, sauf si le client a demandé moins de mouvement. */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");
