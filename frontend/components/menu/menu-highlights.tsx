/**
 * Bandeau d'arguments sous le hero : ce qu'un flyer imprime en gros et qu'une
 * carte en ligne perd d'ordinaire — halal, seuil de livraison, promotion en
 * cours. Pleine largeur et en couleur d'accent, parce que c'est un argument de
 * vente, pas une mention légale. Rien à afficher ⇒ pas de bandeau.
 */
export function MenuHighlights({ highlights }: { highlights?: string[] }) {
  if (!highlights?.length) return null;

  return (
    // Un repère nommé : hors de tout repère, le ruban échappait à la
    // navigation par régions des lecteurs d'écran.
    <aside
      aria-label="À savoir"
      className="menu-highlights border-y-2 border-ember-1 bg-ember-3"
    >
      <ul className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-1.5 px-5 py-3.5 text-center lg:max-w-5xl lg:gap-x-14 lg:px-10 lg:py-4">
        {highlights.map((highlight) => (
          <li
            key={highlight}
            className="font-display text-[13px] uppercase leading-tight text-white sm:text-base lg:text-xl"
          >
            {highlight}
          </li>
        ))}
      </ul>
    </aside>
  );
}
