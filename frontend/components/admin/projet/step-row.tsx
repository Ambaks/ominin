"use client";

import { useRunMutation } from "@/components/ui/toast";
import {
  deleteStep,
  NEXT_STATUS,
  OWNER_LABELS,
  OWNERS,
  STATUS_LABELS,
  updateStep,
  type Owner,
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

const HOVER_ACTION =
  "hidden shrink-0 rounded-full px-1.5 text-xs text-faint hover:text-foreground group-focus-within:block group-hover:block";

/**
 * Une étape. La pastille la fait avancer (à faire → en cours → fait), les
 * initiales changent le responsable ; bloquer et supprimer au survol.
 */
export function StepRow({ step }: { step: Step }) {
  const run = useRunMutation();
  const { status, owner } = step;
  // Sans responsable → Marwan → Ambaka → sans responsable.
  const nextOwner = OWNERS[OWNERS.indexOf(owner as Owner) + 1] ?? null;

  return (
    <li className="group flex items-start gap-2.5 py-2">
      <button
        type="button"
        onClick={() => void run(() => updateStep(step.id, { status: NEXT_STATUS[status] }))}
        title={`${STATUS_LABELS[status]} — cliquer pour passer à « ${STATUS_LABELS[NEXT_STATUS[status]]} »`}
        aria-label={`${STATUS_LABELS[status]}, passer à ${STATUS_LABELS[NEXT_STATUS[status]]}`}
        className="mt-px"
      >
        <StatusDot status={status} />
      </button>
      <p
        className={`min-w-0 flex-1 text-sm ${
          status === "done" ? "text-faint line-through" : ""
        }`}
      >
        {step.title}
      </p>
      <button
        type="button"
        onClick={() =>
          void run(() =>
            updateStep(step.id, { status: status === "blocked" ? "todo" : "blocked" }),
          )
        }
        className={HOVER_ACTION}
      >
        {status === "blocked" ? "Débloquer" : "Bloquer"}
      </button>
      <button
        type="button"
        onClick={() => void run(() => updateStep(step.id, { owner: nextOwner }))}
        title={owner ? OWNER_LABELS[owner as Owner] : "Sans responsable"}
        aria-label="Changer de responsable"
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
          owner ? "border-ember-2/40 text-ember-1" : "border-dashed border-hairline text-faint"
        }`}
      >
        {owner ? owner[0].toUpperCase() : "?"}
      </button>
      <button
        type="button"
        onClick={() => void run(() => deleteStep(step.id), "Étape supprimée")}
        aria-label="Supprimer l'étape"
        className={HOVER_ACTION}
      >
        ×
      </button>
    </li>
  );
}

/** Champ d'ajout d'une étape, validé par Entrée. */
export function AddStep({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const run = useRunMutation();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem("title") as HTMLInputElement;
        const title = input.value.trim();
        if (!title) return;
        void run(async () => {
          await onAdd(title);
          input.value = "";
        });
      }}
    >
      <input
        name="title"
        placeholder="+ Ajouter une étape"
        className="w-full rounded-xl border border-dashed border-hairline bg-transparent px-3 py-2 text-base placeholder:text-faint focus:border-ember-2/50 focus:outline-none sm:text-sm"
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
