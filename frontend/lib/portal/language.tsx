"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  type Language,
  type Localized,
} from "@/lib/portal-data";

/*
 * Langue du portail. Même approche que le thème (next-themes) : un choix
 * persisté dans localStorage, pas dans l'URL — le portail est une page unique
 * et le référencement se joue en français, la langue par défaut.
 *
 * localStorage est une source de vérité extérieure à React : on la lit via
 * useSyncExternalStore, qui rend la langue par défaut au serveur puis la
 * valeur stockée après hydratation, sans divergence de rendu. Bénéfice
 * secondaire, l'écoute de l'évènement « storage » garde deux onglets d'accord.
 */
const STORAGE_KEY = "ominin-portal-language";

const isLanguage = (value: string | null): value is Language =>
  value !== null && (LANGUAGES as string[]).includes(value);

/** Abonnés au changement de langue déclenché depuis cet onglet. */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readLanguage(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

/* Le serveur ne connaît pas le choix du visiteur : il rend toujours le
   français. Un visiteur ayant choisi l'anglais le voit apparaître à
   l'hydratation. */
const serverLanguage = (): Language => DEFAULT_LANGUAGE;

type LanguageValue = {
  language: Language;
  setLanguage: (next: Language) => void;
  /** Résout une chaîne traduite dans la langue courante. */
  t: (value: Localized) => string;
};

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    readLanguage,
    serverLanguage
  );

  // L'attribut lang du document doit suivre : il pilote la prononciation des
  // lecteurs d'écran et la coupure de mots.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    // « storage » ne se déclenche que dans les autres onglets : on notifie
    // celui-ci à la main.
    for (const onChange of listeners) onChange();
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({ language, setLanguage, t: (v) => v[language] }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage utilisé hors LanguageProvider");
  return value;
}
