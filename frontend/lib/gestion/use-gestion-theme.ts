"use client";

import { useSyncExternalStore } from "react";
import { GESTION_THEME_STORAGE_KEY, GESTION_THEMES, type GestionTheme } from "./constants";

const DEFAULT_THEME = GESTION_THEMES[0].value;
const listeners = new Set<() => void>();
/** Le choix de la session, là où le navigateur refuse le stockage. */
let sessionTheme: GestionTheme = DEFAULT_THEME;

function readTheme(): GestionTheme {
  try {
    const stored = window.localStorage.getItem(GESTION_THEME_STORAGE_KEY);
    return GESTION_THEMES.find((theme) => theme.value === stored)?.value ?? sessionTheme;
  } catch {
    return sessionTheme;
  }
}

function setTheme(theme: GestionTheme): void {
  sessionTheme = theme;
  try {
    window.localStorage.setItem(GESTION_THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage refusé : le thème tient jusqu'à la fin de la session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Thème de l'espace sur cet appareil ; le défaut ne pose aucun attribut. */
export function useGestionTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
  return { theme, themeAttribute: theme === DEFAULT_THEME ? undefined : theme, setTheme };
}
