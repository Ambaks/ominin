"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { CheckIcon } from "@/components/gestion/icons";
import { CLASSIFICATION_LABELS, POSITIVE_CLASSIFICATIONS } from "@/lib/admin/constants";
import { formatRelative } from "@/lib/admin/format";
import { CLASSIFICATION_BADGE_CLASSES } from "@/lib/admin/status";
import { fetchEmails } from "@/lib/agents/api";
import { AGENT_STATUS_COPY, MODE_LABELS } from "@/lib/agents/constants";
import { useAgentsState } from "@/lib/agents/context";
import { agentStatus, isComplete, scheduleSummary } from "@/lib/agents/status";
import type { AgentEmailRow, AgentMode } from "@/lib/agents/types";

/** Compte rendu de découverte du dernier passage (services/agents/discovery.py). */
interface DiscoverStats {
  exhausted?: boolean;
  budget_exhausted?: boolean;
}

const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-faint";

export default function AgentsOverviewPage() {
  const { profile, mailbox, stats } = useAgentsState();
  const [replies, setReplies] = useState<AgentEmailRow[] | null>(null);

  useEffect(() => {
    fetchEmails()
      .then((emails) =>
        setReplies(
          emails.filter(
            (e) =>
              e.direction === "inbound" &&
              e.classification &&
              POSITIVE_CLASSIFICATIONS.includes(e.classification)
          )
        )
      )
      .catch(() => setReplies([]));
  }, []);

  const status = agentStatus(profile, mailbox);
  const discover = (profile.last_run_stats as { discover?: DiscoverStats } | null)?.discover;
  const discoveryNote = discover?.budget_exhausted
    ? "La recherche de nouvelles entreprises reprend le mois prochain."
    : discover?.exhausted
      ? "Vos cibles et vos villes ont donné tout ce qu'elles avaient : ajoutez-en dans les réglages pour trouver de nouvelles entreprises."
      : null;
  const copy = AGENT_STATUS_COPY[status];
  const running = status === "running";
  const steps = [
    { done: isComplete(profile), label: "Décrire votre activité, vos cibles et votre zone", href: "/espace/reglages" },
    { done: Boolean(mailbox && !mailbox.error), label: "Connecter votre boîte Gmail", href: "/espace/reglages#gmail" },
    { done: Boolean(profile.activated_at), label: "Activation par l'équipe Ominin", href: null },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-3xl border border-hairline bg-surface p-6 lg:p-8">
        <div
          className="agents-radar-motif absolute inset-0 [mask-image:radial-gradient(ellipse_80%_90%_at_50%_0%,black,transparent)]"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              {running && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-1 opacity-60" />
              )}
              <span
                className={`relative inline-flex size-2.5 rounded-full ${running ? "bg-ember-1" : "bg-faint"}`}
              />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
              {copy.label}
            </p>
          </div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">
            {profile.company_name || "Votre agent de prospection"}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">{copy.body}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-hairline bg-background/60 px-3 py-1 font-medium">
              Mode {MODE_LABELS[profile.mode as AgentMode].title.toLowerCase()}
            </span>
            <span className="rounded-full border border-hairline bg-background/60 px-3 py-1 text-muted">
              {scheduleSummary(profile)}
            </span>
            {mailbox && (
              <span className="rounded-full border border-hairline bg-background/60 px-3 py-1 text-muted">
                {mailbox.email}
              </span>
            )}
          </div>
          {running && discoveryNote && (
            <p className="rounded-xl border border-ember-2/30 bg-ember-2/5 px-3 py-2 text-sm">
              {discoveryNote}
            </p>
          )}
          {profile.last_run_at && (
            <p className="text-xs text-faint">
              Dernier passage {formatRelative(profile.last_run_at)}
              {profile.last_error && (
                <span className="text-ember-3"> — interrompu : {profile.last_error}</span>
              )}
            </p>
          )}
        </div>
      </section>

      {steps.some((step) => !step.done) && (
        <section className="flex flex-col gap-3">
          <p className={SECTION_TITLE}>Mise en route</p>
          <ol className="flex flex-col divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {steps.map((step, i) => {
              const body = (
                <>
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done ? "ember-gradient text-background" : "border border-hairline text-muted"
                    }`}
                  >
                    {step.done ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className={`text-sm ${step.done ? "text-muted line-through decoration-hairline" : "font-medium"}`}>
                    {step.label}
                  </span>
                </>
              );
              return (
                <li key={step.label}>
                  {step.href && !step.done ? (
                    <Link href={step.href} className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-raised">
                      {body}
                      <span className="ml-auto text-xs font-semibold text-ember-2">Faire</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-4">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="E-mails envoyés" value={String(stats.sent)} href="/espace/emails" />
        <StatCard label="Réponses" value={String(stats.replies)} href="/espace/emails" />
        <StatCard label="Intéressés" value={String(stats.interested)} href="/espace/prospects" />
        <StatCard
          label="À valider"
          value={String(stats.pending)}
          href="/espace/validation"
          alert={stats.pending > 0}
        />
      </section>

      {replies && replies.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className={SECTION_TITLE}>Réponses positives récentes</p>
          <div className="flex flex-col gap-2">
            {replies.slice(0, 5).map((email) => (
              <Link
                key={email.id}
                href="/espace/emails"
                className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 transition-colors hover:bg-surface-raised"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {email.prospect?.name ?? email.from_email}
                  </span>
                  <span className="block truncate text-xs text-muted">{email.body_text}</span>
                </span>
                {email.classification && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[email.classification]}`}
                  >
                    {CLASSIFICATION_LABELS[email.classification]}
                  </span>
                )}
                <span className="hidden shrink-0 text-xs text-faint sm:inline">
                  {formatRelative(email.received_at ?? email.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
