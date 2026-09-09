"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { formatTime } from "@/lib/gestion/format";
import {
  clockIn,
  clockOut,
  formatDuration,
  minutesBetween,
  openEntry,
  type TimeEntry,
} from "@/lib/gestion/temps";
import type { Staff } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { SignaturePad } from "./signature-pad";

/*
 * La badgeuse du comptoir : deux gestes, arrivée et départ. Chacun se
 * désigne dans l'équipe puis signe — c'est la signature, figée avec le nom et
 * l'heure, qui fait la preuve du temps de travail. L'écran est partagé et ne
 * suppose donc pas que celui qui badge est celui qui a ouvert la session : la
 * tablette du restaurant est connectée une fois pour toutes.
 */

type Action = "in" | "out";

const ACTION_LABELS: Record<Action, string> = {
  in: "Arrivée",
  out: "Départ",
};

export function Badgeuse({
  etablissementId,
  staff,
  entries,
  onChange,
}: {
  etablissementId: string;
  /** Équipe active : les fiches, avec ou sans compte. */
  staff: Staff[];
  /** Périodes de travail ouvertes, quelle que soit leur date. */
  entries: TimeEntry[];
  onChange: () => void;
}) {
  const toast = useToast();
  const now = useNow(SERVICE_CLOCK_TICK_MS);
  const [action, setAction] = useState<Action | null>(null);
  const [chosen, setChosen] = useState<Staff | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const present = staff.filter((s) => openEntry(entries, s.id));
  const absent = staff.filter((s) => !openEntry(entries, s.id));
  const eligible = action === "out" ? present : absent;

  const close = () => {
    setAction(null);
    setChosen(null);
    setSignature(null);
  };

  const submit = async () => {
    if (!chosen || !signature) return;
    setBusy(true);
    try {
      if (action === "in") {
        await clockIn(etablissementId, chosen, signature);
        toast.success(`Arrivée de ${chosen.name} enregistrée.`);
      } else {
        const open = openEntry(entries, chosen.id);
        if (!open) throw new Error("Aucune arrivée à clôturer.");
        await clockOut(open.id, signature);
        toast.success(
          `Départ de ${chosen.name} — ${formatDuration(
            minutesBetween(open.startedAt, new Date().toISOString())
          )} de service.`
        );
      }
      close();
      onChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="rise relative overflow-hidden rounded-3xl border border-hairline bg-surface">
        <div className="ember-flow h-1 w-full" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]">
              Badgeuse
            </p>
            <p className="mt-1 text-sm text-muted">
              {present.length > 0
                ? `${present.length} personne${present.length > 1 ? "s" : ""} en service`
                : "Personne en service"}
            </p>
          </div>
          <p className="font-display text-3xl tabular-nums lg:text-4xl">
            {now.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setAction("in")}
          disabled={absent.length === 0}
          className="ember-gradient rounded-2xl px-6 py-6 font-display text-xl font-medium text-background transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
        >
          Arrivée
        </button>
        <button
          type="button"
          onClick={() => setAction("out")}
          disabled={present.length === 0}
          className="rounded-2xl border border-hairline bg-surface px-6 py-6 font-display text-xl font-medium transition-colors hover:border-ember-2/40 disabled:opacity-40"
        >
          Départ
        </button>
      </div>

      {staff.length === 0 && (
        <p className="text-sm text-muted">
          Aucun serveur dans l&rsquo;équipe. Le gérant les ajoute depuis
          Équipe, onglet Planning.
        </p>
      )}

      {present.length > 0 && (
        <ul className="flex flex-col rounded-2xl border border-hairline bg-surface">
          {present.map((member, index) => {
            const open = openEntry(entries, member.id)!;
            return (
              <li
                key={member.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-faint">
                    Depuis {formatTime(open.startedAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums text-ember-1">
                  {formatDuration(
                    minutesBetween(open.startedAt, now.toISOString())
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {action && !chosen && (
        <Modal title={`${ACTION_LABELS[action]} — qui êtes-vous ?`} onClose={close}>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted">
              {action === "in"
                ? "Toute l'équipe a déjà badgé son arrivée."
                : "Personne n'est en service."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {eligible.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => setChosen(member)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3.5 text-left transition-colors hover:border-ember-2/40"
                  >
                    <span className="truncate text-sm font-medium">
                      {member.name}
                    </span>
                    {action === "out" && (
                      <span className="shrink-0 text-xs tabular-nums text-faint">
                        Depuis {formatTime(openEntry(entries, member.id)!.startedAt)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {action && chosen && (
        <Modal
          title={`${ACTION_LABELS[action]} de ${chosen.name}`}
          onClose={close}
          footer={
            <>
              <button
                type="button"
                onClick={() => {
                  setChosen(null);
                  setSignature(null);
                }}
                className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold transition-colors hover:border-ember-2/40"
              >
                Retour
              </button>
              <button
                type="button"
                disabled={!signature || busy}
                onClick={() => void submit()}
                className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background disabled:opacity-40"
              >
                Valider
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {ACTION_LABELS[action]} à{" "}
              <span className="tabular-nums text-foreground">
                {now.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              . Signez pour confirmer.
            </p>
            <SignaturePad onChange={setSignature} />
          </div>
        </Modal>
      )}
    </section>
  );
}
