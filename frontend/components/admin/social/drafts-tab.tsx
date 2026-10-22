"use client";

import { useEffect, useId, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { useRunMutation } from "@/components/ui/toast";
import { formatDayTime } from "@/lib/admin/format";
import * as api from "@/lib/admin/social";
import type { PostStatus, SocialPost } from "@/lib/admin/social";
import {
  BRAND_BY_ID,
  PLATFORMS,
  type Slide,
  type SocialPlatform,
} from "@/lib/social/brands";
import { CLIPS } from "@/lib/social/clips";
import { MUSIC } from "@/lib/social/music";
import type { ReelScene, ReelScript, ReelVisual } from "@/lib/social/reel";
import { SCREENS } from "@/lib/social/screens";
import { STOCK } from "@/lib/social/stock";
import { FORMAT_LABELS, PostMedia } from "./post-media";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * Ce que l'agent a préparé pour les prochains créneaux, et qui n'est pas
 * encore parti. Rien n'est publié sans passer ici : on regarde les images ou
 * la vidéo telles qu'elles sortiront, on corrige un mot, on renvoie à l'agent
 * avec un commentaire, on valide ou on écarte. Un post validé part à son
 * heure ; il reste modifiable, ou peut repasser en brouillon, jusque-là.
 * Un Reel ne se valide qu'une fois sa vidéo rendue ; modifier son script la
 * fait refaire.
 */

const STATUS: Record<
  Extract<PostStatus, "draft" | "redrafting" | "approved">,
  { label: string; tone: string }
> = {
  draft: { label: "À valider", tone: "text-ember-2" },
  redrafting: { label: "Réécriture en cours", tone: "text-muted" },
  approved: { label: "Validé", tone: "text-status-signed" },
};

type Mode = "view" | "edit" | "redraft";

/** Relecture des posts tant qu'un Reel est en rendu : la barre avance seule. */
const RENDER_POLL_MS = 10_000;

export function DraftsTab({
  posts,
  onChange,
}: {
  /** Brouillons, réécritures et posts validés pas encore partis. */
  posts: SocialPost[];
  onChange: () => void;
}) {
  const rendering = posts.some(
    (post) => post.renderStatus === "pending" || post.renderStatus === "rendering"
  );
  useEffect(() => {
    if (!rendering) return;
    const timer = window.setInterval(onChange, RENDER_POLL_MS);
    return () => window.clearInterval(timer);
  }, [rendering, onChange]);

  if (posts.length === 0) {
    return (
      <EmptyState
        title="Rien à valider"
        body="L'agent prépare les brouillons de la semaine le mercredi soir : trois créneaux par marque, mardi, jeudi et dimanche. « Préparer maintenant » les rédige tout de suite."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {[...posts]
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .map((post) => (
          <DraftCard key={post.id} post={post} onChange={onChange} />
        ))}
    </div>
  );
}

function DraftCard({
  post,
  onChange,
}: {
  post: SocialPost;
  onChange: () => void;
}) {
  const run = useRunMutation();
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const status = STATUS[post.status as keyof typeof STATUS];
  const failures = post.publications.filter((p) => p.status === "failed");
  const videoReady = post.format !== "reel" || post.renderStatus === "ready";

  const act = (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    void run(async () => {
      try {
        await action();
        setMode("view");
        onChange();
      } finally {
        setBusy(false);
      }
    }, success);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-faint">
            {formatDayTime(post.scheduledAt)} ·{" "}
            {BRAND_BY_ID.get(post.brand)?.name} · {FORMAT_LABELS[post.format]} ·{" "}
            <span className={`font-semibold ${status.tone}`}>{status.label}</span>
          </p>
          <p className="mt-1 font-medium">{post.topic}</p>
          <p className="text-sm text-muted">{post.angle}</p>
        </div>
        {mode === "view" && post.status !== "redrafting" && (
          <div className="flex flex-wrap gap-2">
            {post.status === "draft" ? (
              <button
                type="button"
                disabled={busy || !videoReady}
                title={videoReady ? undefined : "Un Reel se valide une fois sa vidéo rendue."}
                onClick={() =>
                  act(
                    () => api.setPostStatus(post.id, "approved"),
                    `Validé : part ${formatDayTime(post.scheduledAt)}.`
                  )
                }
                className={`${PRIMARY_BUTTON} disabled:opacity-50`}
              >
                Valider
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    () => api.setPostStatus(post.id, "draft"),
                    "Repassé en brouillon : il ne partira pas sans être validé."
                  )
                }
                className={`${SECONDARY_BUTTON} disabled:opacity-50`}
              >
                Repasser en brouillon
              </button>
            )}
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={SECONDARY_BUTTON}
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => setMode("redraft")}
              className={SECONDARY_BUTTON}
            >
              Réécrire
            </button>
            {post.status === "draft" && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    () => api.setPostStatus(post.id, "rejected"),
                    "Brouillon écarté : ce créneau restera vide."
                  )
                }
                className={`${SECONDARY_BUTTON} hover:text-status-lost disabled:opacity-50`}
              >
                Rejeter
              </button>
            )}
          </div>
        )}
      </div>

      {post.status === "redrafting" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-raised p-3">
          <p className="min-w-0 flex-1 text-sm text-muted">
            L&apos;agent réécrit ce post d&apos;après : « {post.feedback} »
          </p>
          <button type="button" onClick={onChange} className={SECONDARY_BUTTON}>
            Actualiser
          </button>
        </div>
      )}

      {failures.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl bg-surface-raised p-3 text-xs">
          {failures.map((failure) => (
            <p key={failure.id} className="text-status-lost">
              {PLATFORMS.find((p) => p.id === failure.platform)?.label} :{" "}
              {failure.error}
            </p>
          ))}
          <p className="text-muted">
            Retenté au prochain passage de la publication.
          </p>
        </div>
      )}

      {mode === "edit" ? (
        <EditForm
          post={post}
          busy={busy}
          onCancel={() => setMode("view")}
          onSave={(content) =>
            act(
              () => api.savePostContent(post.id, content),
              "Corrections enregistrées."
            )
          }
        />
      ) : (
        <>
          <PostMedia
            post={post}
            onRetryRender={() =>
              act(api.retryRenders, "Rendu relancé : la vidéo arrive dans quelques minutes.")
            }
          />
          {PLATFORMS.filter(
            (platform) => platform.id !== "snapchat"
          ).map((platform) => (
            <div key={platform.id}>
              <p className={SECTION_TITLE}>Légende {platform.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                {post.captions[platform.id]}
              </p>
            </div>
          ))}
        </>
      )}

      {mode === "redraft" && (
        <RedraftForm
          busy={busy}
          onCancel={() => setMode("view")}
          onSend={(feedback) =>
            act(
              () => api.requestRedraft(post.id, feedback),
              "Envoyé à l'agent : le nouveau brouillon arrive dans une minute ou deux."
            )
          }
        />
      )}
    </div>
  );
}

