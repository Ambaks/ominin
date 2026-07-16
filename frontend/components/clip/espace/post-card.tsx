"use client";

import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/clip/constants";
import type { ClipPost, ClipPostStatus } from "@/lib/clip/types";
import { PlatformBadge } from "./platform-badge";

const STATUS_CLASSES: Record<ClipPostStatus, string> = {
  en_cours: "animate-pulse border-ember-2/40 bg-ember-2/10 text-ember-2",
  publie: "border-ember-1/40 bg-ember-1/10 text-ember-1",
  partiel: "border-ember-2/40 bg-ember-2/10 text-ember-2",
  echec: "border-ember-3/40 bg-ember-3/10 text-ember-3",
};

function StatusPill({ status }: { status: ClipPostStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PostCard({
  post,
  onRetry,
  retrying,
  style,
}: {
  post: ClipPost;
  onRetry: (id: string) => void;
  retrying: boolean;
  /** Délai d'entrée en cascade, posé par la liste (animationDelay). */
  style?: React.CSSProperties;
}) {
  const date = new Date(post.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const failures = post.results.filter((result) => !result.success);
  const canRetry =
    (post.status === "echec" || post.status === "partiel") &&
    post.storagePath != null;

  return (
    <article
      style={style}
      className="rise flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-medium">
            {post.title}
          </h2>
          <p className="mt-0.5 text-xs text-faint">{date}</p>
        </div>
        <StatusPill status={post.status} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {post.platforms.map((platform) => (
          <PlatformBadge key={platform} platform={platform} />
        ))}
      </div>

      {failures.length > 0 && post.status !== "en_cours" && (
        <ul className="flex flex-col gap-1 text-xs text-muted">
          {failures.map((result) => (
            <li key={result.platform}>
              <span className="font-medium text-foreground">
                {PLATFORM_LABELS[result.platform]}
              </span>{" "}
              : {result.message || "publication refusée"}
            </li>
          ))}
        </ul>
      )}

      {canRetry && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={retrying}
            onClick={() => onRetry(post.id)}
            className="ember-gradient rounded-full px-4 py-2 text-xs font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {retrying ? "Relance…" : "Réessayer"}
          </button>
          {post.status === "partiel" && (
            <p className="text-xs text-faint">
              Relance toutes les plateformes — celle déjà publiée peut recevoir
              un doublon.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
