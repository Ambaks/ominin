"use client";

import { useLanguage } from "@/lib/portal/language";
import { languageToggle } from "@/lib/portal-data";

/*
 * Bascule FR/EN, jumelle du sélecteur de thème : même gabarit, même
 * traitement de bordure. Le bouton affiche la langue vers laquelle il envoie,
 * pas la langue courante — c'est l'action, pas l'état.
 */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const target = language === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      title={t(languageToggle.label)}
      aria-label={t(languageToggle.label)}
      onClick={() => setLanguage(target)}
      className={`rounded-full border border-hairline px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:border-ember-2/40 hover:text-foreground ${className}`}
    >
      {target}
    </button>
  );
}
