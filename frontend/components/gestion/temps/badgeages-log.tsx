"use client";

import { useState } from "react";
import { ConfirmSheet, EmptyState, Field, GlassButton, Input, Plate, Sheet } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { formatTime } from "@/lib/gestion/format";
import {
  correctEntry,
  deleteEntry,
  entriesOf,
  formatDuration,
  minutesBetween,
  plannedMinutes,
  sameDay,
  shiftsOf,
  weekDays,
  workedMinutes,
  type Shift,
  type TimeEntry,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { SignatureThumb } from "./signature-pad";

/*
 * Les badgeages de la semaine, tels que le gérant doit pouvoir les relire :
 * jour par jour, avec les signatures, et corrigeables — un départ oublié se
 * répare ici, jamais en silence (la ligne garde la trace de la correction).
 */

/** Saisie « datetime-local » à partir d'un instant, en heure locale. */
function localInput(iso: string): string {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function CorrectionModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: TimeEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [from, setFrom] = useState(localInput(entry.startedAt));
  const [to, setTo] = useState(
    entry.endedAt ? localInput(entry.endedAt) : ""
  );
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await correctEntry(
        entry.id,
        new Date(from).toISOString(),
        to ? new Date(to).toISOString() : null
      );
      toast.success("Pointage corrigé.");
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
      title={`Corriger — ${entry.memberName}`}
      onClose={onClose}
      footer={
        <>
          <GlassButton onClick={onClose}>Annuler</GlassButton>
          <GlassButton variant="primary" type="submit" form="correction-form" disabled={busy}>
            Enregistrer
          </GlassButton>
        </>
      }
    >
      <form id="correction-form" onSubmit={save} className="flex flex-col gap-4">
        <p className="text-g-label text-muted">
          Les signatures restent celles du pointage : la correction est
          enregistrée à votre nom, à côté d&rsquo;elles.
        </p>
        <Field label="Arrivée" required>
          <Input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
            className="tabular-nums"
          />
        </Field>
        <Field label="Départ" hint="Vide : la personne est encore en service.">
          <Input
            type="datetime-local"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className="tabular-nums"
          />
        </Field>
      </form>
    </Sheet>
  );
}

export function BadgeagesLog({
  staff,
  shifts,
  entries,
  start,
  onChange,
}: {
  staff: Staff[];
  shifts: Shift[];
  entries: TimeEntry[];
  start: Date;
  onChange: () => void;
}) {
  const toast = useToast();
  const [correcting, setCorrecting] = useState<TimeEntry | null>(null);
  const [removing, setRemoving] = useState<TimeEntry | null>(null);
  const now = new Date();
  const days = weekDays(start).filter((day) => day <= now || entries.some((e) => sameDay(e.startedAt, day)));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="font-display text-g-h2">Heures de la semaine</h3>
        <Plate className="divide-y divide-hairline px-4" aria-label="Heures badgées par membre">
          {staff.map((member) => {
            const worked = workedMinutes(entriesOf(entries, member.id), now);
            const planned = plannedMinutes(shiftsOf(shifts, member.id));
            return (
              <div
                key={member.id}
                className="flex min-h-g-control items-center justify-between gap-4 py-2.5"
              >
                <p className="truncate text-g-label font-semibold">{member.name}</p>
                <p className="shrink-0 text-g-label tabular-nums">
                  <span className="font-semibold text-ember-1">{worked ? formatDuration(worked) : "—"}</span>
                  <span className="text-muted">
                    {" "}
                    / {planned ? formatDuration(planned) : "sans planning"}
                  </span>
                </p>
              </div>
            );
          })}
          {staff.length === 0 && (
            <p className="py-3 text-g-label text-muted">Aucun membre.</p>
          )}
        </Plate>
      </section>

      {days.map((day) => {
        const dayEntries = entries.filter((entry) =>
          sameDay(entry.startedAt, day)
        );
        if (dayEntries.length === 0) return null;
        return (
          <section key={day.toDateString()} className="flex flex-col gap-2.5">
            <h3 className="text-g-body font-semibold capitalize">
              {day.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <Plate className="divide-y divide-hairline px-4">
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-g-label font-semibold">{entry.memberName}</p>
                    <p className="text-g-meta tabular-nums text-muted">
                      {formatTime(entry.startedAt)} –{" "}
                      {entry.endedAt ? formatTime(entry.endedAt) : "en cours"}
                      {" · "}
                      {formatDuration(
                        minutesBetween(
                          entry.startedAt,
                          entry.endedAt ?? now.toISOString()
                        )
                      )}
                      {entry.editedAt && " · corrigé"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SignatureThumb
                      signature={entry.signatureIn}
                      label={`Signature d'arrivée de ${entry.memberName}`}
                    />
                    {entry.signatureOut && (
                      <SignatureThumb
                        signature={entry.signatureOut}
                        label={`Signature de départ de ${entry.memberName}`}
                      />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <GlassButton onClick={() => setCorrecting(entry)}>Corriger</GlassButton>
                    <GlassButton variant="danger" onClick={() => setRemoving(entry)}>
                      Supprimer
                    </GlassButton>
                  </div>
                </div>
              ))}
            </Plate>
          </section>
        );
      })}

      {entries.length === 0 && (
        <EmptyState text="Aucun pointage cette semaine. L'équipe pointe depuis l'onglet Pointage, ou ci-dessus." />
      )}

      {correcting && (
        <CorrectionModal
          entry={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={() => {
            setCorrecting(null);
            onChange();
          }}
        />
      )}
      {removing && (
        <ConfirmSheet
          title="Supprimer ce pointage ?"
          text={`Le pointage de ${removing.memberName} et sa signature seront effacés définitivement.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            const entry = removing;
            setRemoving(null);
            try {
              await deleteEntry(entry.id);
              toast.success("Pointage supprimé.");
              onChange();
            } catch (error) {
              toast.error(
                describeError(error).message
              );
            }
          }}
        />
      )}
    </div>
  );
}
