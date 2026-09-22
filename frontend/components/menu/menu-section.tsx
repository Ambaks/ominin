import { Reveal } from "@/components/portal/reveal";
import type { MenuCategory } from "@/lib/menu-data";
import { DishCard } from "./dish-card";

export function MenuSection({ category }: { category: MenuCategory }) {
  return (
    /* Révélé à l'entrée dans le viewport, et non au chargement : une carte
       fait neuf sections sur plus de 13 000 px, dont huit finiraient leur
       animation hors écran. */
    <Reveal>
      <section id={category.id} className="scroll-mt-28 lg:scroll-mt-32">
        {/* Titre et accroche forment un seul bloc : sans cela, l'écart entre
            le titre et la première carte change du simple au triple selon que
            la catégorie porte une accroche ou non. */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-baseline gap-4">
            <h2 className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
              {category.name}
            </h2>
            <span
              aria-hidden
              className="category-rule ember-gradient h-px flex-1 opacity-40"
            />
          </div>
          {category.tagline && (
            <p className="mt-2 text-sm italic text-muted lg:text-base">
              {category.tagline}
            </p>
          )}
        </div>
        <div
          className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:gap-5"
        >
          {category.items.map((item) => (
            <DishCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}
