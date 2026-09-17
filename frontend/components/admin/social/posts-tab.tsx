"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDay } from "@/lib/admin/format";
import type { SocialPost, SocialPublication } from "@/lib/admin/social";
import { BRAND_BY_ID, PLATFORMS, slideUrl } from "@/lib/social/brands";
import { SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

const STATUS: Record<SocialPublication["status"], { label: string; tone: string }> =
  {
    published: { label: "Publié", tone: "text-status-signed" },
    posted: { label: "Posté", tone: "text-status-signed" },
    to_post: { label: "À poster", tone: "text-ember-2" },
    failed: { label: "Échec", tone: "text-status-lost" },
  };

/* Libellés des chiffres renvoyés par Meta (et des vues Snapchat saisies). */
const METRIC_LABELS: Record<string, string> = {
  reach: "portée",
  views: "vues",
  likes: "j'aime",
  comments: "commentaires",
  saved: "enregistrements",
  shares: "partages",
  reactions: "réactions",
  post_media_view: "vues",
  post_total_media_view_unique: "portée",
};

export function PostsTab({ posts }: { posts: SocialPost[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Aucune publication"
        body="L'agent rédige et publie un carrousel par jour pour chaque marque qui a au moins un compte relié. Le premier apparaîtra ici après son prochain passage."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => {
        const open = expanded === post.id;
        return (
          <div
            key={post.id}
            className="rounded-2xl border border-hairline bg-surface"
          >
            <div className="flex gap-4 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- JPEG rendu par /api/social/slides, déjà à la bonne taille */}
              <img
                src={slideUrl(post.id, 1)}
                alt=""
                loading="lazy"
                className="aspect-4/5 w-20 shrink-0 rounded-lg border border-hairline object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-xs text-faint">
                  {formatDay(post.postDate)} · {BRAND_BY_ID.get(post.brand)?.name}{" "}
                  · ligne v{post.playbookVersion}
                </p>
                <p className="font-medium">{post.topic}</p>
                <p className="text-sm text-muted">{post.angle}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {post.publications.map((publication) => (
                    <PublicationLine
                      key={publication.id}
                      publication={publication}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : post.id)}
                className={`${SECONDARY_BUTTON} h-fit shrink-0`}
              >
                {open ? "Masquer" : "Voir"}
              </button>
            </div>

            {open && (
              <div className="flex flex-col gap-4 border-t border-hairline p-4">
                <div className="no-scrollbar flex gap-3 overflow-x-auto">
                  {post.slides.map((_, index) => (
                    // eslint-disable-next-line @next/next/no-img-element -- idem
                    <img
                      key={index}
                      src={slideUrl(post.id, index + 1)}
                      alt={`Image ${index + 1}`}
                      loading="lazy"
                      className="aspect-4/5 w-52 shrink-0 rounded-xl border border-hairline"
                    />
                  ))}
                </div>
                {PLATFORMS.filter((platform) =>
                  post.publications.some((p) => p.platform === platform.id)
                ).map((platform) => (
                  <div key={platform.id}>
                    <p className={SECTION_TITLE}>Légende {platform.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                      {post.captions[platform.id]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PublicationLine({ publication }: { publication: SocialPublication }) {
  const status = STATUS[publication.status];
  const platform = PLATFORMS.find((p) => p.id === publication.platform)?.label;
  const metrics = Object.entries(publication.metrics ?? {}).filter(
    ([name]) => name in METRIC_LABELS
  );

  return (
    <p className="text-xs">
      <span className="text-muted">{platform} · </span>
      <span className={`font-semibold ${status.tone}`}>{status.label}</span>
      {metrics.length > 0 && (
        <span className="text-muted">
          {" — "}
          {metrics
            .map(([name, value]) => `${value} ${METRIC_LABELS[name]}`)
            .join(" · ")}
          {publication.settled ? "" : " (en cours)"}
        </span>
      )}
      {publication.error && (
        <span className="text-status-lost"> — {publication.error}</span>
      )}
      {publication.permalink && (
        <a
          href={publication.permalink}
          target="_blank"
          rel="noreferrer"
          className="ml-2 text-ember-2 hover:underline"
        >
          Ouvrir
        </a>
      )}
    </p>
  );
}
