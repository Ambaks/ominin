"use client";

import {
  STAGE_ORDER,
  STAGE_LABELS,
  type PipelineStage,
} from "@/lib/clip/vod/constants";
import type { ClipperJob } from "@/lib/clip/vod/types";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
  return `${m} min`;
}

export function JobProgress({ job }: { job: ClipperJob }) {
  const currentIndex = job.currentStage
    ? STAGE_ORDER.indexOf(job.currentStage as PipelineStage)
    : -1;

  return (
    <div className="flex flex-col gap-5">
      {job.sourceTitle && (
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-background p-4">
          <span className="text-sm font-medium">{job.sourceTitle}</span>
          {job.sourceDurationS != null && (
            <span className="text-xs text-faint">
              {formatDuration(job.sourceDurationS)}
            </span>
          )}
        </div>
      )}

      <ol className="flex flex-col gap-1.5">
        {STAGE_ORDER.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = currentIndex > index;
          const isPending = currentIndex < index;
          const isWaiting = currentIndex === -1;

          return (
            <li key={stage} className="flex items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center">
                {isCompleted ? (
                  <CheckIcon />
                ) : isCurrent ? (
                  <span className="size-2 animate-pulse rounded-full bg-ember-2" />
                ) : (
                  <span
                    className={`size-1.5 rounded-full ${isWaiting && index === 0 ? "animate-pulse bg-ember-2/50" : "bg-foreground/15"}`}
                  />
                )}
              </span>
              <span
                className={`text-sm ${
                  isCompleted
                    ? "text-foreground"
                    : isCurrent
                      ? "font-medium text-foreground"
                      : isPending || isWaiting
                        ? "text-faint"
                        : ""
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
              {isCurrent && job.stageProgress > 0 && (
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="ember-gradient h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.round(job.stageProgress * 100)}%`,
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 text-ember-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}
