import type { ReactNode } from "react";
import { CategoryNav } from "@/components/menu/category-nav";
import { CategoryRail } from "@/components/menu/category-rail";
import { CategoryWheel } from "@/components/menu/category-wheel";
import type { CategoryLayout } from "@/lib/menu-data";
import type { CategoryLink } from "@/lib/menu/use-active-section";

/*
 * La carte et ses catégories, dans la mise en page choisie par
 * l'établissement : roue posée par-dessus la carte, qui ne lui prend aucune
 * place (par défaut), barre de pastilles collée en haut, ou rail d'icônes
 * collé à gauche, à côté des sections, qui pousse la carte à droite quand il
 * s'ouvre.
 */
export function MenuBody({
  layout = "wheel",
  categories,
  themeLocked,
  bottomPadding,
  children,
}: {
  layout?: CategoryLayout;
  categories: CategoryLink[];
  themeLocked: boolean;
  /** Marge sous la dernière section : plus haute là où la barre du panier est fixée. */
  bottomPadding: "pb-10" | "pb-28";
  children: ReactNode;
}) {
  const sections = `flex flex-col gap-16 pt-5 ${bottomPadding} sm:pt-10 lg:gap-24 lg:py-14`;

  if (layout === "rail") {
    return (
      <div className="mx-auto flex w-full max-w-2xl overflow-x-clip lg:max-w-5xl">
        <CategoryRail categories={categories} themeLocked={themeLocked} />
        {/* Colonne plus étroite que la carte en pleine largeur : les titres de
            section y descendent d'un cran pour tenir sur une ligne. */}
        <main
          className={`${sections} min-w-0 flex-1 pl-3 pr-5 transition-transform duration-300 ease-out motion-reduce:transition-none lg:pl-8 lg:pr-10 [&_.category-heading]:text-[26px] sm:[&_.category-heading]:text-4xl lg:[&_.category-heading]:text-5xl`}
        >
          {children}
        </main>
      </div>
    );
  }
  if (layout === "wheel") {
    return (
      <>
        <CategoryWheel categories={categories} />
        <main className={`${sections} mx-auto w-full max-w-2xl px-5 lg:max-w-5xl lg:px-10`}>
          {children}
        </main>
      </>
    );
  }
  return (
    <>
      <CategoryNav categories={categories} themeLocked={themeLocked} />
      <main className={`${sections} mx-auto w-full max-w-2xl px-5 lg:max-w-5xl lg:px-10`}>
        {children}
      </main>
    </>
  );
}
