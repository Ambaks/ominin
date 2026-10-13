"use client";

import type { MenuTarget } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Les catégories de la carte, leurs articles en dessous : ce qu'un tarif
 * planifié ou une fermeture vise. Cocher une catégorie la prend en entier,
 * articles à venir compris ; ses articles se grisent alors.
 */
export function MenuTargetPicker({
  categories,
  value,
  onChange,
  label,
}: {
  categories: MenuCategory[];
  value: MenuTarget[];
  onChange: (targets: MenuTarget[]) => void;
  label: string;
}) {
  const picked = (kind: MenuTarget["kind"], id: string) =>
    value.some((target) => target.kind === kind && target.id === id);
  const toggle = (target: MenuTarget) =>
    onChange(
      picked(target.kind, target.id)
        ? value.filter(
            (candidate) =>
              candidate.kind !== target.kind || candidate.id !== target.id
          )
        : [...value, target]
    );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label} <span className="text-ember-2">*</span>
      </span>
      <p className="text-xs text-faint">
        Cochez une catégorie entière et les articles que vous y ajouterez
        plus tard suivront d&apos;eux-mêmes.
      </p>
      <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
        {categories.map((category) => {
          const wholeCategory = picked("category", category.id);
          return (
            <div key={category.id} className="flex flex-col">
              <label className="flex min-h-10 items-center gap-2.5 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={wholeCategory}
                  onChange={() => toggle({ kind: "category", id: category.id })}
                  className="size-4 accent-ember-2"
                />
                {category.name}
              </label>
              <div className="flex flex-col pl-7">
                {category.items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex min-h-10 items-center gap-2.5 text-sm ${
                      wholeCategory ? "text-faint" : "text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={wholeCategory || picked("item", item.id)}
                      disabled={wholeCategory}
                      onChange={() => toggle({ kind: "item", id: item.id })}
                      className="size-4 accent-ember-2"
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
