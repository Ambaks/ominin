"use client";

import { ChevronDownIcon, XIcon } from "@/components/gestion/icons";
import { inputClass } from "@/components/ui/field";
import { GlassButton } from "@/components/gestion/ui";
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
  /** Repris tel quel : la disponibilité se règle depuis la fiche, pas ici. */
  disponible?: boolean;
}

/** Réglages d'un groupe que l'éditeur n'affiche pas, gardés à l'enregistrement. */
type GroupExtras = Pick<OptionGroup, "multiple" | "formats" | "aucun" | "when">;

export interface OptionGroupDraft {
  id: string;
  name: string;
  obligatoire: boolean;
  choices: ChoiceDraft[];
  extras?: GroupExtras;
}

export function optionsToDraft(
  options: OptionGroup[] | undefined,
  freshIds = false
): OptionGroupDraft[] {
  // Une copie (freshIds) renumérote groupes et choix : la condition
  // d'affichage d'un groupe (`when`) suit les nouveaux identifiants.
  const ids = new Map<string, string>();
  const renumber = (id: string) => {
    if (!ids.has(id)) ids.set(id, freshIds ? crypto.randomUUID() : id);
    return ids.get(id)!;
  };
  for (const group of options ?? []) {
    renumber(group.id);
    group.choices.forEach((choice) => renumber(choice.id));
  }
  return (options ?? []).map(
    ({ id, name, obligatoire, choices, multiple, formats, aucun, when }) => ({
      id: renumber(id),
      name,
      obligatoire,
      choices: choices.map((choice) => ({
        id: renumber(choice.id),
        name: choice.name,
        supplement: choice.supplement > 0 ? priceToInput(choice.supplement) : "",
        disponible: choice.disponible,
      })),
      extras: {
        multiple,
        formats,
        aucun,
        when: when && {
          group: renumber(when.group),
          choices: when.choices.map(renumber),
        },
      },
    })
  );
}

export function draftToOptions(drafts: OptionGroupDraft[]): OptionGroup[] {
  return drafts
    .map((draft) => ({
      // Absents du JSON quand non définis : JSON.stringify les omet.
      ...draft.extras,
      id: draft.id,
      name: draft.name.trim(),
      obligatoire: draft.obligatoire,
      choices: draft.choices
        .map((choice) => ({
          id: choice.id,
          name: choice.name.trim(),
          supplement: parsePriceInput(choice.supplement) ?? 0,
          ...(choice.disponible === false && { disponible: false }),
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
      <GlassButton
        variant="icon"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={`Monter ${label}`}
      >
        <ChevronDownIcon className="rotate-180" />
      </GlassButton>
      <GlassButton
        variant="icon"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Descendre ${label}`}
      >
        <ChevronDownIcon />
      </GlassButton>
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
          className="g-plate flex flex-col gap-3 p-3"
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
            <GlassButton
              variant="icon"
              onClick={() => onChange(value.filter((g) => g.id !== group.id))}
              aria-label={`Supprimer le groupe ${group.name || "sans nom"}`}
            >
              <XIcon />
            </GlassButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-g-label text-muted">
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
                <GlassButton
                  variant="icon"
                  onClick={() =>
                    patchGroup(group.id, {
                      choices: group.choices.filter((c) => c.id !== choice.id),
                    })
                  }
                  aria-label={`Supprimer le choix ${choice.name || "sans nom"}`}
                >
                  <XIcon />
                </GlassButton>
              </div>
            ))}
            <GlassButton
              className="self-start"
              onClick={() =>
                patchGroup(group.id, {
                  choices: [
                    ...group.choices,
                    { id: crypto.randomUUID(), name: "", supplement: "" },
                  ],
                })
              }
            >
              + Ajouter un choix
            </GlassButton>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <GlassButton
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
        >
          + Groupe d’options
        </GlassButton>
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
            className={`${inputClass} w-auto rounded-full`}
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
