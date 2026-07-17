"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useClipData } from "@/lib/clip/context";
import {
  fetchJobClips,
  preparePublish,
  reviewClip,
} from "@/lib/clip/vod/api";
import type { ClipperClip } from "@/lib/clip/vod/types";
import { ClipReviewCard } from "./clip-review-card";

export function ClipReviewGrid({ jobId }: { jobId: string }) {
  const toast = useToast();
  const router = useRouter();
  const { basePath } = useClipData();

  const [clips, setClips] = useState<ClipperClip[]>([]);
  const [playbackUrls, setPlaybackUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetchClips = useCallback(() => {
    fetchJobClips(jobId)
      .then(({ clips: fetched, playbackUrls: urls }) => {
        setClips(fetched);
        setPlaybackUrls(urls);
        setLoadError(null);
      })
      .catch((error: Error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    fetchClips();
  };

  const handleReview = useCallback(
    async (clipId: string, approved: boolean) => {
      try {
        await reviewClip(clipId, approved);
        setClips((prev) =>
          prev.map((c) => (c.id === clipId ? { ...c, approved } : c))
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Échec de l'enregistrement."
        );
      }
    },
    [toast]
  );

  const handlePublish = useCallback(
    async (clipId: string) => {
      const clip = clips.find((c) => c.id === clipId);
      if (!clip) return;

      setPublishing(clipId);
      try {
        const { storagePath } = await preparePublish(clipId);
        const params = new URLSearchParams({
          vodClipPath: storagePath,
          vodClipTitle: clip.title,
        });
        router.push(`${basePath}?${params.toString()}`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Échec de la préparation."
        );
        setPublishing(null);
      }
    },
    [clips, basePath, router, toast]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <span className="size-1.5 animate-pulse rounded-full bg-ember-2" />
        <span className="text-sm text-muted">Chargement des clips…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <p className="text-sm text-muted">
          Impossible de charger les clips : {loadError}
        </p>
        <button
          type="button"
          onClick={retry}
          className="rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:border-ember-2/40"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Aucun clip n&apos;a été généré pour cette vidéo.
      </p>
    );
  }

  const approved = clips.filter((c) => c.approved === true).length;

  return (
    <div className="flex flex-col gap-5">
      {approved > 0 && (
        <p className="text-xs font-medium text-ember-1">
          {approved} clip{approved !== 1 ? "s" : ""} approuvé
          {approved !== 1 ? "s" : ""}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clips.map((clip, i) => (
          <ClipReviewCard
            key={clip.id}
            clip={clip}
            playbackUrl={playbackUrls[clip.id]}
            onReview={handleReview}
            onPublish={handlePublish}
            style={{ animationDelay: `${60 + i * 40}ms` }}
          />
        ))}
      </div>

      {publishing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-6 py-4">
            <span className="size-2 animate-pulse rounded-full bg-ember-2" />
            <span className="text-sm font-medium">
              Préparation du clip pour la publication…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
