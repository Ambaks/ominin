"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/clip/espace/post-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useClipData } from "@/lib/clip/context";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "@/lib/clip/constants";
import type { ClipPost } from "@/lib/clip/types";

/*
 * Historique des publications. Tant qu'une ligne est en_cours, la page
 * réconcilie son statut auprès du prestataire à cadence fixe ; au-delà du
 * délai, elle s'arrête (le prochain passage sur la page reprendra).
 */
export default function PublicationsPage() {
  const { state, basePath, actions } = useClipData();
  const toast = useToast();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Le tick lit les posts via cette ref : l'intervalle voit toujours l'état
  // courant sans dépendre du store singleton (la démo n'en a pas). Synchronisée
  // avant l'effet de polling — les effets s'exécutent dans l'ordre de
  // déclaration.
  const postsRef = useRef<ClipPost[]>([]);
  useEffect(() => {
    postsRef.current = state?.posts ?? [];
  }, [state]);

  const hasPending =
    state?.posts.some((post) => post.status === "en_cours") ?? false;

  useEffect(() => {
    if (!hasPending || timedOut) return;
    const startedAt = Date.now();
    let busy = false;
    const tick = async () => {
      if (busy) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      busy = true;
      try {
        const pending = postsRef.current.filter(
          (post) => post.status === "en_cours"
        );
        for (const post of pending) {
          await actions.pollPostStatus(post.id);
        }
      } catch {
        // Réessaie au tick suivant — un raté de polling n'est pas une erreur.
      } finally {
        busy = false;
      }
    };
    void tick();
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasPending, timedOut, actions]);

  if (!state) return null;

  const retry = (id: string) => {
    setRetrying(id);
    setTimedOut(false);
    actions
      .retryPost(id)
      .then(() => toast.success("Publication relancée."))
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setRetrying(null));
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="rise">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Publications
        </h1>
        <p className="mt-1 text-sm text-muted">
          Le statut de chaque clip, plateforme par plateforme.
        </p>
      </header>

      {timedOut && hasPending && (
        <p className="rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-muted">
          La publication prend plus de temps que prévu — revenez un peu plus
          tard, le statut se mettra à jour.
        </p>
      )}

      {state.posts.length === 0 ? (
        <EmptyState
          title="Aucune publication pour l'instant"
          body="Votre premier clip publié apparaîtra ici avec son statut par plateforme."
          action={
            <Link
              href={basePath}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Publier un clip
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {state.posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              onRetry={retry}
              retrying={retrying === post.id}
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
