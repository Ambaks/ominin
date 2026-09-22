"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { CLASSIFICATION_LABELS, OUTREACH_STATUS_LABELS } from "@/lib/admin/constants";
import { formatDayTime } from "@/lib/admin/format";
import { CLASSIFICATION_BADGE_CLASSES } from "@/lib/admin/status";
import { fetchEmails } from "@/lib/agents/api";
import type { AgentEmailRow } from "@/lib/agents/types";

type Tab = "sent" | "received";

function EmailItem({ email }: { email: AgentEmailRow }) {
  const date = email.sent_at ?? email.received_at ?? email.created_at;
  return (
    <details className="group rounded-xl border border-hairline bg-surface">
      <summary className="flex cursor-pointer items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {email.prospect?.name ?? email.to_email}
          </span>
          <span className="block truncate text-xs text-muted">{email.subject}</span>
        </span>
        {email.classification ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[email.classification]}`}
          >
            {CLASSIFICATION_LABELS[email.classification]}
          </span>
        ) : (
          email.direction === "outbound" && (
            <span
              className={`shrink-0 text-[11px] font-semibold ${email.status === "failed" ? "text-status-lost" : "text-faint"}`}
            >
              {OUTREACH_STATUS_LABELS[email.status]}
            </span>
          )
        )}
        <span className="hidden shrink-0 text-xs text-faint sm:inline">{formatDayTime(date)}</span>
      </summary>
      <div className="border-t border-hairline p-4">
        <p className="mb-2 text-xs text-faint">
          {email.direction === "outbound" ? `À : ${email.to_email}` : `De : ${email.from_email}`}
          {email.error && <span className="text-status-lost"> — {email.error}</span>}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{email.body_text}</p>
      </div>
    </details>
  );
}

export default function AgentsEmailsPage() {
  const [emails, setEmails] = useState<AgentEmailRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("sent");

  useEffect(() => {
    fetchEmails().then(setEmails).catch(() => setEmails([]));
  }, []);

  if (emails === null) return <div className="shimmer h-64 rounded-2xl" />;

  const sent = emails.filter((e) => e.direction === "outbound");
  const received = emails.filter((e) => e.direction === "inbound");
  const shown = tab === "sent" ? sent : received;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium">E-mails</h1>
        <p className="mt-1 text-sm text-muted">
          Les réponses arrivent aussi dans votre boîte Gmail, comme d&apos;habitude.
        </p>
      </div>
      <PillTabs
        tabs={[
          { id: "sent", label: "Envoyés", count: sent.length },
          { id: "received", label: "Réponses", count: received.length },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as Tab)}
      />
      {shown.length === 0 ? (
        <EmptyState
          title={tab === "sent" ? "Aucun e-mail envoyé" : "Aucune réponse pour l'instant"}
          body={
            tab === "sent"
              ? "Les e-mails partis de votre boîte apparaîtront ici."
              : "Quand un prospect répond, l'agent classe sa réponse et vous prépare un brouillon."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
}
