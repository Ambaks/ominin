"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { FOLLOW_UP_QUICK_OPTIONS } from "@/lib/admin/constants";
import {
  addDays,
  dayStart,
  fromDatetimeLocalValue,
} from "@/lib/admin/format";
import { capturePosition } from "@/lib/admin/geo";
import type { GeoPoint, LeadLite } from "@/lib/admin/types";

type FollowUpChoice = "none" | number | "custom";

/*
 * Le geste central du terrain : marquer visité en deux gestes. La capture de
 * position démarre à l'ouverture, en fond — elle n'attend jamais plus que son
 * timeout et n'empêche rien. En cas d'échec d'écriture, la feuille reste
 * ouverte avec la note intacte.
 */
export function VisitedFlow({
  lead,
  onClose,
}: {
  lead: LeadLite;
  onClose: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<FollowUpChoice>("none");
  const [customDate, setCustomDate] = useState("");
  const [busy, setBusy] = useState(false);
  // Lancée au premier rendu : résolue (ou null) bien avant la validation.
  const [coordsPromise] = useState<Promise<GeoPoint | null>>(() =>
    capturePosition()
  );

  const followUpAt =
    choice === "none"
      ? null
      : choice === "custom"
        ? customDate
          ? fromDatetimeLocalValue(customDate)
          : null
        : addDays(dayStart(), choice).toISOString();

  const submit = async () => {
    setBusy(true);
    try {
      const coords = await coordsPromise;
      await api.markVisited(lead.restaurantId, { note, coords, followUpAt });
      toast.success("Visite enregistrée");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Visité — ${lead.name}`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="ember-gradient w-full rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
        >
          Enregistrer la visite
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Note" hint="Ce que le patron a dit, à qui parler…">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="Facultatif"
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Relance
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { label: "Aucune", value: "none" as const },
                ...FOLLOW_UP_QUICK_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.days,
                })),
                { label: "Choisir…", value: "custom" as const },
              ] satisfies { label: string; value: FollowUpChoice }[]
            ).map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setChoice(option.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  choice === option.value
                    ? "border-ember-2/60 bg-surface text-foreground"
                    : "border-hairline text-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {choice === "custom" && (
            <input
              type="datetime-local"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
