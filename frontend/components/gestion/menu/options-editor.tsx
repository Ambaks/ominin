"use client";

import { ChevronDownIcon, XIcon } from "@/components/gestion/icons";
import { inputClass } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { PriceInput } from "@/components/ui/price-input";
import { Toggle } from "@/components/ui/toggle";
import { parsePriceInput, priceToInput } from "@/lib/gestion/format";
import type { MenuItem, OptionGroup } from "@/lib/menu-data";
import { moved } from "@/lib/move";

/*
 * Les suppléments sont édités en texte ("1,50") et convertis à
 * l'enregistrement. L'ordre des groupes et des choix est celui de la liste :
 * les flèches le changent, et c'est dans cet ordre que la carte les propose.
 */

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

/** Monter / descendre, pour un groupe comme pour un choix. */
function MoveButtons({
  index,
  count,
  label,
  onMove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (delta: -1 | 1) => void;
}) {
  return (
    <>
      <IconButton
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={`Monter ${label}`}
      >
        <ChevronDownIcon className="size-4 rotate-180" />
      </IconButton>
      <IconButton
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Descendre ${label}`}
      >
        <ChevronDownIcon className="size-4" />
      </IconButton>
    </>
  );
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
      {value.map((group, groupIndex) => (
        <div
          key={group.id}
          className="flex flex-col gap-3 rounded-xl border border-hairline bg-background p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={group.name}
              onChange={(event) =>
                patchGroup(group.id, { name: event.target.value })
              }
              placeholder="Nom du groupe (ex. Taille)"
              className={inputClass}
            />
            <IconButton
              tone="danger"
              onClick={() => onChange(value.filter((g) => g.id !== group.id))}
              aria-label={`Supprimer le groupe ${group.name || "sans nom"}`}
            >
              <XIcon className="size-4" />
            </IconButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-muted">
              <Toggle
                checked={group.obligatoire}
                onChange={(checked) =>
                  patchGroup(group.id, { obligatoire: checked })
                }
                label="Groupe obligatoire"
              />
              Obligatoire
            </label>
            <div className="flex gap-2">
              <MoveButtons
                index={groupIndex}
                count={value.length}
                label={`le groupe ${group.name || "sans nom"}`}
                onMove={(delta) => onChange(moved(value, groupIndex, delta))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {group.choices.map((choice, choiceIndex) => (
              <div key={choice.id} className="flex flex-wrap items-center gap-2">
                <input
                  value={choice.name}
                  onChange={(event) =>
                    patchChoice(group.id, choice.id, {
                      name: event.target.value,
                    })
                  }
                  placeholder="Choix"
                  className={`${inputClass} min-w-40 flex-1`}
                />
                <PriceInput
                  value={choice.supplement}
                  onChange={(supplement) =>
                    patchChoice(group.id, choice.id, { supplement })
                  }
                  placeholder="+0,00"
                  className="w-28 shrink-0"
                />
                <MoveButtons
                  index={choiceIndex}
                  count={group.choices.length}
                  label={`le choix ${choice.name || "sans nom"}`}
                  onMove={(delta) =>
                    patchGroup(group.id, {
                      choices: moved(group.choices, choiceIndex, delta),
                    })
                  }
                />
                <IconButton
                  tone="danger"
                  onClick={() =>
                    patchGroup(group.id, {
                      choices: group.choices.filter((c) => c.id !== choice.id),
                    })
                  }
                  aria-label={`Supprimer le choix ${choice.name || "sans nom"}`}
                >
                  <XIcon className="size-4" />
                </IconButton>
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
              className="self-start rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-ember-1 transition-colors hover:border-ember-2/40"
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
          className="rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
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
            className="appearance-none rounded-full border border-hairline bg-surface px-4 py-2.5 text-base font-medium text-muted outline-none transition-colors hover:text-foreground focus:border-ember-2/50 lg:pointer-fine:text-sm"
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
