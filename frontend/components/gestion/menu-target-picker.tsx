"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/gestion/icons";
import { Checkbox, GlassButton } from "@/components/gestion/ui";
import type { MenuTarget } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";

/*
 * Les catégories de la carte, leurs articles en dessous : ce qu'un tarif
 * planifié ou une fermeture vise. Cocher une catégorie la prend en entier,
 * articles à venir compris ; ses articles se grisent alors. Avec `formats`
 * (tarifs), un article à formats montre aussi les siens : la happy hour du
 * verre, pas de la bouteille. Avec `compact`, les articles restent repliés
 * sous leur catégorie, sauf celles où quelque chose est déjà coché.
 */
export function MenuTargetPicker({
  categories,
  value,
  onChange,
  label,
  formats = false,
  compact = false,
}: {
  categories: MenuCategory[];
  value: MenuTarget[];
  onChange: (targets: MenuTarget[]) => void;
  label: string;
  formats?: boolean;
  compact?: boolean;
}) {
  const pickedItemsOf = (category: MenuCategory) =>
    category.items.filter((item) =>
      value.some((target) => target.kind === "item" && target.id === item.id)
    ).length;
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(
    () => new Set(categories.filter((category) => pickedItemsOf(category) > 0).map((c) => c.id))
  );
  const fold = (id: string) =>
    setUnfolded((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
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
      <legend className={compact ? "sr-only" : "g-field-label"}>
        {label}
        <b aria-hidden>*</b>
      </legend>
      <p className="g-field-hint">
        {compact
          ? "Une catégorie entière emporte aussi ses futurs articles."
          : "Cochez une catégorie entière et les articles que vous y ajouterez plus tard suivront d'eux-mêmes."}
      </p>
      <div className="g-plate flex flex-col gap-1 p-3">
        {categories.map((category) => {
          const wholeCategory = picked({ kind: "category", id: category.id });
          const open = !compact || unfolded.has(category.id);
          const count = pickedItemsOf(category);
          return (
            <div key={category.id} className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <Checkbox
                  checked={wholeCategory}
                  onChange={() => toggle({ kind: "category", id: category.id })}
                  label={
                    <span className="font-semibold">
                      {category.name}
                      {compact && !wholeCategory && count > 0 && (
                        <span className="font-normal text-muted"> · {count} coché{count > 1 ? "s" : ""}</span>
                      )}
                    </span>
                  }
                />
                {compact && category.items.length > 0 && (
                  <GlassButton
                    variant="icon"
                    aria-expanded={open}
                    aria-label={`${open ? "Replier" : "Choisir parmi"} les articles de ${category.name}`}
                    onClick={() => fold(category.id)}
                    className={open ? "rotate-180" : ""}
                  >
                    <ChevronDownIcon />
                  </GlassButton>
                )}
              </div>
              {open && <div className="flex flex-col pl-7">
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
              </div>}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
