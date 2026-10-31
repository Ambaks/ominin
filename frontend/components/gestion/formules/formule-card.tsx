"use client";

import { ClockIcon, EditIcon, TrashIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Plate, Switch } from "@/components/gestion/ui";
import { useRunMutation } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { formatHeure } from "@/lib/gestion/fermetures";
import { WEEK_DAYS } from "@/lib/gestion/constants";
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

/** La même chose, courte, pour une pastille : « lun.–ven. 11 h 30 – 14 h 30 ». */
function shortSchedule(formule: Pick<Formule, "days" | "hours">): string {
  const abbr = (iso: number) => `${WEEK_DAYS.find((day) => day.iso === iso)!.long.slice(0, 3)}.`;
  const days = formule.days && [...formule.days].sort((a, b) => a - b);
  const contiguous =
    days && days.length > 2 && days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  return [
    days && (contiguous ? `${abbr(days[0])}–${abbr(days[days.length - 1])}` : days.map(abbr).join(", ")),
    formule.hours && `${formatHeure(formule.hours.startsAt)} – ${formatHeure(formule.hours.endsAt)}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function FormuleCard({
  formule,
  placed = false,
  onEdit,
  onDelete,
}: {
  formule: Formule;
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
    <Plate className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-g-body font-semibold break-words">
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
          <span key={etape.id} className="g-chip max-w-full truncate">
            {etape.name} · {etapeArticles(etape, categories).length} choix
          </span>
        ))}
        {schedule && (
          <span title={`Proposée ${schedule}`}>
            <Chip icon={<ClockIcon />}>{shortSchedule(formule)}</Chip>
          </span>
        )}
        {placed && <Chip>Sur l&rsquo;image</Chip>}
        {incomplete && <Chip tone="problem">À compléter</Chip>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
        <span className="flex min-h-g-control items-center gap-2 text-g-label text-muted">
          <Switch
            checked={formule.disponible}
            disabled={!canEdit}
            onChange={(checked) =>
              void run(
                () => api.setFormuleAvailability(formule.id, checked),
                checked ? "Formule remise en vente." : "Formule retirée de la vente."
              )
            }
            aria-label={`${formule.name} en vente`}
          />
          {formule.disponible ? "En vente" : "Retirée"}
        </span>
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
