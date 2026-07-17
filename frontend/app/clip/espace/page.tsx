"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CaptionEditor } from "@/components/clip/espace/caption-editor";
import { Dropzone } from "@/components/clip/espace/dropzone";
import { PublierTabs } from "@/components/clip/espace/publier-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useClipData, type ClipUploadInput } from "@/lib/clip/context";
import { PLATFORM_LABELS } from "@/lib/clip/constants";
import {
  CLIP_PLATFORMS,
  type CaptionSet,
  type ClipPlatform,
} from "@/lib/clip/provider/types";

/*
 * Page « Publier » : dépôt du clip (upload direct vers le bucket), choix des
 * plateformes connectées, titres générés par l'IA puis édités, publication.
 */
export default function PublierPage() {
  const { state, demo, basePath, sampleClip, actions } = useClipData();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const vodClipPath = searchParams.get("vodClipPath");
  const vodClipTitle = searchParams.get("vodClipTitle");

  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(
    () => vodClipPath ? { name: vodClipTitle ?? "Clip VOD", size: 0 } : null
  );
  const [progress, setProgress] = useState<number | null>(null);
  const [path, setPath] = useState<string | null>(() => vodClipPath);
  const [context, setContext] = useState(() => vodClipTitle ?? "");
  // En démo, toutes les plateformes connectées sont présélectionnées : le
  // visiteur voit le parcours complet sans avoir à cliquer chaque réseau.
  const [selected, setSelected] = useState<ClipPlatform[]>(() =>
    demo && state ? state.accounts.map((account) => account.platform) : []
  );
  const [captions, setCaptions] = useState<CaptionSet | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Le shell ne rend les enfants qu'une fois le store chargé.
  if (!state) return null;

  const connected = new Map(
    state.accounts.map((account) => [account.platform, account])
  );

  if (state.accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PublierTabs active="clip" />
        <PageHeader />
        <EmptyState
          title="Aucun compte connecté"
          body="Reliez d'abord vos comptes sociaux : vos clips seront ensuite publiés partout en une fois."
          action={
            <Link
              href={`${basePath}/comptes`}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Connecter mes comptes
            </Link>
          }
        />
      </div>
    );
  }

  const selectClip = (input: ClipUploadInput) => {
    setFileMeta({ name: input.name, size: input.size });
    setPath(null);
    setProgress(0);
    actions
      .uploadClip(input, setProgress)
      .then((uploadedPath) => setPath(uploadedPath))
      .catch((error: Error) => {
        setFileMeta(null);
        toast.error(error.message);
      })
      .finally(() => setProgress(null));
  };

  const togglePlatform = (platform: ClipPlatform) => {
    setSelected((current) =>
      current.includes(platform)
        ? current.filter((entry) => entry !== platform)
        : [...current, platform]
    );
  };

  const generate = () => {
    setGenerating(true);
    actions
      .generateCaptions(context, selected)
      .then((next) => setCaptions((current) => ({ ...current, ...next })))
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setGenerating(false));
  };

  const missingTitle = selected.some((platform) => !captions?.[platform]?.title?.trim());
  const canGenerate = context.trim().length > 0 && selected.length > 0 && !generating;
  const canPublish =
    path != null && selected.length > 0 && captions != null && !missingTitle && !publishing;

  const publish = () => {
    if (!path || !captions) return;
    // Titre principal (fallback du prestataire) : celui de la première
    // plateforme sélectionnée.
    const title = captions[selected[0]]?.title?.trim() ?? "";
    setPublishing(true);
    actions
      .publishClip({ path, title, captions, platforms: selected })
      .then(() => {
        toast.success("Publication lancée.");
        router.push(`${basePath}/publications`);
      })
      .catch((error: Error) => {
        toast.error(error.message);
        setPublishing(false);
      });
  };

  return (
    <div className="flex flex-col gap-8">
      <PublierTabs active="clip" />
      <PageHeader />

      <section
        className="rise flex flex-col gap-3"
        style={{ animationDelay: "60ms" }}
      >
        <SectionTitle index={1} label="Votre clip" />
        {vodClipPath ? (
          <VodClipBanner title={vodClipTitle} />
        ) : (
          <Dropzone
            file={fileMeta}
            progress={progress}
            uploaded={path != null}
            disabled={progress != null || publishing}
            onSelect={(candidate) =>
              selectClip({
                name: candidate.name,
                size: candidate.size,
                file: candidate,
              })
            }
            onPick={sampleClip ? () => selectClip(sampleClip) : undefined}
          />
        )}
      </section>

      <section
        className="rise flex flex-col gap-3"
        style={{ animationDelay: "120ms" }}
      >
        <SectionTitle index={2} label="Plateformes" />
        <div className="flex flex-wrap gap-2">
          {CLIP_PLATFORMS.map((platform) => {
            const account = connected.get(platform);
            if (!account) {
              return (
                <Link
                  key={platform}
                  href={`${basePath}/comptes`}
                  className="rounded-full border border-dashed border-hairline px-4 py-2 text-sm text-faint transition-colors hover:border-ember-2/40 hover:text-muted"
                >
                  {PLATFORM_LABELS[platform]} — connecter
                </Link>
              );
            }
            const active = selected.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-ember-2/50 bg-surface text-foreground"
                    : "border-hairline text-muted hover:text-foreground"
                }`}
              >
                {PLATFORM_LABELS[platform]}
                {account.reauthRequired && (
                  <span className="ml-1.5 text-[10px] font-semibold uppercase text-ember-3">
                    reconnexion requise
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="rise flex flex-col gap-3"
        style={{ animationDelay: "180ms" }}
      >
        <SectionTitle index={3} label="Titres" />
        <Field
          label="Décrivez votre clip"
          hint="Streamer, jeu, moment fort… l'IA s'appuie uniquement sur cette description."
        >
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Ex. : Kameto rage-quit après un 1v4 raté sur Valorant, chat en folie"
          />
        </Field>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={generate}
          className="self-start rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ember-2/40 disabled:opacity-50"
        >
          {generating ? (
            <span className="animate-pulse">Génération…</span>
          ) : captions ? (
            "Régénérer les titres"
          ) : (
            "Générer les titres"
          )}
        </button>
        {captions && selected.length > 0 && (
          <CaptionEditor
            platforms={selected}
            captions={captions}
            onChange={setCaptions}
          />
        )}
      </section>

      <section
        className="rise flex flex-col gap-2"
        style={{ animationDelay: "240ms" }}
      >
        <button
          type="button"
          disabled={!canPublish}
          onClick={publish}
          className="ember-gradient self-start rounded-full px-6 py-3 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {publishing ? "Publication…" : "Publier"}
        </button>
        {selected.length > 0 && captions != null && missingTitle && (
          <p className="text-xs text-faint">
            Chaque plateforme sélectionnée doit avoir un titre.
          </p>
        )}
      </section>
    </div>
  );
}

function PageHeader() {
  return (
    <header className="rise">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Publier un clip
      </h1>
      <p className="mt-1 text-sm text-muted">
        Un clip, tous vos réseaux : déposez la vidéo, validez les titres,
        publiez.
      </p>
    </header>
  );
}

function SectionTitle({ index, label }: { index: number; label: string }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold">
      <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-background">
        {index}
      </span>
      {label}
    </h2>
  );
}

function VodClipBanner({ title }: { title: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ember-1/30 bg-ember-1/5 px-5 py-4">
      <CheckIcon />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Clip importé depuis le générateur</p>
        {title && (
          <p className="mt-0.5 truncate text-xs text-muted">{title}</p>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 shrink-0 text-ember-1"
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
