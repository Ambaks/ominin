"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CLASSIFICATION_LABELS,
  DISQUALIFY_REASON_LABELS,
  OUTREACH_JOB_LABELS,
  OUTREACH_STATUS_LABELS,
  QUALIFICATION_LABELS,
} from "@/lib/admin/constants";
import { formatDayTime, formatRelative } from "@/lib/admin/format";
import {
  CLASSIFICATION_BADGE_CLASSES,
  QUALIFICATION_BADGE_CLASSES,
} from "@/lib/admin/status";
import { refreshPendingDrafts, useAdmin } from "@/lib/admin/store";
import type {
  OutreachEmail,
  OutreachProspect,
  OutreachRun,
} from "@/lib/admin/types";

/*
 * Boîte de prospection de l'agent « Léa ». Les brouillons approuvés ici ne
 * partent pas immédiatement : le run horaire /agent/inbox du backend envoie
 * tout ce qui est « approved » (latence ≤ 1 h, voulue — une réponse
 * instantanée ferait robot).
 */

type TabId = "pending" | "prospects" | "sent" | "received" | "runs";

export default function EmailsPage() {
  const state = useAdmin();
  const toast = useToast();
  const run = useRunMutation();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();

  const [tab, setTab] = useState<TabId>("pending");
  const [emails, setEmails] = useState<OutreachEmail[] | null>(null);
  const [prospects, setProspects] = useState<OutreachProspect[] | null>(null);
  const [runs, setRuns] = useState<OutreachRun[] | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { subject: string; bodyText: string }>
  >({});

  const reload = useCallback(() => {
    // Recale aussi le badge de nav (compteur store) sur la réalité.
    void refreshPendingDrafts();
    api
      .fetchOutreachEmails()
      .then(setEmails)
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Une erreur est survenue."
        )
      );
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (tab === "runs" && runs === null) {
      api
        .fetchOutreachRuns()
        .then(setRuns)
        .catch((error) =>
          toast.error(
            error instanceof Error ? error.message : "Une erreur est survenue."
          )
        );
    }
    if (tab === "prospects" && prospects === null) {
      api
        .fetchOutreachProspects()
        .then(setProspects)
        .catch((error) =>
          toast.error(
            error instanceof Error ? error.message : "Une erreur est survenue."
          )
        );
    }
  }, [tab, runs, prospects, toast]);

  const nameById = useMemo(
    () =>
      new Map(
        (state?.leads ?? []).map((lead) => [lead.restaurantId, lead.name])
      ),
    [state?.leads]
  );
  const byId = useMemo(
    () => new Map((emails ?? []).map((email) => [email.id, email])),
    [emails]
  );

  const all = emails ?? [];
  const pending = all.filter((e) => e.status === "pending_approval");
  const sent = all.filter(
    (e) => e.direction === "outbound" && e.status !== "pending_approval"
  );
  const received = all.filter((e) => e.direction === "inbound");

  const openLead = (restaurantId: string) =>
    router.push(`${basePath}${localPath}?lead=${restaurantId}`);

  const draftFor = (email: OutreachEmail) =>
    drafts[email.id] ?? {
      subject: email.subject ?? "",
      bodyText: email.bodyText ?? "",
    };

  const approve = (email: OutreachEmail) => {
    const edited = draftFor(email);
    const changed =
      edited.subject !== (email.subject ?? "") ||
      edited.bodyText !== (email.bodyText ?? "");
    void run(async () => {
      if (changed) await api.updateOutreachDraft(email.id, edited);
      await api.approveOutreachEmail(email.id);
      reload();
    }, "Brouillon approuvé — envoi au prochain passage de l'agent.");
  };

  const reject = (email: OutreachEmail) =>
    void run(async () => {
      await api.rejectOutreachEmail(email.id);
      reload();
    }, "Brouillon rejeté.");

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-medium">E-mails</h1>

      <PillTabs
        tabs={[
          { id: "pending", label: "À approuver", count: pending.length },
          { id: "prospects", label: "Prospection" },
          { id: "sent", label: "Envoyés", count: sent.length },
          { id: "received", label: "Reçus", count: received.length },
          { id: "runs", label: "Runs" },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as TabId)}
      />

      {tab === "pending" &&
        (pending.length === 0 ? (
          <EmptyState
            title="Rien à approuver"
            body="Quand un restaurateur répond, l'agent classe la réponse et prépare un brouillon qui apparaît ici."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((email) => {
              const inbound = email.inReplyTo
                ? (byId.get(email.inReplyTo) ?? null)
                : null;
              const edited = draftFor(email);
              return (
                <div
                  key={email.id}
                  className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLead(email.restaurantId)}
                      className="font-medium hover:underline"
                    >
                      {nameById.get(email.restaurantId) ?? email.toEmail}
                    </button>
                    {inbound?.classification && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[inbound.classification]}`}
                      >
                        {CLASSIFICATION_LABELS[inbound.classification]}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-faint">
                      {formatRelative(email.createdAt)}
                    </span>
                  </div>

                  {inbound && (
                    <blockquote className="whitespace-pre-wrap rounded-xl bg-surface-raised p-3 text-sm text-muted">
                      {inbound.bodyText}
                    </blockquote>
                  )}

                  <input
                    className={inputClass}
                    value={edited.subject}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [email.id]: { ...edited, subject: event.target.value },
                      }))
                    }
                  />
                  <textarea
                    className={`${inputClass} min-h-56 font-mono text-sm`}
                    value={edited.bodyText}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [email.id]: { ...edited, bodyText: event.target.value },
                      }))
                    }
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => reject(email)}
                      className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                    >
                      Rejeter
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(email)}
                      className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
                    >
                      Approuver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "prospects" &&
        (prospects === null || prospects.length === 0 ? (
          <EmptyState
            title={prospects === null ? "Chargement…" : "Aucun prospect"}
            body="Les restaurants découverts par l'agent et leur verdict de qualification apparaissent ici après chaque run de découverte."
          />
        ) : (
          <ProspectsPanel
            prospects={prospects}
            nameById={nameById}
            onOpen={openLead}
          />
        ))}

      {tab === "sent" &&
        (sent.length === 0 ? (
          <EmptyState
            title="Aucun e-mail envoyé"
            body="Les e-mails de prospection de l'agent apparaîtront ici après le premier run."
          />
        ) : (
          <EmailTable
            emails={sent}
            nameById={nameById}
            onOpen={openLead}
            dateOf={(email) => email.sentAt ?? email.createdAt}
          />
        ))}

      {tab === "received" &&
        (received.length === 0 ? (
          <EmptyState
            title="Aucune réponse reçue"
            body="Les réponses des restaurateurs, classées par l'agent, apparaîtront ici."
          />
        ) : (
          <EmailTable
            emails={received}
            nameById={nameById}
            onOpen={openLead}
            dateOf={(email) => email.receivedAt ?? email.createdAt}
          />
        ))}

      {tab === "runs" && (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full min-w-125 text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((row) => (
                <tr key={row.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-medium">
                    {OUTREACH_JOB_LABELS[row.job] ?? row.job}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      row.status === "failed"
                        ? "font-semibold text-status-lost"
                        : "text-muted"
                    }`}
                  >
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDayTime(row.startedAt)}
                  </td>
                  <td className="max-w-90 truncate px-4 py-3 text-xs text-faint">
                    {row.error ?? JSON.stringify(row.stats)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProspectsPanel({
  prospects,
  nameById,
  onOpen,
}: {
  prospects: OutreachProspect[];
  nameById: Map<string, string>;
  onOpen: (restaurantId: string) => void;
}) {
  const counts = {
    qualified: prospects.filter((p) => p.qualification === "qualified").length,
    pending: prospects.filter((p) => p.qualification === "pending").length,
    no_email: prospects.filter((p) => p.disqualifyReason === "no_email").length,
    has_digital_menu: prospects.filter(
      (p) => p.disqualifyReason === "has_digital_menu"
    ).length,
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Qualifiés", counts.qualified],
            ["Pas d'e-mail trouvé", counts.no_email],
            ["Déjà digitalisés", counts.has_digital_menu],
            ["En attente", counts.pending],
          ] as const
        ).map(([label, count]) => (
          <div
            key={label}
            className="rounded-2xl border border-hairline bg-surface p-4"
          >
            <p className="text-2xl font-semibold tabular-nums">{count}</p>
            <p className="text-xs text-faint">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-125 text-left text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-faint">
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Verdict</th>
              <th className="px-4 py-3">Notes de l&apos;agent</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr
                key={prospect.restaurantId}
                onClick={() => onOpen(prospect.restaurantId)}
                className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-raised"
              >
                <td className="px-4 py-3 font-medium">
                  {nameById.get(prospect.restaurantId) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${QUALIFICATION_BADGE_CLASSES[prospect.qualification]}`}
                  >
                    {prospect.disqualifyReason
                      ? (DISQUALIFY_REASON_LABELS[prospect.disqualifyReason] ??
                        prospect.disqualifyReason)
                      : QUALIFICATION_LABELS[prospect.qualification]}
                  </span>
                </td>
                <td className="max-w-120 px-4 py-3 text-xs text-muted">
                  <span className="line-clamp-2">{prospect.aiNotes ?? "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailTable({
  emails,
  nameById,
  onOpen,
  dateOf,
}: {
  emails: OutreachEmail[];
  nameById: Map<string, string>;
  onOpen: (restaurantId: string) => void;
  dateOf: (email: OutreachEmail) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
      <table className="w-full min-w-125 text-left text-sm">
        <thead>
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            <th className="px-4 py-3">Restaurant</th>
            <th className="px-4 py-3">Objet</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => onOpen(email.restaurantId)}
              className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-raised"
            >
              <td className="px-4 py-3 font-medium">
                {nameById.get(email.restaurantId) ??
                  email.toEmail ??
                  email.fromEmail}
              </td>
              <td className="max-w-90 truncate px-4 py-3 text-muted">
                {email.subject ?? "—"}
              </td>
              <td className="px-4 py-3">
                {email.direction === "inbound" && email.classification ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[email.classification]}`}
                  >
                    {CLASSIFICATION_LABELS[email.classification]}
                  </span>
                ) : (
                  <span
                    className={
                      email.status === "failed"
                        ? "font-semibold text-status-lost"
                        : "text-muted"
                    }
                  >
                    {OUTREACH_STATUS_LABELS[email.status]}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {formatRelative(dateOf(email))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
