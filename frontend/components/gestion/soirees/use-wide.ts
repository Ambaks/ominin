"use client";

import { useSyncExternalStore } from "react";

/** Le seuil lg de Tailwind : au-delà, les écrans des soirées passent en grand. */
const WIDE = "(min-width: 64rem)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/** Écran large (lg) ; faux côté serveur, le téléphone d'abord. */
export const useWide = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
