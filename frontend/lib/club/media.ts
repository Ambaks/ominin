/*
 * Ce que l'appareil et le client demandent, lu au moment du geste : le
 * mouvement réduit, une souris (survol, curseur), la mise en page
 * téléphone (feuille basse), et les jetons de mouvement de tokens.css.
 */

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Sous la largeur du panneau collé : feuille basse et barre de prix. */
export const phoneLayout = () => matchMedia("(max-width: 1023px)").matches;

/** Un jeton de tokens.css (courbe, durée), lu sur la racine .club ; une seule source pour la CSS et le script. */
export function clubToken(name: `--c-${string}`): string {
  const root = document.querySelector(".club") ?? document.documentElement;
  return getComputedStyle(root).getPropertyValue(name).trim();
}
