import type { ReactNode } from "react";
import type { MenuCategory } from "@/lib/menu-data";
import { CompactCard } from "./compact-card";
import { DishCard } from "./dish-card";

export function MenuSection({
  category,
  first,
  children,
}: {
  category: MenuCategory;
  /** Première section de la carte : sa première photo se charge d'emblée. */
  first?: boolean;
  /** Avant les articles : les formules de la happy hour. */
  children?: ReactNode;
}) {
  /* Rien à lire sous les noms (des suppléments, des boissons) et une photo
     pour chacun : la section peut se montrer en vignettes plutôt qu'en
     grandes cartes presque vides — c'est au thème d'en décider
     (.dish-grid-tiles, globals.css). Une vignette sans photo s'étirait à la
     hauteur de ses voisines. */
  const tiles =
    category.items.length > 1 &&
    category.items.every(
      (item) => item.image && !item.description && !item.tarifs && !item.pairing
    );

  /* Les fiches sans photo qui resteraient seules sur leur rangée quand les
     fiches à photo en prennent une entière (.theme-bai-ko) : la dernière
     d'une suite de fiches sans photo en nombre impair. */
  const lone = new Set<number>();
  let run = 0;
  category.items.forEach((item, i) => {
    run = item.image ? 0 : run + 1;
    const next = category.items[i + 1];
    if (!item.image && (!next || next.image) && run % 2 === 1) lone.add(i);
  });

  // La première photo de la section, pas son premier article : sans photo,
  // il laissait la vraie première image en différé.
  const firstPhoto = first ? category.items.findIndex((item) => item.image) : -1;

  /* Pas de révélation au défilement : masquées jusqu'au chargement du
     JavaScript, les sections restaient blanches plusieurs secondes sur le
     téléphone d'un client au comptoir. Une carte se lit tout de suite. */
  return (
    /* L'espace sous la barre collante vient de scroll-padding-top
       (globals.css) ; il ne reste ici qu'un peu d'air. */
    <section id={category.id} className="scroll-mt-4 lg:scroll-mt-6">
      {/* Titre et accroche forment un seul bloc : sans cela, l'écart entre
          le titre et la première carte change du simple au triple selon que
          la catégorie porte une accroche ou non. */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="category-head flex items-baseline gap-4">
          <h2 className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {category.kicker && (
              // L'espace sépare les deux noms pour un lecteur d'écran (« 안주 Anju »), pas seulement à l'œil.
              <span lang={category.kicker.lang} className="category-kicker mr-2 lg:mr-3">
                {`${category.kicker.text} `}
              </span>
            )}
            {category.name}
          </h2>
          <span
            aria-hidden
            className="category-rule ember-gradient h-px flex-1 opacity-40"
          />
        </div>
        {category.tagline && (
          <p className="category-tagline mt-2 text-sm italic text-muted lg:text-base">
            {category.tagline}
          </p>
        )}
      </div>
      {children && (
        <div className={category.items.length > 0 ? "mb-4 sm:mb-6 lg:mb-8" : undefined}>
          {children}
        </div>
      )}
      {category.items.length === 0 ? null : category.compact ? (
        <div className="dish-minis">
          {category.items.map((item) => (
            <CompactCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div
          className={`dish-grid ${tiles ? "dish-grid-tiles" : ""} flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:gap-5`}
        >
          {category.items.map((item, i) => (
            <DishCard key={item.id} item={item} priority={i === firstPhoto} span={lone.has(i)} />
          ))}
        </div>
      )}
    </section>
  );
}
