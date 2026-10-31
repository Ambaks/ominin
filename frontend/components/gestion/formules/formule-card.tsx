"use client";

import type { CSSProperties } from "react";
import { ClockIcon, EditIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Plate } from "@/components/gestion/ui";
import { useRunMutation } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import * as api from "@/lib/gestion/api";
import { formatHeure } from "@/lib/gestion/fermetures";
import { formatDays } from "@/lib/gestion/format";
import { etapeArticles } from "@/lib/gestion/formules";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { Formule } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { etapeIncomplete } from "./etape-draft";

/** « lundi, mardi… de 11 h 30 à 14 h 30 », ou rien si toujours proposée. */
export function formuleSchedule(formule: Pick<Formule, "days" | "hours">): string | undefined {
  if (!formule.days && !formule.hours) return undefined;
  return [
    formule.days && formatDays(formule.days),
    formule.hours && `de ${formatHeure(formule.hours.startsAt)} à ${formatHeure(formule.hours.endsAt)}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function FormuleCard({
  formule,
  index = 0,
  placed = false,
  onEdit,
  onDelete,
}: {
  formule: Formule;
  index?: number;
  /** Présentée sur une image (affiche) plutôt qu'en tuile. */
  placed?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { can } = useGestionAccess();
  const run = useRunMutation();
  const canEdit = can("formules.edit");
  const categories = useGestion()?.categories ?? [];
  const incomplete = formule.etapes.some((etape) => etapeIncomplete(etape, categories));
  const schedule = formuleSchedule(formule);

  return (
    <Plate className="g-rise flex flex-col gap-3 p-4" style={{ "--g-i": index } as CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-g-body font-semibold">
            {canEdit ? (
              <button type="button" tabIndex={-1} onClick={onEdit} className="cursor-pointer text-left">
                <span className="line-clamp-2">{formule.name}</span>
              </button>
            ) : (
              <span className="line-clamp-2">{formule.name}</span>
            )}
          </h3>
          {formule.description && (
            <p className="line-clamp-2 text-g-meta text-muted">{formule.description}</p>
          )}
        </div>
        <span className="g-money shrink-0 text-g-label font-semibold text-g-entity tabular-nums">
          {formatPrice(formule.price)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {formule.etapes.map((etape) => (
          <Chip key={etape.id}>
            {etape.name} · {etapeArticles(etape, categories).length}
          </Chip>
        ))}
        {schedule && <Chip icon={<ClockIcon />}>{schedule}</Chip>}
        {placed && <Chip>Sur l&rsquo;image</Chip>}
        {incomplete && <Chip tone="problem">À compléter</Chip>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
        <label className="flex min-h-g-control items-center gap-2 text-g-label text-muted">
          <Toggle
            checked={formule.disponible}
            disabled={!canEdit}
            onChange={(checked) =>
              void run(
                () => api.setFormuleAvailability(formule.id, checked),
                checked ? "Formule remise en vente." : "Formule retirée de la vente."
              )
            }
            label={`Disponibilité de ${formule.name}`}
          />
          {formule.disponible ? "En vente" : "Retirée"}
        </label>
        {canEdit && (
          <span className="flex gap-1.5">
            <GlassButton variant="icon" onClick={onEdit} aria-label={`Modifier ${formule.name}`}>
              <EditIcon />
            </GlassButton>
            <GlassButton variant="icon" onClick={onDelete} aria-label={`Supprimer ${formule.name}`}>
              <TrashIcon />
            </GlassButton>
          </span>
        )}
      </div>
    </Plate>
  );
}
