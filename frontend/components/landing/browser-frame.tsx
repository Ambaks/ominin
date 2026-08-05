import type { ReactNode } from "react";

/*
 * Fenêtre de navigateur macOS façon maquette : feux tricolores, barre
 * d'adresse centrée. Encadre n'importe quel contenu (ici l'iframe de démo)
 * pour montrer le produit tel qu'un client le voit sur son écran — pendant
 * qu'IphoneFrame montre la vue téléphone. Purement décoratif : `aria-hidden`
 * sur le chrome, seul le contenu enfant reste dans l'arbre d'accessibilité.
 */
export function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-raised shadow-2xl shadow-black/40">
      <div
        className="relative flex h-10 items-center border-b border-hairline px-4"
        aria-hidden
      >
        {/* Feux macOS : fermer / réduire / agrandir */}
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-background px-4 py-1 text-xs text-muted">
          {url}
        </span>
      </div>
      <div className="overflow-hidden bg-background">{children}</div>
    </div>
  );
}
