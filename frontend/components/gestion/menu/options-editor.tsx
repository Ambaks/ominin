"use client";

import { XIcon } from "@/components/gestion/icons";
import { inputClass } from "@/components/ui/field";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { MenuItem, OptionGroup } from "@/lib/menu-data";

/* Les suppléments sont édités en texte ("1,50") et convertis à l'enregistrement. */

export interface ChoiceDraft {
  id: string;
  name: string;
  supplement: string;
}

export interface OptionGroupDraft {
  id: string;
  name: string;
  obligatoire: boolean;
  choices: ChoiceDraft[];
}

export function optionsToDraft(
  options: OptionGroup[] | undefined,
  freshIds = false
): OptionGroupDraft[] {
  return (options ?? []).map((group) => ({
    id: freshIds ? crypto.randomUUID() : group.id,
    name: group.name,
    obligatoire: group.obligatoire,
    choices: group.choices.map((choice) => ({
      id: freshIds ? crypto.randomUUID() : choice.id,
      name: choice.name,
      supplement: choice.supplement > 0 ? priceToInput(choice.supplement) : "",
    })),
  }));
}

export function draftToOptions(drafts: OptionGroupDraft[]): OptionGroup[] {
  return drafts
    .map((draft) => ({
      id: draft.id,
      name: draft.name.trim(),
      obligatoire: draft.obligatoire,
      choices: draft.choices
        .map((choice) => ({
          id: choice.id,
          name: choice.name.trim(),
          supplement: parsePriceInput(choice.supplement) ?? 0,
        }))
        .filter((choice) => choice.name),
    }))
    .filter((group) => group.name && group.choices.length > 0);
}

export function OptionsEditor({
  value,
  onChange,
  importCandidates,
}: {
  value: OptionGroupDraft[];
  onChange: (value: OptionGroupDraft[]) => void;
  importCandidates: MenuItem[];
}) {
  const patchGroup = (groupId: string, patch: Partial<OptionGroupDraft>) =>
    onChange(
      value.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      )
    );

  const patchChoice = (
    groupId: string,
    choiceId: string,
    patch: Partial<ChoiceDraft>
  ) =>
    onChange(
      value.map((group) =>
        group.id === groupId
          ? {
              ...group,
              choices: group.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, ...patch } : choice
              ),
            }
          : group
      )
    );

  return (
    <div className="flex flex-col gap-3">
      {value.map((group) => (
        <div
          key={group.id}
          className="flex flex-col gap-3 rounded-xl border border-hairline bg-background p-3"
        >
          <div className="flex items-center gap-3">
            <input
              value={group.name}
              onChange={(event) =>
                patchGroup(group.id, { name: event.target.value })
              }
              placeholder="Nom du groupe (ex. Taille)"
              className={inputClass}
            />
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
              Obligatoire
              <Toggle
                checked={group.obligatoire}
                onChange={(checked) =>
                  patchGroup(group.id, { obligatoire: checked })
                }
                label="Groupe obligatoire"
              />
            </label>
            <button
              type="button"
              onClick={() => onChange(value.filter((g) => g.id !== group.id))}
              aria-label="Supprimer le groupe d'options"
              className="shrink-0 text-faint transition-colors hover:text-ember-3"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {group.choices.map((choice) => (
              <div key={choice.id} className="flex items-center gap-2">
                <input
                  value={choice.name}
                  onChange={(event) =>
                    patchChoice(group.id, choice.id, {
                      name: event.target.value,
                    })
                  }
                  placeholder="Choix"
                  className={inputClass}
                />
                <PriceInput
                  value={choice.supplement}
                  onChange={(supplement) =>
                    patchChoice(group.id, choice.id, { supplement })
                  }
                  placeholder="+0,00"
                  className="w-28 shrink-0"
                />
                <button
                  type="button"
                  onClick={() =>
                    patchGroup(group.id, {
                      choices: group.choices.filter((c) => c.id !== choice.id),
                    })
                  }
                  aria-label="Supprimer le choix"
                  className="shrink-0 text-faint transition-colors hover:text-ember-3"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patchGroup(group.id, {
                  choices: [
                    ...group.choices,
                    { id: crypto.randomUUID(), name: "", supplement: "" },
                  ],
                })
              }
              className="self-start text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
            >
              + Ajouter un choix
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              {
                id: crypto.randomUUID(),
                name: "",
                obligatoire: false,
                choices: [{ id: crypto.randomUUID(), name: "", supplement: "" }],
              },
            ])
          }
          className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
        >
          + Groupe d’options
        </button>
        {importCandidates.length > 0 && (
          <select
            value=""
            onChange={(event) => {
              const source = importCandidates.find(
                (item) => item.id === event.target.value
              );
              if (source) {
                onChange([...value, ...optionsToDraft(source.options, true)]);
              }
            }}
            className="appearance-none rounded-full border border-hairline bg-surface px-3 py-2 text-xs font-medium text-muted outline-none transition-colors hover:text-foreground focus:border-ember-2/50"
          >
            <option value="">Importer depuis un article…</option>
            {importCandidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
