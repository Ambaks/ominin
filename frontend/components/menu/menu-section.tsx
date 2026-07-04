import type { MenuCategory } from "@/lib/menu-data";
import { DishCard } from "./dish-card";

export function MenuSection({
  category,
  index,
}: {
  category: MenuCategory;
  index: number;
}) {
  return (
    <section
      id={category.id}
      className="rise scroll-mt-24"
      style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}
    >
      <div className="mb-4 flex items-baseline gap-4">
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          {category.name}
        </h2>
        <span aria-hidden className="ember-gradient h-px flex-1 opacity-40" />
      </div>
      {category.tagline && (
        <p className="-mt-2 mb-4 text-sm italic text-faint">{category.tagline}</p>
      )}
      <div className="flex flex-col gap-3">
        {category.items.map((item) => (
          <DishCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
