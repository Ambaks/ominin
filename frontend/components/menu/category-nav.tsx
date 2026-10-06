"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCart } from "@/lib/menu/cart";

interface CategoryLink {
  id: string;
  name: string;
}

/** Ligne qu'un titre de section doit passer pour allumer sa catégorie, en part de la hauteur d'écran. */
const ACTIVE_LINE = 0.4;

export function CategoryNav({
  categories,
  embedded,
  themeLocked,
}: {
  categories: CategoryLink[];
  embedded?: boolean;
  /** Palette d'établissement verrouillée (.theme-<slug>) : le basculement
      clair/sombre n'aurait aucun effet visible, on n'affiche pas le bouton. */
  themeLocked?: boolean;
}) {
  const { track } = useCart();
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  // La catégorie allumée et la jauge, relues à chaque défilement : la
  // dernière section dont le titre a passé la ligne des 40 % de l'écran, la
  // première tant qu'aucun ne l'a passée. (Un observateur d'intersection à
  // bande haute laissait allumée la section du dessous quand on remontait :
  // deux sections y tenaient à la fois, celle du dessus n'y rentrait jamais.)
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
        const line = window.innerHeight * ACTIVE_LINE;
        let active = categories[0]?.id;
        for (const { id } of categories) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= line) active = id;
        }
        setActiveId(active);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [categories]);

  // Keep the active pill visible in the horizontal rail.
  useEffect(() => {
    const rail = railRef.current;
    const pill = rail?.querySelector<HTMLElement>(`[data-category="${activeId}"]`);
    if (rail && pill) centerInRail(rail, pill);
  }, [activeId]);

  return (
    <nav aria-label="Catégories" className={`sticky z-20 border-b border-hairline bg-background ${embedded ? "top-12" : "top-0"}`}>
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 lg:max-w-5xl lg:gap-3 lg:px-10">
        {/* Le fondu des bords signale le défilement ; la marge intérieure qui
            l'égale garde la première et la dernière pastille hors du fondu
            tant que le rail est au repos. À droite, le rail ne déborde pas
            sous le bouton clair/sombre quand il est là. */}
        <div
          ref={railRef}
          className={`no-scrollbar ${themeLocked ? "-mx-3" : "-ml-3"} flex flex-1 gap-2 overflow-x-auto px-3 py-1.5 lg:gap-3 lg:py-4 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]`}
        >
          {categories.map(({ id, name }) => {
            const active = id === activeId;
            return (
              <a
                key={id}
                href={`#${id}`}
                data-category={id}
                aria-current={active ? "location" : undefined}
                onClick={() => track("categorie")}
                // Au clavier, la pastille atteinte vient au milieu du rail.
                onFocus={(event) => railRef.current && centerInRail(railRef.current, event.currentTarget)}
                className={`min-h-11 shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-all max-[359px]:px-3 max-[359px]:text-[13px] max-[339px]:px-2.5 lg:px-5 lg:py-3 lg:text-base ${
                  active
                    ? "ember-gradient text-background shadow-[0_0_18px_color-mix(in_srgb,var(--ember-2)_35%,transparent)]"
                    : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                }`}
              >
                {name}
              </a>
            );
          })}
        </div>
        {/* Au téléphone, il passe en pied de page (MenuFooter) : ici il
            rognait les pastilles. */}
        {!themeLocked && <ThemeToggle className="shrink-0 max-sm:hidden" />}
      </div>
      <div
        aria-hidden
        className="ember-gradient h-0.5 origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  );
}

/** Amène une pastille au milieu du rail, sans toucher au défilement de la page. */
function centerInRail(rail: HTMLElement, pill: HTMLElement) {
  /*
   * scrollIntoView ferait défiler TOUS les conteneurs défilables, document
   * compris : pendant un saut d'ancre, le scroll-spy s'allume à chaque
   * section traversée et chacun de ces appels annulait le saut en cours —
   * on n'arrivait jamais plus loin que la catégorie voisine. Ici on ne
   * touche qu'au défilement horizontal du rail.
   */
  const railBox = rail.getBoundingClientRect();
  const pillBox = pill.getBoundingClientRect();
  const offset =
    pillBox.left - railBox.left - (railBox.width - pillBox.width) / 2;
  rail.scrollTo({ left: rail.scrollLeft + offset, behavior: "smooth" });
}
