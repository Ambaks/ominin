"use client";

import { ChevronDownIcon, XIcon } from "@/components/gestion/icons";
import {
  OptionsEditor,
  draftToOptions,
  optionsToDraft,
  type OptionGroupDraft,
} from "@/components/gestion/menu/options-editor";
import { inputClass } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { normalizeText } from "@/lib/admin/format";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { Etape } from "@/lib/gestion/types";
import type { MenuCategory } from "@/lib/menu-data";
import { moved } from "@/lib/move";

export interface ArticleDraft {
  id: string;
  name: string;
  detail: string;
  supplement: string;
  itemId?: string;
  options: OptionGroupDraft[];
}

export interface EtapeDraft {
  id: string;
  name: string;
  obligatoire: boolean;
  categoryId?: string;
  exclus: string[];
  /** Suppléments des articles de la catégorie, en texte, par id d'article. */
  supplements: Record<string, string>;
  articles: ArticleDraft[];
}

export function emptyArticle(): ArticleDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    detail: "",
    supplement: "",
    options: [],
  };
}

export function emptyEtape(name = "", categoryId?: string): EtapeDraft {
  return {
    id: crypto.randomUUID(),
    name,
    obligatoire: true,
    categoryId,
    exclus: [],
    supplements: {},
    articles: [],
  };
}

/** Les étapes d'un modèle, chacune sur la catégorie qui porte son nom (« Nos plats »). */
export function modeleEtapes(
  modele: readonly string[],
  categories: MenuCategory[]
): EtapeDraft[] {
  return modele.map((name) => {
    const word = new RegExp(`\\b${normalizeText(name)}s?\\b`);
    return emptyEtape(
      name,
      categories.find((category) => word.test(normalizeText(category.name)))?.id
    );
  });
}

export function etapesToDraft(etapes: Etape[]): EtapeDraft[] {
  return etapes.map((etape) => ({
    id: etape.id,
    name: etape.name,
    obligatoire: etape.obligatoire,
    categoryId: etape.categoryId,
    exclus: etape.exclus ?? [],
    supplements: Object.fromEntries(
      Object.entries(etape.supplements ?? {}).map(([itemId, supplement]) => [
        itemId,
        priceToInput(supplement),
      ])
    ),
    articles: etape.articles.map((article) => ({
      id: article.id,
      name: article.name,
      detail: article.detail ?? "",
      supplement: article.supplement > 0 ? priceToInput(article.supplement) : "",
      itemId: article.itemId,
      options: optionsToDraft(article.options),
    })),
  }));
}

/** Une étape sans nom prend celui de sa catégorie ; vide, elle n'est pas gardée. */
export function draftToEtapes(
  drafts: EtapeDraft[],
  categories: MenuCategory[]
): Etape[] {
  return drafts
    .map((draft) => {
      const articles = draft.articles
        .map((article) => {
          const options = draftToOptions(article.options);
          return {
            id: article.id,
            name: article.name.trim(),
            detail: article.detail.trim() || undefined,
            supplement: parsePriceInput(article.supplement) ?? 0,
            itemId: article.itemId,
            options: options.length ? options : undefined,
          };
        })
        .filter((article) => article.name);
      const category = categories.find((c) => c.id === draft.categoryId);
      const supplements = Object.fromEntries(
        Object.entries(draft.supplements).flatMap(([itemId, text]) => {
          const supplement = parsePriceInput(text);
          return supplement && !draft.exclus.includes(itemId)
            ? [[itemId, supplement]]
            : [];
        })
      );
      return {
        id: draft.id,
        name: draft.name.trim() || category?.name || "",
        obligatoire: draft.obligatoire,
        ...(draft.categoryId && {
          categoryId: draft.categoryId,
          exclus: draft.exclus.length ? draft.exclus : undefined,
          supplements: Object.keys(supplements).length ? supplements : undefined,
        }),
        articles,
      };
    })
    .filter((etape) => etape.name && (etape.categoryId || etape.articles.length > 0));
}

