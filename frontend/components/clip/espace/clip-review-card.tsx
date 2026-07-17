"use client";

import { useState } from "react";
import type { ClipperClip } from "@/lib/clip/vod/types";

const SCORE_LABELS: Record<string, string> = {
  hook_strength: "Accroche",
  emotional_peak: "Émotion",
  self_contained: "Autonome",
  delivery: "Débit",
  payoff: "Chute",
  quotability: "Citabilité",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ClipReviewCard({
  clip,
  playbackUrl,
  onReview,
  onPublish,
  style,
}: {
  clip: ClipperClip;
  playbackUrl: string | undefined;
  onReview: (clipId: string, approved: boolean) => Promise<void>;
  onPublish: (clipId: string) => void;
  style?: React.CSSProperties;
}) {
  const [reviewing, setReviewing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleReview = async (approved: boolean) => {
    setReviewing(true);
    try {
      await onReview(clip.id, approved);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <article
      style={style}
      className="rise flex flex-col gap-4 overflow-hidden rounded-2xl border border-hairline bg-surface"
    >
      {playbackUrl ? (
        <div className="relative aspect-9/16 max-h-80 w-full bg-background">
          <video
            src={playbackUrl}
            controls
            preload="metadata"
            playsInline
            className="size-full object-contain"
          />
          <span className="absolute right-2 top-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur-sm">
            {formatDuration(clip.durationS)}
          </span>
        </div>
      ) : (
        <div className="flex aspect-9/16 max-h-80 w-full items-center justify-center bg-background">
          <span className="text-xs text-faint">Aperçu indisponible</span>
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 pb-5">
        <div className="flex items-start gap-2.5">
          <span className="ember-gradient flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-background">
            {clip.rank}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-medium leading-snug">
              {clip.title}
            </h3>
            {clip.clipType && (
              <span className="mt-0.5 inline-block rounded-full border border-hairline px-2 py-px text-[10px] font-medium text-muted">
                {clip.clipType}
              </span>
            )}
          </div>
        </div>

        {clip.riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {clip.riskFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-ember-3/30 bg-ember-3/10 px-2 py-px text-[10px] font-medium text-ember-3"
              >
                {flag}
              </span>
            ))}
          </div>
        )}

        {clip.judgeScores && (
          <div className="flex flex-col gap-1.5">
            {Object.entries(clip.judgeScores).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-muted">
                  {SCORE_LABELS[key] ?? key}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="ember-gradient h-full rounded-full"
                    style={{ width: `${(value / 10) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-[11px] font-medium tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}

        {clip.judgeReasoning && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-medium text-muted transition-colors hover:text-foreground"
            >
              {expanded ? "Masquer l'analyse" : "Voir l'analyse IA"}
            </button>
            {expanded && (
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {clip.judgeReasoning}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={reviewing}
            onClick={() => handleReview(true)}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
              clip.approved === true
                ? "border-ember-1/50 bg-ember-1/10 text-ember-1"
                : "border-hairline text-muted hover:border-ember-1/40 hover:text-foreground"
            }`}
          >
            Approuver
          </button>
          <button
            type="button"
            disabled={reviewing}
            onClick={() => handleReview(false)}
            className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
              clip.approved === false
                ? "border-ember-3/50 bg-ember-3/10 text-ember-3"
                : "border-hairline text-muted hover:border-ember-3/40 hover:text-foreground"
            }`}
          >
            Rejeter
          </button>
        </div>

        {clip.approved === true && (
          <button
            type="button"
            onClick={() => onPublish(clip.id)}
            className="ember-gradient rounded-full px-4 py-2.5 text-xs font-semibold text-background transition-transform active:scale-[0.98]"
          >
            Publier ce clip
          </button>
        )}
      </div>
    </article>
  );
}
