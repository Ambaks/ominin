"use client";

import type { SocialPost } from "@/lib/admin/social";
import { slideUrl } from "@/lib/social/brands";
import { MUSIC_BY_ID } from "@/lib/social/music";
import { videoUrl } from "@/lib/social/reel";
import { SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * Ce qu'un post montre, quel que soit son format : les images du carrousel
 * ou de l'image seule, ou la vidéo du Reel avec son script. Partagé par les
 * onglets « À valider » et « Publications ».
 */

export const FORMAT_LABELS: Record<SocialPost["format"], string> = {
  carousel: "Carrousel",
  image: "Image",
  reel: "Reel",
};

const VISUAL_LABELS = {
  demo: "Démo filmée",
  screen: "Capture",
  stock: "Vidéo de personnes",
  title: "Texte seul",
} as const;

const RENDER_LABELS = {
  pending: "En attente du serveur de rendu…",
  rendering: "Vidéo en cours de rendu",
  failed: "Le rendu de la vidéo a échoué.",
} as const;

/** Barre d'avancement du rendu : l'étape, la part faite, et pendant le
 * montage le temps restant estimé par le workflow. */
function RenderProgress({ post }: { post: SocialPost }) {
  const done = post.renderProgress ?? 0;
  const eta = post.renderEtaSeconds;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(done * 100)}
        className="h-2 w-full overflow-hidden rounded-full bg-background"
      >
        <div
          className="ember-gradient h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(done, 0.03) * 100}%` }}
        />
      </div>
      <p className="flex justify-between gap-2 text-xs">
        <span>{post.renderStage ?? "Démarrage"}</span>
        <span className="tabular-nums">
          {Math.round(done * 100)} %
          {eta != null && ` · ${eta < 60 ? `${eta} s` : `${Math.ceil(eta / 60)} min`}`}
        </span>
      </p>
    </div>
  );
}

/** Vignette : première image, ou la vidéo du Reel quand elle existe. */
export function PostThumb({ post }: { post: SocialPost }) {
  const className =
    "aspect-4/5 w-20 shrink-0 rounded-lg border border-hairline object-cover";
  if (post.format === "reel") {
    return post.videoPath ? (
      <video src={videoUrl(post.videoPath)} muted preload="metadata" className={className} />
    ) : (
      <div className={`${className} flex items-center justify-center bg-surface-raised text-[11px] text-faint`}>
        Reel
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- JPEG rendu par /api/social/slides, déjà à la bonne taille
    <img src={slideUrl(post.id, 1, post.updatedAt)} alt="" loading="lazy" className={className} />
  );
}

export function PostMedia({
  post,
  onRetryRender,
}: {
  post: SocialPost;
  /** Relancer un rendu en échec (onglet « À valider » seulement). */
  onRetryRender?: () => void;
}) {
  if (post.format !== "reel" || !post.reel) {
    return (
      <div className="no-scrollbar flex gap-3 overflow-x-auto">
        {post.slides.map((_, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- JPEG rendu par /api/social/slides, déjà à la bonne taille
          <img
            key={`${post.updatedAt}-${index}`}
            src={slideUrl(post.id, index + 1, post.updatedAt)}
            alt={`Image ${index + 1}`}
            loading="lazy"
            className="aspect-4/5 w-52 shrink-0 rounded-xl border border-hairline"
          />
        ))}
      </div>
    );
  }

  const ready = post.renderStatus === "ready" && post.videoPath;
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {ready ? (
        <video
          key={post.videoPath}
          src={videoUrl(post.videoPath!)}
          controls
          playsInline
          preload="metadata"
          className="aspect-9/16 w-60 shrink-0 rounded-xl border border-hairline bg-black"
        />
      ) : (
        <div className="flex aspect-9/16 w-60 shrink-0 flex-col items-center justify-center gap-3 rounded-xl border border-hairline bg-surface-raised p-4 text-center text-sm text-muted">
          <p>{RENDER_LABELS[post.renderStatus as keyof typeof RENDER_LABELS]}</p>
          {post.renderStatus === "rendering" && <RenderProgress post={post} />}
          {post.renderStatus === "failed" && (
            <>
              {post.renderError && (
                <p className="line-clamp-4 text-xs text-status-lost">{post.renderError}</p>
              )}
              {onRetryRender && (
                <button type="button" onClick={onRetryRender} className={SECONDARY_BUTTON}>
                  Relancer le rendu
                </button>
              )}
            </>
          )}
        </div>
      )}
      <ol className="flex min-w-0 flex-1 flex-col gap-2">
        {post.reel.scenes.map((scene, index) => (
          <li key={index} className="rounded-xl bg-surface-raised p-3 text-sm">
            <p className={SECTION_TITLE}>
              Scène {index + 1} · {VISUAL_LABELS[scene.visual]}
              {scene.media && ` · ${scene.media}`}
            </p>
            <p className="mt-1 font-medium">{scene.caption}</p>
            <p className="mt-0.5 text-muted">« {scene.voiceover} »</p>
          </li>
        ))}
        <li className="rounded-xl bg-surface-raised p-3 text-sm">
          <p className={SECTION_TITLE}>Écran final</p>
          <p className="mt-1 font-medium">{post.reel.cta}</p>
          <p className="mt-1 text-muted">
            {MUSIC_BY_ID.get(post.reel.music)?.mood ?? "Sans musique"}
          </p>
        </li>
      </ol>
    </div>
  );
}