function RedraftForm({
  busy,
  onCancel,
  onSend,
}: {
  busy: boolean;
  onCancel: () => void;
  onSend: (feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState("");
  const id = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (feedback.trim()) onSend(feedback.trim());
      }}
      className="flex flex-col gap-3 border-t border-hairline pt-4"
    >
      <label className={SECTION_TITLE} htmlFor={id}>
        Ce que l&apos;agent doit changer
      </label>
      <textarea
        id={id}
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        rows={3}
        placeholder="Ex. : accroche plus percutante, montre le paiement à table, moins de texte."
        className={inputClass}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !feedback.trim()}
          className={`${PRIMARY_BUTTON} disabled:opacity-50`}
        >
          Envoyer à l&apos;agent
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Annuler
        </button>
      </div>
    </form>
  );
}

function EditForm({
  post,
  busy,
  onCancel,
  onSave,
}: {
  post: SocialPost;
  busy: boolean;
  onCancel: () => void;
  onSave: (content: {
    slides: Slide[];
    reel: ReelScript | null;
    captions: Record<SocialPlatform, string>;
  }) => void;
}) {
  const [slides, setSlides] = useState(post.slides);
  const [reel, setReel] = useState(post.reel);
  const [captions, setCaptions] = useState(post.captions);
  // Ominin présente les trois offres : tout leur matériel lui est ouvert.
  const screens = SCREENS.filter(
    (screen) => post.brand === "ominin" || screen.brand === post.brand
  );
  const clips = CLIPS.filter(
    (clip) => post.brand === "ominin" || clip.brand === post.brand
  );
  // Seul un script modifié refait la vidéo ; une légende corrigée, non.
  const reelChanged = JSON.stringify(reel) !== JSON.stringify(post.reel);

  const setSlide = (index: number, patch: Partial<Slide>) =>
    setSlides((current) =>
      current.map((slide, position) =>
        position === index ? { ...slide, ...patch } : slide
      )
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ slides, captions, reel: reelChanged ? reel : null });
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-xs text-faint">
        Dans un titre ou un texte à l&apos;écran, les mots entre [[ ]] sont
        posés sur le dégradé de la marque.
        {reel && " Modifier le script refait la vidéo (quelques minutes)."}
      </p>
      {reel && (
        <ReelEditor reel={reel} screens={screens} clips={clips} onChange={setReel} />
      )}
      {slides.map((slide, index) => (
        <fieldset
          key={index}
          className="flex flex-col gap-2 rounded-xl bg-surface-raised p-3"
        >
          <legend className={SECTION_TITLE}>Image {index + 1}</legend>
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <input
              aria-label="Étiquette"
              placeholder="Étiquette"
              value={slide.kicker}
              onChange={(event) => setSlide(index, { kicker: event.target.value })}
              className={inputClass}
            />
            <input
              aria-label="Titre"
              placeholder="Titre"
              value={slide.title}
              onChange={(event) => setSlide(index, { title: event.target.value })}
              className={inputClass}
            />
          </div>
          <textarea
            aria-label="Texte"
            placeholder="Texte (vide sur la couverture)"
            value={slide.body}
            onChange={(event) => setSlide(index, { body: event.target.value })}
            rows={2}
            className={inputClass}
          />
          <select
            aria-label="Capture"
            value={slide.screen ?? ""}
            onChange={(event) => setSlide(index, { screen: event.target.value })}
            className={inputClass}
          >
            <option value="">Sans capture</option>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.description}
              </option>
            ))}
          </select>
        </fieldset>
      ))}
      {PLATFORMS.map((platform) => (
        <label key={platform.id} className="flex flex-col gap-1">
          <span className={SECTION_TITLE}>Légende {platform.label}</span>
          <textarea
            value={captions[platform.id]}
            onChange={(event) =>
              setCaptions((current) => ({
                ...current,
                [platform.id]: event.target.value,
              }))
            }
            rows={platform.id === "snapchat" ? 1 : 4}
            className={inputClass}
          />
        </label>
      ))}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className={`${PRIMARY_BUTTON} disabled:opacity-50`}
        >
          Enregistrer
        </button>
        <button type="button" onClick={onCancel} className={SECONDARY_BUTTON}>
          Annuler
        </button>
      </div>
    </form>
  );
}

