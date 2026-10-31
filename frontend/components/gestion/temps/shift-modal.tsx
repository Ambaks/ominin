"use client";

import { useState } from "react";
import { Field, GlassButton, Input, Select, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import {
  createShift,
  deleteShift,
  updateShift,
  type Shift,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";

/*
 * Un créneau du planning : qui, quel jour, de quelle heure à quelle heure.
 * Un service qui finit après minuit (« 18:00 → 02:00 ») bascule au lendemain
 * de lui-même — c'est le cas courant en restauration, pas une erreur de saisie.
 */

function timeInput(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isoAt(day: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function ShiftModal({
  etablissementId,
  staff,
  day,
  shift,
  member,
  onClose,
  onSaved,
}: {
  etablissementId: string;
  staff: Staff[];
  /** Journée de la case cliquée (le créneau existant garde la sienne). */
  day: Date;
  shift?: Shift;
  /** Membre de la ligne cliquée, quand le créneau est nouveau. */
  member?: Staff;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [staffId, setStaffId] = useState(
    shift?.staffId ?? member?.id ?? staff[0]?.id ?? ""
  );
  const [from, setFrom] = useState(shift ? timeInput(shift.startsAt) : "18:00");
  const [to, setTo] = useState(shift ? timeInput(shift.endsAt) : "23:00");
  const [note, setNote] = useState(shift?.note ?? "");
  const [busy, setBusy] = useState(false);

  const base = shift ? new Date(shift.startsAt) : day;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const startsAt = isoAt(base, from);
      let endsAt = isoAt(base, to);
      if (new Date(endsAt) <= new Date(startsAt)) {
        const next = new Date(endsAt);
        next.setDate(next.getDate() + 1);
        endsAt = next.toISOString();
      }
      const input = { staffId, startsAt, endsAt, note: note.trim() || undefined };
      if (shift) await updateShift(shift.id, input);
      else await createShift(etablissementId, input);
      toast.success(shift ? "Créneau modifié." : "Créneau ajouté.");
      onSaved();
    } catch (error) {
      toast.error(
        describeError(error).message
      );
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!shift) return;
    setBusy(true);
    try {
      await deleteShift(shift.id);
      toast.success("Créneau supprimé.");
      onSaved();
    } catch (error) {
      toast.error(
        describeError(error).message
      );
      setBusy(false);
    }
  };

  return (
    <Sheet
      title={shift ? "Modifier le créneau" : "Nouveau créneau"}
      onClose={onClose}
      footer={
        <>
          {shift && (
            <GlassButton variant="danger" onClick={() => void remove()} disabled={busy} className="mr-auto">
              Supprimer
            </GlassButton>
          )}
          {!staffId && <p role="status">Choisissez un membre pour enregistrer.</p>}
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="shift-form" disabled={busy || !staffId}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <form id="shift-form" onSubmit={save} className="flex flex-col gap-4">
        <p className="text-g-label capitalize text-muted">
          {base.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <Field label="Membre" required>
          <Select
            value={staffId}
            onChange={(event) => setStaffId(event.target.value)}
          >
            {staff.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Début" required>
            <Input
              type="time"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              required
              className="tabular-nums"
            />
          </Field>
          <Field label="Fin" required hint="Après minuit ⇒ le lendemain.">
            <Input
              type="time"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              required
              className="tabular-nums"
            />
          </Field>
        </div>
        <Field label="Note" hint="Visible par le membre concerné.">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={120}
          />
        </Field>
      </form>
    </Sheet>
  );
}
