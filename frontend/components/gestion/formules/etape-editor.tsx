"use client";

import { XIcon } from "@/components/gestion/icons";
import {
  OptionsEditor,
  draftToOptions,
  optionsToDraft,
  type OptionGroupDraft,
} from "@/components/gestion/menu/options-editor";
import { inputClass } from "@/components/ui/field";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { Etape } from "@/lib/gestion/types";
import type { MenuItem } from "@/lib/menu-data";

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

export function emptyEtape(): EtapeDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    obligatoire: true,
    articles: [emptyArticle()],
  };
}

export function etapesToDraft(etapes: Etape[]): EtapeDraft[] {
  return etapes.map((etape) => ({
    id: etape.id,
    name: etape.name,
    obligatoire: etape.obligatoire,
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

export function draftToEtapes(drafts: EtapeDraft[]): Etape[] {
  return drafts
    .map((draft) => ({
      id: draft.id,
      name: draft.name.trim(),
      obligatoire: draft.obligatoire,
      articles: draft.articles
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
        .filter((article) => article.name),
    }))
    .filter((etape) => etape.name && etape.articles.length > 0);
}

export function EtapeEditor({
  value,
  onChange,
  menuItems,
  showOptions,
}: {
  value: EtapeDraft[];
  onChange: (value: EtapeDraft[]) => void;
  menuItems: MenuItem[];
  showOptions: boolean;
}) {
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

  const importCandidates = menuItems.filter((item) => item.options?.length);

  return (
    <div className="flex flex-col gap-3">
      {value.map((etape, index) => (
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
              placeholder="Nom de l'étape (ex. Entrée)"
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
            <button
              type="button"
              onClick={() => onChange(value.filter((e) => e.id !== etape.id))}
              aria-label="Supprimer l'étape"
              className="shrink-0 text-faint transition-colors hover:text-ember-3"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {etape.articles.map((article) => (
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
                <button
                  type="button"
                  onClick={() =>
                    patchEtape(etape.id, {
                      articles: etape.articles.filter(
                        (a) => a.id !== article.id
                      ),
                    })
                  }
                  aria-label="Supprimer le choix"
                  className="shrink-0 text-faint transition-colors hover:text-ember-3"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
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
                <select
                  value={article.itemId ?? ""}
                  onChange={(event) => {
                    const item = menuItems.find(
                      (candidate) => candidate.id === event.target.value
                    );
                    if (item) {
                      patchArticle(etape.id, article.id, {
                        itemId: item.id,
                        name: item.name,
                        options: optionsToDraft(item.options, true),
                      });
                    } else {
                      patchArticle(etape.id, article.id, { itemId: undefined });
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Aucun article lié</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {showOptions && (
                <details>
                  <summary className="cursor-pointer text-xs font-medium text-muted transition-colors hover:text-foreground">
                    Options ({article.options.length})
                  </summary>
                  <div className="pt-2">
                    <OptionsEditor
                      value={article.options}
                      onChange={(options) =>
                        patchArticle(etape.id, article.id, { options })
                      }
                      importCandidates={importCandidates}
                    />
                  </div>
                </details>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              patchEtape(etape.id, {
                articles: [...etape.articles, emptyArticle()],
              })
            }
            className="self-start text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
          >
            + Ajouter un choix
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...value, emptyEtape()])}
        className="self-start rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
      >
        + Ajouter une étape
      </button>
    </div>
  );
}
