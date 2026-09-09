"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
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
      toast.success("Badgeage corrigé.");
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Corriger — ${entry.memberName}`}
      onClose={onClose}
      footer={
        <button
          type="submit"
          form="correction-form"
          disabled={busy}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          Enregistrer
        </button>
      }
    >
      <form id="correction-form" onSubmit={save} className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted">
          Les signatures restent celles du badgeage : la correction est
          enregistrée à votre nom, à côté d&rsquo;elles.
        </p>
        <Field label="Arrivée" required>
          <input
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Départ" hint="Vide : la personne est encore en service.">
          <input
            type="datetime-local"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
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
        <h3 className="font-display text-lg font-medium">Heures de la semaine</h3>
        <div className="rounded-2xl border border-hairline bg-surface">
          {staff.map((member, index) => {
            const worked = workedMinutes(entriesOf(entries, member.id), now);
            const planned = plannedMinutes(shiftsOf(shifts, member.id));
            return (
              <div
                key={member.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <p className="truncate text-sm font-medium">
                  {member.name}
                </p>
                <p className="shrink-0 text-sm tabular-nums">
                  <span className="text-ember-1">{formatDuration(worked)}</span>
                  <span className="text-faint">
                    {" "}
                    / {planned ? formatDuration(planned) : "sans planning"}
                  </span>
                </p>
              </div>
            );
          })}
          {staff.length === 0 && (
            <p className="px-5 py-4 text-sm text-muted">Aucun membre.</p>
          )}
        </div>
      </section>

      {days.map((day) => {
        const dayEntries = entries.filter((entry) =>
          sameDay(entry.startedAt, day)
        );
        if (dayEntries.length === 0) return null;
        return (
          <section key={day.toDateString()} className="flex flex-col gap-2.5">
            <h3 className="font-display text-base font-medium capitalize">
              {day.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>
            <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
              {dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.memberName}
                    </p>
                    <p className="text-xs tabular-nums text-faint">
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
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCorrecting(entry)}
                      className="text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
                    >
                      Corriger
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoving(entry)}
                      className="text-xs font-semibold text-muted transition-colors hover:text-ember-3"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {entries.length === 0 && (
        <p className="text-sm text-muted">
          Aucun badgeage cette semaine. L&rsquo;équipe badge depuis
          l&rsquo;onglet Badgeage.
        </p>
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
        <ConfirmDialog
          title="Supprimer ce badgeage ?"
          message={`Le badgeage de ${removing.memberName} et sa signature seront effacés définitivement.`}
          confirmLabel="Supprimer"
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            const entry = removing;
            setRemoving(null);
            try {
              await deleteEntry(entry.id);
              toast.success("Badgeage supprimé.");
              onChange();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Une erreur est survenue."
              );
            }
          }}
        />
      )}
    </div>
  );
}
