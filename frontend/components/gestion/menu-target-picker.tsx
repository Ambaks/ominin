"use client";

import { Checkbox } from "@/components/gestion/ui";
import type { MenuTarget } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Les catégories de la carte, leurs articles en dessous : ce qu'un tarif
 * planifié ou une fermeture vise. Cocher une catégorie la prend en entier,
 * articles à venir compris ; ses articles se grisent alors. Avec `formats`
 * (tarifs), un article à formats montre aussi les siens : la happy hour du
 * verre, pas de la bouteille.
 */
export function MenuTargetPicker({
  categories,
  value,
  onChange,
  label,
  formats = false,
}: {
  categories: MenuCategory[];
  value: MenuTarget[];
  onChange: (targets: MenuTarget[]) => void;
  label: string;
  formats?: boolean;
}) {
  const choiceOf = (target: MenuTarget) =>
    target.kind === "item" ? target.choiceId : undefined;
  const same = (a: MenuTarget, b: MenuTarget) =>
    a.kind === b.kind && a.id === b.id && choiceOf(a) === choiceOf(b);
  const picked = (target: MenuTarget) => value.some((candidate) => same(candidate, target));
  const toggle = (target: MenuTarget) =>
    onChange(
      picked(target)
        ? value.filter((candidate) => !same(candidate, target))
        : // L'article entier remplace ses formats cochés un à un.
          [
            ...value.filter(
              (candidate) =>
                choiceOf(target) !== undefined ||
                candidate.kind !== "item" ||
                candidate.id !== target.id
            ),
            target,
          ]
    );

  return (
    <fieldset className="g-field">
      <legend className="g-field-label">
        {label}
        <b aria-hidden>*</b>
      </legend>
      <p className="g-field-hint">
        Cochez une catégorie entière et les articles que vous y ajouterez plus tard suivront d&apos;eux-mêmes.
      </p>
      <div className="g-plate flex flex-col gap-1 p-3">
        {categories.map((category) => {
          const wholeCategory = picked({ kind: "category", id: category.id });
          return (
            <div key={category.id} className="flex flex-col">
              <Checkbox
                checked={wholeCategory}
                onChange={() => toggle({ kind: "category", id: category.id })}
                label={<span className="font-semibold">{category.name}</span>}
              />
              <div className="flex flex-col pl-7">
                {category.items.map((item) => {
                  const wholeItem = wholeCategory || picked({ kind: "item", id: item.id });
                  const choices = formats
                    ? (item.options?.find((group) => group.formats)?.choices ?? [])
                    : [];
                  return (
                    <div key={item.id} className="flex flex-col">
                      <Checkbox
                        checked={wholeItem}
                        disabled={wholeCategory}
                        onChange={() => toggle({ kind: "item", id: item.id })}
                        label={item.name}
                      />
                      {choices.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 pl-7">
                          {choices.map((choice) => (
                            <Checkbox
                              key={choice.id}
                              checked={
                                wholeItem ||
                                picked({ kind: "item", id: item.id, choiceId: choice.id })
                              }
                              disabled={wholeItem}
                              onChange={() =>
                                toggle({ kind: "item", id: item.id, choiceId: choice.id })
                              }
                              label={choice.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
