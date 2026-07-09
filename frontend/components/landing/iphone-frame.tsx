import type { ReactNode } from "react";

/*
 * Cadre iPhone 17 Pro Max façon simulateur Xcode : châssis titane, liseré
 * d'antenne noir, Dynamic Island et boutons latéraux (action + volume à
 * gauche, veille + Camera Control à droite). Encadre n'importe quel contenu
 * (ici l'iframe de démo) pour montrer le produit tel qu'un client le voit
 * réellement sur son téléphone. Purement décoratif — `aria-hidden` sur tout
 * le chrome, seul le contenu enfant reste dans l'arbre d'accessibilité.
 */
export function IphoneFrame({ children }: { children: ReactNode }) {
  const sideButton =
    "pointer-events-none absolute w-1 bg-linear-to-b from-zinc-600 to-zinc-800";

  return (
    <div className="relative w-96">
      {/* Boutons gauche : action, volume + / − */}
      <span className={`${sideButton} -left-1 top-28 h-8 rounded-l`} aria-hidden />
      <span className={`${sideButton} -left-1 top-44 h-14 rounded-l`} aria-hidden />
      <span className={`${sideButton} -left-1 top-64 h-14 rounded-l`} aria-hidden />
      {/* Boutons droite : veille, Camera Control */}
      <span className={`${sideButton} -right-1 top-52 h-20 rounded-r`} aria-hidden />
      <span className={`${sideButton} -right-1 top-80 h-10 rounded-r`} aria-hidden />

      {/* Châssis titane */}
      <div className="relative rounded-[3.9rem] bg-linear-to-br from-zinc-400 via-zinc-700 to-zinc-800 p-0.75 shadow-2xl shadow-black/60">
        {/* Liseré d'antenne / bord d'écran noir */}
        <div className="rounded-[3.7rem] bg-black p-1.5">
          {/* Écran */}
          <div className="relative overflow-hidden rounded-[3.3rem] bg-background pt-12 ring-1 ring-white/5">
            {children}

            {/* Dynamic Island */}
            <div
              className="pointer-events-none absolute left-1/2 top-3 flex h-8 min-w-32 -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3.5"
              aria-hidden
            >
              <span className="size-2.5 rounded-full bg-zinc-900 ring-1 ring-inset ring-zinc-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
