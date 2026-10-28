"use client";

import { useState } from "react";
import { useRunMutation } from "@/components/ui/toast";
import {
  ASSIGNEE_LABELS,
  ASSIGNEES,
  deleteStep,
  isAssignee,
  isOverdue,
  NEXT_STATUS,
  ownersOf,
  STATUS_LABELS,
  todayValue,
  updateStep,
  type Step,
  type StepStatus,
} from "@/lib/admin/projet";

/** Pastille d'état, à la manière des étapes d'un workflow GitHub. */
export function StatusDot({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-status-signed" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="m6 10.5 2.5 2.5L14 7.5" fill="none" stroke="var(--background)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "doing") {
    return (
      <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-ember-2" aria-hidden>
        <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
        <path d="M10 1.5a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" fill="currentColor" />
      </svg>
    );
  }
  if (status === "blocked") {
    return (
      <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-status-lost" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M10 5.5v5.5M10 14v.5" stroke="var(--background)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-faint" aria-hidden>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** « auj. », sinon « 28 oct. » : le jour d'une échéance. */
function dueLabel(dueOn: string): string {
  if (dueOn === todayValue()) return "auj.";
  return new Date(`${dueOn}T12:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

const ACTION =
  "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground";
const FIELD =
  "w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-base focus:border-ember-2/50 focus:outline-none sm:text-sm";

/**
 * Une étape. La pastille la fait avancer (à faire → en cours → fait), les
 * initiales changent le responsable ; un tap sur le titre ouvre ce qu'il faut
 * faire, et les gestes plus rares (bloquer, modifier, supprimer) — au doigt
 * comme à la souris.
 */
export function StepRow({ step }: { step: Step }) {
  const run = useRunMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const { status } = step;
  const owner = isAssignee(step.owner) ? step.owner : null;
  // Sans responsable → Marwan → Ambaka → les deux → sans responsable.
  const nextOwner = ASSIGNEES[owner ? ASSIGNEES.indexOf(owner) + 1 : 0] ?? null;
  const ownerLabel = owner ? ASSIGNEE_LABELS[owner] : "Sans responsable";
  const overdue = isOverdue(step);

  return (
    <li className="py-2">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => void run(() => updateStep(step.id, { status: NEXT_STATUS[status] }))}
          title={`${STATUS_LABELS[status]} — toucher pour passer à « ${STATUS_LABELS[NEXT_STATUS[status]]} »`}
          aria-label={`${STATUS_LABELS[status]}, passer à ${STATUS_LABELS[NEXT_STATUS[status]]}`}
          className="mt-px"
        >
          <StatusDot status={status} />
        </button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`min-w-0 flex-1 text-left text-sm ${
            status === "done" ? "text-faint line-through" : ""
          }`}
        >
          {step.title}
          <span className="ml-1.5 text-xs text-faint no-underline">{open ? "▴" : "▾"}</span>
        </button>
        {step.due_on && status !== "done" && (
          <span
            title={overdue ? "Échéance dépassée" : "Échéance"}
            className={`mt-0.5 shrink-0 text-xs ${overdue ? "font-semibold text-ember-3" : "text-faint"}`}
          >
            {dueLabel(step.due_on)}
          </span>
        )}
        <button
          type="button"
          onClick={() => void run(() => updateStep(step.id, { owner: nextOwner }))}
          title={ownerLabel}
          aria-label="Changer de responsable"
          className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
            owner ? "border-ember-2/40 text-ember-1" : "border-dashed border-hairline text-faint"
          }`}
        >
          {owner ? ownersOf(owner).map((who) => who[0].toUpperCase()).join("") : "?"}
        </button>
      </div>

      {open && (
        <div className="ml-7.5 mt-2 flex flex-col gap-3 rounded-xl bg-surface-raised p-3">
          {editing ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const fields = event.currentTarget.elements;
                const title = (fields.namedItem("title") as HTMLInputElement).value.trim();
                const detail = (fields.namedItem("detail") as HTMLTextAreaElement).value.trim();
                if (!title) return;
                setEditing(false);
                if (title !== step.title || detail !== step.detail) {
                  void run(() => updateStep(step.id, { title, detail }), "Étape modifiée");
                }
              }}
            >
              <input
                name="title"
                autoFocus
                required
                defaultValue={step.title}
                className={FIELD}
              />
              <textarea
                name="detail"
                defaultValue={step.detail}
                rows={4}
                placeholder="Ce qu'il faut faire, concrètement, et quand c'est fini."
                className={FIELD}
              />
              <div className="flex gap-2">
                <button type="submit" className={ACTION}>
                  Enregistrer
                </button>
                <button type="button" onClick={() => setEditing(false)} className={ACTION}>
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <p className="whitespace-pre-line text-sm text-muted">
              {step.detail || "Pas encore de description."}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-faint">
              {STATUS_LABELS[status]} · {ownerLabel}
            </span>
            <label className="mr-auto flex items-center gap-1.5 text-xs text-faint">
              Échéance
              <input
                type="date"
                value={step.due_on ?? ""}
                onChange={(event) =>
                  void run(() => updateStep(step.id, { due_on: event.target.value || null }))
                }
                className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-foreground focus:border-ember-2/50 focus:outline-none"
              />
            </label>
            <button type="button" onClick={() => setEditing(true)} className={ACTION}>
              Modifier
            </button>
            <button
              type="button"
              onClick={() => {
                if (status === "blocked") {
                  void run(() => updateStep(step.id, { status: "todo" }));
                  return;
                }
                const reason = window.prompt("Pourquoi c'est bloqué ? (facultatif)");
                if (reason === null) return;
                void run(() => updateStep(step.id, { status: "blocked" }, reason.trim() || undefined));
              }}
              className={ACTION}
            >
              {status === "blocked" ? "Débloquer" : "Bloquer"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Supprimer cette étape ?")) {
                  void run(() => deleteStep(step.id), "Étape supprimée");
                }
              }}
              className={`${ACTION} hover:text-status-lost`}
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Champ d'ajout d'une étape, validé par Entrée : pas d'étape sans échéance. */
export function AddStep({ onAdd }: { onAdd: (title: string, dueOn: string) => Promise<void> }) {
  const run = useRunMutation();
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = event.currentTarget.elements;
        const input = fields.namedItem("title") as HTMLInputElement;
        const due = fields.namedItem("due") as HTMLInputElement;
        const title = input.value.trim();
        if (!title || !due.value) return;
        void run(async () => {
          await onAdd(title, due.value);
          input.value = "";
        });
      }}
    >
      <input
        name="title"
        placeholder="+ Ajouter une étape"
        className="min-w-0 flex-1 rounded-xl border border-dashed border-hairline bg-transparent px-3 py-2 text-base placeholder:text-faint focus:border-ember-2/50 focus:outline-none sm:text-sm"
      />
      <input
        name="due"
        type="date"
        required
        min={todayValue()}
        aria-label="Échéance"
        title="Échéance"
        className="shrink-0 rounded-xl border border-dashed border-hairline bg-transparent px-2 py-2 text-base text-muted focus:border-ember-2/50 focus:outline-none sm:text-sm"
      />
    </form>
  );
}

/** Barre d'avancement : part des étapes faites. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div
        className="ember-gradient h-full rounded-full"
        style={{ width: `${total ? (done / total) * 100 : 0}%` }}
      />
    </div>
  );
}
