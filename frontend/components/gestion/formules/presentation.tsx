"use client";

import { useState } from "react";
import { ChevronDownIcon, EditIcon, TrashIcon } from "@/components/gestion/icons";
import { ConfirmSheet, Field, GlassButton, Plate, Select } from "@/components/gestion/ui";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import type { Affiche, Formule } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { AfficheFormModal } from "./affiche-form-modal";

/*
 * « Présentation » (décision 12) : le cas d'une image qui présente plusieurs
 * formules côte à côte, replié sous la liste. Téléverser l'image, puis dire
 * quelle formule chaque offre présente, de gauche à droite. Le modèle
 * `affiche: { id, rang }` tient tel quel.
 */
export function Presentation({
  affiches,
  formules,
  canEdit,
}: {
  affiches: Affiche[];
  formules: Formule[];
  canEdit: boolean;
}) {
  const run = useRunMutation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Affiche | null>(null);
  const [deleting, setDeleting] = useState<Affiche | null>(null);
  const unplaced = formules.filter((formule) => !formule.affiche);
  // Ouvert à l'arrivée seulement : supprimer la dernière image ne replie rien.
  const [initiallyOpen] = useState(affiches.length > 0);

  if (affiches.length === 0 && !canEdit) return null;

  const place = async (affiche: Affiche, rang: number, formuleId: string, previous?: Formule) => {
    if (previous && previous.id !== formuleId) await api.placeFormule(previous.id, null);
    if (formuleId) await api.placeFormule(formuleId, { id: affiche.id, rang });
  };

  return (
    <details open={initiallyOpen} className="group">
      <summary className="flex min-h-g-control cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-0.5 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-muted transition-transform group-open:rotate-0 motion-reduce:transition-none" />
        <span className="text-g-body font-semibold">Présentation</span>
        <span className="text-g-meta text-muted">
          {affiches.length === 0
            ? "une image avec plusieurs offres cliquables, en haut du menu"
            : `${affiches.length} image${affiches.length > 1 ? "s" : ""} en haut du menu`}
        </span>
      </summary>
      <div className="flex flex-col gap-g-gap pt-3">
        {affiches.map((affiche) => {
          const slots = Array.from({ length: affiche.offres }, (_, index) => index + 1);
          return (
            <Plate key={affiche.id} className="flex flex-col gap-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-g-body font-semibold">Image des offres</p>
                  <p className="text-g-meta text-muted">
                    {affiche.offres} offre{affiche.offres > 1 ? "s" : ""}, de gauche à droite ; un bouton par formule sous l&rsquo;image.
                  </p>
                </div>
                {canEdit && (
                  <span className="flex shrink-0 gap-1.5">
                    <GlassButton variant="icon" aria-label="Modifier l'image" onClick={() => setEditing(affiche)}>
                      <EditIcon />
                    </GlassButton>
                    <GlassButton variant="icon" aria-label="Supprimer l'image" onClick={() => setDeleting(affiche)}>
                      <TrashIcon />
                    </GlassButton>
                  </span>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL téléversée ou saisie par le gérant */}
              <img
                src={affiche.image}
                alt="Image des offres"
                className="max-h-60 w-full rounded-g-card border border-hairline object-contain"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {slots.map((rang) => {
                  const current = formules.find(
                    (f) => f.affiche?.id === affiche.id && f.affiche.rang === rang
                  );
                  const options = [...(current ? [current] : []), ...unplaced];
                  return (
                    <Field key={rang} label={`Offre ${rang}`}>
                      <Select
                        value={current?.id ?? ""}
                        disabled={!canEdit}
                        onChange={(event) =>
                          void run(
                            () => place(affiche, rang, event.target.value, current),
                            event.target.value ? "Formule placée sur l'image." : "Formule retirée de l'image."
                          )
                        }
                      >
                        <option value="">Aucune formule</option>
                        {options.map((formule) => (
                          <option key={formule.id} value={formule.id}>
                            {formule.name} · {formatPrice(formule.price)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  );
                })}
              </div>
              {unplaced.length === 0 && slots.some((rang) => !formules.some((f) => f.affiche?.id === affiche.id && f.affiche.rang === rang)) && (
                <p className="text-g-meta text-muted">
                  Créez d&rsquo;abord la formule dans la liste, puis placez-la ici.
                </p>
              )}
            </Plate>
          );
        })}
        {canEdit && (
          <GlassButton className="self-start" onClick={() => setCreating(true)}>
            + Ajouter une image
          </GlassButton>
        )}
      </div>

      {(creating || editing) && (
        <AfficheFormModal
          affiche={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <ConfirmSheet
          title="Supprimer cette image ?"
          text="Ses formules restent en vente, en tuiles sur le menu."
          confirmLabel="Supprimer l'image"
          destructive
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            void run(async () => {
              await api.deleteAffiche(deleting.id);
              setDeleting(null);
            }, "Image supprimée.")
          }
        />
      )}
    </details>
  );
}
