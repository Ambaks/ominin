"use client";

import { ProjetFrame } from "@/components/admin/projet/frame";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/admin/format";
import type { ProjetData, ProjetPull } from "@/lib/admin/projet";

/*
 * Ce qui attend d'être relu avant de partir en production : chaque PR avec
 * son état de relecture, ses vérifications et les issues qu'elle fermera.
 */

function Badge({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    ok: "border-status-signed/40 bg-status-signed/10 text-status-signed",
    warn: "border-ember-1/40 bg-ember-1/10 text-ember-1",
    bad: "border-ember-3/40 bg-ember-3/10 text-ember-3",
    muted: "border-hairline text-muted",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function reviewBadge(pull: ProjetPull) {
  if (pull.draft) return <Badge tone="muted">Brouillon</Badge>;
  if (pull.review === "APPROVED") return <Badge tone="ok">Approuvée</Badge>;
  if (pull.review === "CHANGES_REQUESTED") {
    return <Badge tone="bad">Changements demandés</Badge>;
  }
  return <Badge tone="warn">À relire</Badge>;
}

function checksBadge(pull: ProjetPull) {
  if (pull.checks === "SUCCESS") return <Badge tone="ok">Vérifs OK</Badge>;
  if (pull.checks === "FAILURE" || pull.checks === "ERROR") {
    return <Badge tone="bad">Vérifs en échec</Badge>;
  }
  if (pull.checks === "PENDING" || pull.checks === "EXPECTED") {
    return <Badge tone="muted">Vérifs en cours</Badge>;
  }
  return null;
}

function Pulls({ data }: { data: ProjetData }) {
  if (data.pulls.length === 0) {
    return (
      <EmptyState
        title="Aucune pull request ouverte"
        body="Chaque changement passe par une branche et une PR qui cite son issue (« Closes #12 »)."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {data.pulls.map((pull) => (
        <li
          key={pull.number}
          className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface px-4 py-3.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <a
              href={pull.url}
              target="_blank"
              rel="noopener"
              className="min-w-0 flex-1 text-sm font-medium transition-colors hover:text-ember-1"
            >
              <span className="text-faint">#{pull.number} </span>
              {pull.title}
            </a>
            <div className="flex flex-wrap gap-1.5">
              {reviewBadge(pull)}
              {checksBadge(pull)}
              {pull.conflict && <Badge tone="bad">Conflit</Badge>}
            </div>
          </div>
          <p className="truncate text-xs text-faint">
            {pull.author ?? "?"} · {pull.branch} ·{" "}
            {formatRelative(pull.updatedAt)}
            {pull.closes.length > 0 &&
              ` · ferme ${pull.closes.map((number) => `#${number}`).join(", ")}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function PullRequestsPage() {
  return (
    <ProjetFrame title="Pull requests" githubPath="pulls">
      {(data) => <Pulls data={data} />}
    </ProjetFrame>
  );
}
