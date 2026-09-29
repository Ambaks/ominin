import { typographie, type MenuCategory } from "@/lib/menu-data";
import { DishCard } from "./dish-card";

export function MenuSection({
  category,
  anchor,
  first,
  featureTop,
  tilesAsLines,
}: {
  category: MenuCategory;
  /** L'ancre de la section (categoryAnchors), celle de la barre des catégories. */
  anchor: string;
  /** Première section de la carte : sa première photo se charge d'emblée. */
  first?: boolean;
  /** Les plats « Top vente » passent en tête, en grand (Restaurant.featureTopSellers). */
  featureTop?: boolean;
  /** Vignettes lues en lignes, sans photo (Restaurant.tilesAsLines). */
  tilesAsLines?: boolean;
}) {
  const isTop = (item: MenuCategory["items"][number]) =>
    featureTop === true && (item.badges?.includes("top") ?? false);
  const items = featureTop
    ? [...category.items.filter(isTop), ...category.items.filter((item) => !isTop(item))]
    : category.items;
  /* Rien à lire sous les noms (des suppléments, des boissons) et une photo
     pour chacun : la section peut se montrer en vignettes plutôt qu'en
     grandes cartes presque vides — c'est au thème d'en décider
     (.dish-grid-tiles, globals.css). Une vignette sans photo s'étirait à la
     hauteur de ses voisines. */
  const tiles =
    category.items.length > 1 &&
    category.items.every(
      (item) => item.image && !item.description && !item.pairing
    );

  /* Pas de révélation au défilement : masquées jusqu'au chargement du
     JavaScript, les sections restaient blanches plusieurs secondes sur le
     téléphone d'un client au comptoir. Une carte se lit tout de suite. */
  return (
    /* L'espace sous la barre collante vient de scroll-padding-top
       (globals.css) ; il ne reste ici qu'un peu d'air. */
    <section id={anchor} className="scroll-mt-4 lg:scroll-mt-6">
      {/* Titre et accroche forment un seul bloc : sans cela, l'écart entre
          le titre et la première carte change du simple au triple selon que
          la catégorie porte une accroche ou non. */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        <div className="category-head flex items-baseline gap-4">
          {/* tabIndex -1 : le focus s'y pose après un saut (focusSectionHeading). */}
          <h2 tabIndex={-1} className="category-heading font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
            {typographie(category.name)}
          </h2>
          <span
            aria-hidden
            className="category-rule ember-gradient h-px flex-1 opacity-40"
          />
        </div>
        {category.tagline && (
          <p className="mt-2 text-sm italic text-muted lg:text-base">
            {typographie(category.tagline)}
          </p>
        )}
      </div>
      <div
        className={`dish-grid ${tiles ? "dish-grid-tiles" : ""} flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4 lg:gap-5`}
      >
        {items.map((item, i) => (
          <DishCard
            key={item.id}
            item={item}
            priority={first && i === 0}
            featured={isTop(item)}
            photo={!(tiles && tilesAsLines)}
            // Seul plat d'une section qui porte son nom (« Menu enfant ») :
            // le titre de la section suffit à l'œil.
            nameShown={
              items.length > 1 ||
              item.name.trim().toLowerCase() !== category.name.trim().toLowerCase()
            }
          />
        ))}
      </div>
    </section>
  );
}
