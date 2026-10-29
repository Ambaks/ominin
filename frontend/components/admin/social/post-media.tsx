"use client";

import type { SocialPost } from "@/lib/admin/social";
import { slideUrl } from "@/lib/social/brands";
import { MUSIC_BY_ID } from "@/lib/social/music";
import { videoUrl } from "@/lib/social/reel";
import {
  type BlockId,
  FORMATS,
  LOOKS,
  type PostScene,
  type PostScript,
  type ProduceReport,
  RHYTHMS,
  type TransitionKind,
} from "@/lib/social/script";
import { SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * Ce qu'un post montre, quel que soit son format : les images du carrousel
 * ou de l'image seule, ou la vidéo du Reel avec son script (voix off, ou
 * scènes en blocs animés). Partagé par les onglets « À valider » et
 * « Publications ».
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

const BLOCK_LABELS: Record<BlockId, string> = {
  hook: "Accroche",
  phone: "Téléphone",
  relay: "Relais",
  points: "Points",
  split: "Face-à-face",
  figure: "Chiffre",
  steps: "Étapes",
  question: "Question",
  cta: "Appel à l'action",
};

/** Le texte principal d'une scène, celui qui se lit en premier. */
function mainText(scene: PostScene): string {
  switch (scene.block) {
    case "cta":
      return scene.props.cta;
    case "question":
      return `« ${scene.props.question} » ${scene.props.answer}`;
    default:
      return scene.props.title;
  }
}

/** Le détail sous le texte principal : points, étapes, côtés, chiffre, ligne. */
function details(scene: PostScene): string[] {
  switch (scene.block) {
    case "points":
      return scene.props.points;
    case "steps":
      return scene.props.steps;
    case "split":
      return [`${scene.props.beforeLabel} : ${scene.props.before}`, `${scene.props.afterLabel} : ${scene.props.after}`];
    case "figure":
      return [`${scene.props.value} ${scene.props.label}`];
    case "cta":
      return [scene.props.line];
    default:
      return [];
  }
}

const TRANSITION_LABELS: Record<TransitionKind, string> = {
  cut: "Coupe franche",
  fade: "Fondu",
  slide: "Glissement",
  wipe: "Balayage",
  flip: "Retournement",
  iris: "Iris",
  push: "Coupe poussée",
};

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

/** Une note d'arbitre, à la française : 8,5/10. */
export function formatScore(score: number): string {
  return `${score.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10`;
}

export function PostMedia({
  post,
  onRetryRender,
}: {
  post: SocialPost;
  /** Relancer un rendu en échec (onglet « À valider » seulement). */
  onRetryRender?: () => void;
}) {
  if (post.format !== "reel" || !(post.reel || post.script)) {
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
      {post.reel ? (
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
      ) : (
        <ScriptScenes script={post.script!} production={post.production} />
      )}
    </div>
  );
}

/** Les scènes d'un Reel en blocs, la transition qui joint chacune à la
 * suivante, et les notes du montage quand les agents l'ont poli. */
function ScriptScenes({
  script,
  production,
}: {
  script: PostScript;
  production: ProduceReport | null;
}) {
  return (
    <ol className="flex min-w-0 flex-1 flex-col gap-2">
      {script.scenes.map((scene, index) => {
        const reviews = production?.scenes[index] ?? [];
        const transition = script.transitions[index];
        return (
          <li key={index} className="flex flex-col gap-2">
            <div className="rounded-xl bg-surface-raised p-3 text-sm">
              <p className={SECTION_TITLE}>
                Scène {index + 1} · {BLOCK_LABELS[scene.block]}
                {reviews.length > 0 &&
                  ` · ${formatScore(Math.max(...reviews.map((review) => review.score)))}`}
              </p>
              <p className="mt-1 font-medium">{mainText(scene)}</p>
              {details(scene).length > 0 && (
                <ul className="mt-0.5 list-disc pl-5 text-muted">
                  {details(scene).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
            {transition && (
              <p className="px-3 text-xs text-faint">↓ {TRANSITION_LABELS[transition.kind]}</p>
            )}
          </li>
        );
      })}
      <li className="rounded-xl bg-surface-raised p-3 text-sm">
        <p className={SECTION_TITLE}>Montage</p>
        <p className="mt-1 text-muted">
          {FORMATS.find((item) => item.id === script.format)?.name} ·{" "}
          {LOOKS.find((item) => item.id === script.look)?.name.split(" :")[0]} ·{" "}
          {RHYTHMS.find((item) => item.id === script.rhythm)?.name.split(" :")[0]}
        </p>
        {production && (
          <>
            <p className="mt-1 font-medium">{formatScore(production.final.score)}</p>
            <p className="mt-0.5 text-muted">{production.final.verdict}</p>
          </>
        )}
      </li>
    </ol>
  );
}
