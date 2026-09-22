"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useRunMutation } from "@/components/ui/toast";
import { CLASSIFICATION_LABELS } from "@/lib/admin/constants";
import { formatRelative } from "@/lib/admin/format";
import { CLASSIFICATION_BADGE_CLASSES } from "@/lib/admin/status";
import { approveDraft, fetchPendingDrafts, rejectDraft } from "@/lib/agents/api";
import { useAgents } from "@/lib/agents/context";
import type { PendingDraft } from "@/lib/agents/types";

/*
 * Brouillons qui attendent le client : premiers e-mails en mode validation,
 * réponses aux prospects dans tous les modes. Rien ne part d'ici : un
 * brouillon approuvé est envoyé au passage suivant de l'agent — dans le
 * créneau d'envoi pour un premier e-mail, dans l'heure pour une réponse.
 */

type Edits = { subject: string; body_text: string };

export default function AgentsValidationPage() {
  const { reload: reloadAgent } = useAgents();
  const run = useRunMutation();
  const [drafts, setDrafts] = useState<PendingDraft[] | null>(null);
  const [edits, setEdits] = useState<Record<string, Edits>>({});

  const reload = useCallback(() => {
    fetchPendingDrafts().then(setDrafts).catch(() => setDrafts([]));
    reloadAgent();
  }, [reloadAgent]);

  useEffect(() => {
    fetchPendingDrafts().then(setDrafts).catch(() => setDrafts([]));
  }, []);

  const editsFor = (draft: PendingDraft): Edits =>
    edits[draft.id] ?? { subject: draft.subject ?? "", body_text: draft.body_text ?? "" };

  const edit = (draft: PendingDraft, patch: Partial<Edits>) =>
    setEdits((current) => ({ ...current, [draft.id]: { ...editsFor(draft), ...patch } }));

  const approve = (draft: PendingDraft) =>
    void run(async () => {
      await approveDraft(draft.id, editsFor(draft));
      reload();
    }, "Approuvé — envoi au prochain passage de l'agent.");

  const reject = (draft: PendingDraft) =>
    void run(async () => {
      await rejectDraft(draft);
      reload();
    }, draft.kind === "cold" ? "Rejeté — cette entreprise ne sera pas contactée." : "Réponse rejetée.");

  const approveAll = () =>
    void run(async () => {
      for (const draft of drafts ?? []) await approveDraft(draft.id, editsFor(draft));
      reload();
    }, "Tout est approuvé — envoi aux prochains passages de l'agent.");

  if (drafts === null) return <div className="shimmer h-64 rounded-2xl" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">À valider</h1>
          <p className="mt-1 text-sm text-muted">
            Relisez, corrigez si besoin, puis approuvez. Rien ne part sans votre accord.
          </p>
        </div>
        {drafts.length > 1 && (
          <button
            type="button"
            onClick={approveAll}
            className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
          >
            Tout approuver ({drafts.length})
          </button>
        )}
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          title="Rien à valider"
          body="Les e-mails que l'agent prépare pour vous apparaissent ici : ses premiers messages en mode validation, et ses propositions de réponse quand un prospect vous écrit."
        />
      ) : (
        drafts.map((draft) => {
          const current = editsFor(draft);
          return (
            <article
              key={draft.id}
              className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4 lg:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{draft.prospect?.name ?? draft.to_email}</p>
                <span className="rounded-full border border-hairline px-2 py-0.5 text-[11px] font-semibold text-muted">
                  {draft.kind === "cold" ? "Premier e-mail" : "Réponse"}
                </span>
                {draft.inbound?.classification && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[draft.inbound.classification]}`}
                  >
                    {CLASSIFICATION_LABELS[draft.inbound.classification]}
                  </span>
                )}
                <span className="ml-auto text-xs text-faint">{formatRelative(draft.created_at)}</span>
              </div>
              <p className="text-xs text-muted">À : {draft.to_email}</p>

              {draft.inbound && (
                <blockquote className="whitespace-pre-wrap rounded-xl bg-surface-raised p-3 text-sm text-muted">
                  {draft.inbound.body_text}
                </blockquote>
              )}

              <input
                aria-label="Objet"
                className={inputClass}
                value={current.subject}
                onChange={(event) => edit(draft, { subject: event.target.value })}
              />
              <textarea
                aria-label="Message"
                className={`${inputClass} min-h-64 text-sm leading-relaxed`}
                value={current.body_text}
                onChange={(event) => edit(draft, { body_text: event.target.value })}
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => reject(draft)}
                  className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                >
                  Rejeter
                </button>
                <button
                  type="button"
                  onClick={() => approve(draft)}
                  className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
                >
                  Approuver
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