export function EtapeEditor({
  value,
  onChange,
  categories,
  showOptions,
}: {
  value: EtapeDraft[];
  onChange: (value: EtapeDraft[]) => void;
  categories: MenuCategory[];
  showOptions: boolean;
}) {
  const menuItems = categories.flatMap((category) => category.items);
  const importCandidates = menuItems.filter((item) => item.options?.length);

  const patchEtape = (etapeId: string, patch: Partial<EtapeDraft>) =>
    onChange(
      value.map((etape) => (etape.id === etapeId ? { ...etape, ...patch } : etape))
    );

  const patchArticle = (
    etapeId: string,
    articleId: string,
    patch: Partial<ArticleDraft>
  ) =>
    onChange(
      value.map((etape) =>
        etape.id === etapeId
          ? {
              ...etape,
              articles: etape.articles.map((article) =>
                article.id === articleId ? { ...article, ...patch } : article
              ),
            }
          : etape
      )
    );

  // « category:<id> » prend toute la catégorie, « item:<id> » un article.
  const addFromCarte = (etape: EtapeDraft, pick: string) => {
    const [kind, id] = pick.split(":");
    if (kind === "category") {
      const category = categories.find((c) => c.id === id);
      if (!category) return;
      const inCategory = (article: ArticleDraft) =>
        category.items.some((item) => item.id === article.itemId);
      // Ses articles déjà choisis un par un rejoignent la catégorie, avec
      // leur supplément.
      patchEtape(etape.id, {
        categoryId: category.id,
        name: etape.name || category.name,
        exclus: [],
        supplements: Object.fromEntries(
          etape.articles
            .filter((article) => inCategory(article) && article.supplement)
            .map((article) => [article.itemId!, article.supplement])
        ),
        articles: etape.articles.filter((article) => !inCategory(article)),
      });
      return;
    }
    if (etape.exclus.includes(id)) {
      patchEtape(etape.id, { exclus: etape.exclus.filter((itemId) => itemId !== id) });
      return;
    }
    const item = menuItems.find((candidate) => candidate.id === id);
    if (!item) return;
    // Lié à la carte, l'article suit les options de sa fiche.
    patchEtape(etape.id, {
      articles: [...etape.articles, { ...emptyArticle(), itemId: item.id, name: item.name }],
    });
  };

  // L'ordre des étapes et des choix est celui du menu client : il se règle
  // ici, aux flèches, comme celui des catégories et des articles.
  const moveButtons = (
    label: string,
    index: number,
    length: number,
    onMove: (delta: -1 | 1) => void
  ) => (
    <>
      <IconButton
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={`Monter ${label}`}
      >
        <ChevronDownIcon className="size-4 rotate-180" />
      </IconButton>
      <IconButton
        disabled={index === length - 1}
        onClick={() => onMove(1)}
        aria-label={`Descendre ${label}`}
      >
        <ChevronDownIcon className="size-4" />
      </IconButton>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      {value.map((etape, index) => {
        const category = categories.find((c) => c.id === etape.categoryId);
        const kept = category?.items.filter((item) => !etape.exclus.includes(item.id)) ?? [];
        const taken = new Set([
          ...kept.map((item) => item.id),
          ...etape.articles.flatMap((article) => (article.itemId ? [article.itemId] : [])),
        ]);
        return (
          <div
            key={etape.id}
            className="flex flex-col gap-3 rounded-xl border border-hairline bg-background p-3"
          >
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-faint">
                Étape {index + 1}
              </span>
              <input
                value={etape.name}
                onChange={(event) =>
                  patchEtape(etape.id, { name: event.target.value })
                }
                placeholder={category?.name ?? "Nom de l'étape (ex. Entrée)"}
                className={inputClass}
              />
              <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
                Obligatoire
                <Toggle
                  checked={etape.obligatoire}
                  onChange={(checked) =>
                    patchEtape(etape.id, { obligatoire: checked })
                  }
                  label="Étape obligatoire"
                />
              </label>
              {moveButtons(
                etape.name || `l'étape ${index + 1}`,
                index,
                value.length,
                (delta) => onChange(moved(value, index, delta))
              )}
              <IconButton
                tone="danger"
                onClick={() => onChange(value.filter((e) => e.id !== etape.id))}
                aria-label="Supprimer l'étape"
              >
                <XIcon className="size-4" />
              </IconButton>
            </div>

            {etape.categoryId && (
              <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-2.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 text-sm">
                    {category ? (
                      <>
                        Toute la catégorie{" "}
                        <span className="font-semibold">« {category.name} »</span>{" "}
                        <span className="text-muted">
                          · {kept.length} article{kept.length > 1 ? "s" : ""}
                        </span>
                      </>
                    ) : (
                      <span className="text-ember-3">Catégorie supprimée de la carte</span>
                    )}
                  </p>
                  <IconButton
                    tone="danger"
                    onClick={() =>
                      patchEtape(etape.id, {
                        categoryId: undefined,
                        exclus: [],
                        supplements: {},
                      })
                    }
                    aria-label="Retirer la catégorie"
                  >
                    <XIcon className="size-4" />
                  </IconButton>
                </div>
                {category && (
                  <p className="text-xs text-faint">
                    Un article ajouté plus tard à cette catégorie entre aussi
                    dans la formule.
                  </p>
                )}
                {category && category.items.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-foreground">
                      Retirer un article ou ajouter un supplément
                    </summary>
                    <ul className="flex flex-col gap-1.5 pt-2">
                      {category.items.map((item) => {
                        const included = !etape.exclus.includes(item.id);
                        return (
                          <li key={item.id} className="flex items-center gap-2">
                            <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 text-sm">
                              <input
                                type="checkbox"
                                checked={included}
                                onChange={() =>
                                  patchEtape(etape.id, {
                                    exclus: included
                                      ? [...etape.exclus, item.id]
                                      : etape.exclus.filter((id) => id !== item.id),
                                  })
                                }
                                className="size-4 shrink-0 accent-ember-2"
                              />
                              <span className={`truncate ${included ? "" : "text-faint line-through"}`}>
                                {item.name}
                              </span>
                            </label>
                            {included && (
                              <PriceInput
                                value={etape.supplements[item.id] ?? ""}
                                onChange={(supplement) =>
                                  patchEtape(etape.id, {
                                    supplements: { ...etape.supplements, [item.id]: supplement },
                                  })
                                }
                                placeholder="+0,00"
                                className="w-28 shrink-0"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {etape.articles.map((article, articleIndex) => {
              const linked = menuItems.find((item) => item.id === article.itemId);
              return (
                <div
                  key={article.id}
                  className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      value={article.name}
                      onChange={(event) =>
                        patchArticle(etape.id, article.id, {
                          name: event.target.value,
                        })
                      }
                      placeholder="Nom du choix"
                      className={inputClass}
                    />
                    <PriceInput
                      value={article.supplement}
                      onChange={(supplement) =>
                        patchArticle(etape.id, article.id, { supplement })
                      }
                      placeholder="+0,00"
                      className="w-28 shrink-0"
                    />
                    {moveButtons(
                      article.name || "le choix",
                      articleIndex,
                      etape.articles.length,
                      (delta) =>
                        patchEtape(etape.id, {
                          articles: moved(etape.articles, articleIndex, delta),
                        })
                    )}
                    <IconButton
                      tone="danger"
                      onClick={() =>
                        patchEtape(etape.id, {
                          articles: etape.articles.filter(
                            (a) => a.id !== article.id
                          ),
                        })
                      }
                      aria-label="Supprimer le choix"
                    >
                      <XIcon className="size-4" />
                    </IconButton>
                  </div>

                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-foreground">
                      {showOptions && !linked
                        ? `Détail et options (${article.options.length})`
                        : "Détail"}
                      {linked && " · article de la carte"}
                    </summary>
                    <div className="flex flex-col gap-2 pt-2">
                      <input
                        value={article.detail}
                        onChange={(event) =>
                          patchArticle(etape.id, article.id, {
                            detail: event.target.value,
                          })
                        }
                        placeholder="Détail (optionnel)"
                        className={inputClass}
                      />
                      {showOptions &&
                        (linked ? (
                          <p className="text-xs text-muted">
                            Options : celles de l&rsquo;article (
                            {linked.options?.length ?? 0}), qui se modifient dans
                            sa fiche.
                          </p>
                        ) : (
                          <OptionsEditor
                            value={article.options}
                            onChange={(options) =>
                              patchArticle(etape.id, article.id, { options })
                            }
                            importCandidates={importCandidates}
                          />
                        ))}
                    </div>
                  </details>
                </div>
              );
            })}

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value=""
                onChange={(event) => addFromCarte(etape, event.target.value)}
                aria-label={`Ajouter à ${etape.name || `l'étape ${index + 1}`} depuis la carte`}
                className={`${inputClass} font-semibold text-ember-1`}
              >
                <option value="">+ Ajouter depuis la carte…</option>
                {categories.map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    <option value={`category:${c.id}`} disabled={c.id === etape.categoryId}>
                      Toute la catégorie ({c.items.length})
                    </option>
                    {c.items.map((item) => (
                      <option key={item.id} value={`item:${item.id}`} disabled={taken.has(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  patchEtape(etape.id, {
                    articles: [...etape.articles, emptyArticle()],
                  })
                }
                className="shrink-0 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
              >
                + Choix libre
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...value, emptyEtape()])}
        className="self-start rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        + Ajouter une étape
      </button>
    </div>
  );
}
