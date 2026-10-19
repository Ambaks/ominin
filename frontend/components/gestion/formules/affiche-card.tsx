"use client";

import { FormuleCard } from "@/components/gestion/formules/formule-card";
import { EditIcon, TrashIcon } from "@/components/gestion/icons";
import { inputClass } from "@/components/ui/field";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { Affiche, Formule } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/**
 * Une affiche et ses emplacements, de gauche à droite : chacun porte sa
 * formule, ou propose d'en créer une (ou d'y placer une formule sans
 * affiche).
 */
export function AfficheCard({
  affiche,
  formules,
  canEdit,
  onEdit,
  onDelete,
  onCreateFormule,
  onEditFormule,
  onDeleteFormule,
}: {
  affiche: Affiche;
  formules: Formule[];
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCreateFormule: (slot: NonNullable<Formule["affiche"]>) => void;
  onEditFormule: (formule: Formule) => void;
  onDeleteFormule: (formule: Formule) => void;
}) {
  const run = useRunMutation();
  const unplaced = formules.filter((formule) => !formule.affiche);
  const slots = Array.from({ length: affiche.offres }, (_, index) => index + 1);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-medium">Affiche des offres</h3>
          <p className="text-xs text-faint">
            {affiche.offres} offre{affiche.offres > 1 ? "s" : ""}, de gauche à droite
          </p>
        </div>
        {canEdit && (
          <span className="flex gap-1">
            <button
              type="button"
              onClick={onEdit}
              aria-label="Modifier l'affiche"
              className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              <EditIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer l'affiche"
              className="rounded-full border border-hairline p-2 text-muted transition-colors hover:border-ember-3/50 hover:text-ember-3"
            >
              <TrashIcon className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- URL téléversée ou saisie par le gérant */}
      <img
        src={affiche.image}
        alt="Affiche des offres"
        className="max-h-60 w-full rounded-xl border border-hairline bg-background object-contain"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {slots.map((rang) => {
          const formule = formules.find(
            (f) => f.affiche?.id === affiche.id && f.affiche.rang === rang
          );
          return (
            <div key={rang} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Offre {rang}
                </span>
                {formule && canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () => api.placeFormule(formule.id, null),
                        "Formule retirée de l'affiche."
                      )
                    }
                    className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
                  >
                    Retirer de l&rsquo;affiche
                  </button>
                )}
              </div>
              {formule ? (
                <FormuleCard
                  formule={formule}
                  onEdit={() => onEditFormule(formule)}
                  onDelete={() => onDeleteFormule(formule)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline p-5 text-center">
                  <p className="text-sm text-muted">Aucune formule pour cette offre.</p>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => onCreateFormule({ id: affiche.id, rang })}
                        className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
                      >
                        Créer la formule
                      </button>
                      {unplaced.length > 0 && (
                        <select
                          value=""
                          onChange={(event) =>
                            void run(
                              () =>
                                api.placeFormule(event.target.value, {
                                  id: affiche.id,
                                  rang,
                                }),
                              "Formule placée sur l'affiche."
                            )
                          }
                          aria-label={`Placer une formule existante sur l'offre ${rang}`}
                          className={`${inputClass} max-w-64`}
                        >
                          <option value="" disabled>
                            ou placer une formule existante…
                          </option>
                          {unplaced.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name} · {formatPrice(f.price)}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
