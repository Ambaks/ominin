"use client";

import { JOB_STATUS_LABELS } from "@/lib/clip/vod/constants";
import type { ClipperJob, ClipperJobStatus } from "@/lib/clip/vod/types";

const STATUS_DOT: Record<ClipperJobStatus, string> = {
  en_attente: "bg-ember-2/50",
  en_cours: "animate-pulse bg-ember-2",
  termine: "bg-ember-1",
  echec: "bg-ember-3",
};

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function JobHistory({
  jobs,
  onSelect,
}: {
  jobs: ClipperJob[];
  onSelect: (job: ClipperJob) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold">Analyses récentes</h2>
      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelect(job)}
              className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-ember-2/40"
            >
              <span
                className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[job.status]}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {job.sourceTitle ?? job.sourceUrl}
                </span>
                <span className="mt-0.5 block text-xs text-faint">
                  {DATE_FORMAT.format(new Date(job.createdAt))}
                  {" · "}
                  {job.status === "termine"
                    ? `${job.clipCount} clip${job.clipCount !== 1 ? "s" : ""}`
                    : JOB_STATUS_LABELS[job.status]}
                </span>
              </span>
              <ChevronIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 text-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}