const VISUALS: { id: ReelVisual; label: string }[] = [
  { id: "stock", label: "Vidéo de personnes" },
  { id: "demo", label: "Démo filmée" },
  { id: "screen", label: "Capture" },
  { id: "title", label: "Texte seul" },
];

function ReelEditor({
  reel,
  screens,
  clips,
  onChange,
}: {
  reel: ReelScript;
  screens: readonly { id: string; description: string }[];
  clips: readonly { id: string; description: string }[];
  onChange: (reel: ReelScript) => void;
}) {
  const setScene = (index: number, patch: Partial<ReelScene>) =>
    onChange({
      ...reel,
      scenes: reel.scenes.map((scene, position) =>
        position === index ? { ...scene, ...patch } : scene
      ),
    });

  return (
    <>
      {reel.scenes.map((scene, index) => {
        const media = { demo: clips, screen: screens, stock: STOCK, title: null }[
          scene.visual
        ];
        return (
          <fieldset
            key={index}
            className="flex flex-col gap-2 rounded-xl bg-surface-raised p-3"
          >
            <legend className={SECTION_TITLE}>Scène {index + 1}</legend>
            <input
              aria-label="Texte à l'écran"
              placeholder="Texte à l'écran"
              value={scene.caption}
              onChange={(event) => setScene(index, { caption: event.target.value })}
              className={inputClass}
            />
            <textarea
              aria-label="Voix off"
              placeholder="Voix off"
              value={scene.voiceover}
              onChange={(event) => setScene(index, { voiceover: event.target.value })}
              rows={2}
              className={inputClass}
            />
            <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
              <select
                aria-label="Visuel"
                value={scene.visual}
                onChange={(event) =>
                  setScene(index, {
                    visual: event.target.value as ReelVisual,
                    media: "",
                  })
                }
                className={inputClass}
              >
                {VISUALS.map((visual) => (
                  <option key={visual.id} value={visual.id}>
                    {visual.label}
                  </option>
                ))}
              </select>
              {media && (
                <select
                  aria-label="Média"
                  value={scene.media}
                  required
                  onChange={(event) => setScene(index, { media: event.target.value })}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {media.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </fieldset>
        );
      })}
      <label className="flex flex-col gap-1">
        <span className={SECTION_TITLE}>Écran final</span>
        <input
          value={reel.cta}
          onChange={(event) => onChange({ ...reel, cta: event.target.value })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={SECTION_TITLE}>Musique</span>
        <select
          value={reel.music}
          onChange={(event) => onChange({ ...reel, music: event.target.value })}
          className={inputClass}
        >
          <option value="">Sans musique</option>
          {MUSIC.map((track) => (
            <option key={track.id} value={track.id}>
              {track.mood}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
