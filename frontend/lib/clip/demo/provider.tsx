"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ClipDataContext,
  type ClipActions,
  type ClipData,
} from "../context";
import type { CaptionSet } from "../provider/types";
import type { ClipPost, ClipState } from "../types";
import {
  buildDemoAnalytics,
  buildDemoState,
  DEMO_CAPTIONS,
  DEMO_SAMPLE_CLIP,
  DEMO_TIMINGS,
  DEMO_UPLOAD_PATH,
  DEMO_X_ACCOUNT,
} from "./data";

/*
 * Fournisseur de la démo publique : même surface que ClipDataProvider, mais
 * tout vit en mémoire et les flux asynchrones (upload, IA, publication,
 * connexion) sont joués par des minuteries — aucun appel Supabase ni /api.
 * Les pages de l'espace se rendent telles quelles au-dessus.
 */

const SEEDED_PENDING_ID = "demo-post-1";

export function DemoClipProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ClipState | null>(null);
  const stateRef = useRef<ClipState | null>(null);
  // Annulations des minuteries en vol — toutes purgées au démontage.
  const cleanupsRef = useRef(new Set<() => void>());

  const after = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      cleanupsRef.current.delete(cancel);
      fn();
    }, ms);
    const cancel = () => clearTimeout(id);
    cleanupsRef.current.add(cancel);
  }, []);

  const mutate = useCallback((recipe: (draft: ClipState) => void) => {
    setState((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      recipe(draft);
      stateRef.current = draft;
      return draft;
    });
  }, []);

  const resolvePost = useCallback(
    (id: string) => {
      mutate((draft) => {
        const post = draft.posts.find((entry) => entry.id === id);
        if (!post || post.status !== "en_cours") return;
        post.status = "publie";
        post.publishedAt = new Date().toISOString();
        post.storagePath = null;
        post.results = post.platforms.map((platform) => ({
          platform,
          success: true,
          message: "",
        }));
      });
    },
    [mutate]
  );

  useEffect(() => {
    const cleanups = cleanupsRef.current;
    after(DEMO_TIMINGS.initialLoadMs, () => {
      const initial = buildDemoState(Date.now());
      stateRef.current = initial;
      setState(initial);
      // Le post en_cours du fixture se publie sous les yeux du visiteur.
      after(DEMO_TIMINGS.seededPendingResolveMs, () =>
        resolvePost(SEEDED_PENDING_ID)
      );
    });
    return () => {
      for (const cancel of cleanups) cancel();
      cleanups.clear();
    };
  }, [after, resolvePost]);

  const actions = useMemo<ClipActions>(
    () => ({
      uploadClip: (_input, onProgress) =>
        new Promise((resolve) => {
          const started = Date.now();
          const id = setInterval(() => {
            const t = Math.min(
              (Date.now() - started) / DEMO_TIMINGS.uploadDurationMs,
              1
            );
            // Démarrage vif puis décélération : la signature d'un vrai envoi.
            onProgress(1 - (1 - t) ** 3);
            if (t >= 1) {
              cleanupsRef.current.delete(cancel);
              cancel();
              resolve(DEMO_UPLOAD_PATH);
            }
          }, DEMO_TIMINGS.uploadTickMs);
          const cancel = () => clearInterval(id);
          cleanupsRef.current.add(cancel);
        }),

      generateCaptions: (_context, platforms) =>
        new Promise((resolve) =>
          after(DEMO_TIMINGS.captionDelayMs, () => {
            const captions: CaptionSet = {};
            for (const platform of platforms) {
              const caption = DEMO_CAPTIONS[platform];
              if (caption) captions[platform] = { ...caption };
            }
            resolve(captions);
          })
        ),

      publishClip: (input) =>
        new Promise((resolve) =>
          after(DEMO_TIMINGS.publishDelayMs, () => {
            const post: ClipPost = {
              id: `demo-post-${Date.now()}`,
              title: input.title,
              captions: input.captions,
              platforms: input.platforms,
              status: "en_cours",
              storagePath: input.path,
              results: [],
              attempt: 1,
              createdAt: new Date().toISOString(),
              publishedAt: null,
            };
            mutate((draft) => {
              draft.posts.unshift(post);
            });
            after(DEMO_TIMINGS.statusResolveMs, () => resolvePost(post.id));
            resolve(post);
          })
        ),

      pollPostStatus: (id) => {
        const post = stateRef.current?.posts.find((entry) => entry.id === id);
        return post
          ? Promise.resolve(post)
          : Promise.reject(new Error("Publication introuvable."));
      },

      retryPost: (id) =>
        new Promise((resolve, reject) => {
          const current = stateRef.current?.posts.find(
            (entry) => entry.id === id
          );
          if (!current) {
            reject(new Error("Publication introuvable."));
            return;
          }
          mutate((draft) => {
            const post = draft.posts.find((entry) => entry.id === id);
            if (!post) return;
            post.status = "en_cours";
            post.attempt += 1;
            post.results = [];
          });
          after(DEMO_TIMINGS.retryResolveMs, () => resolvePost(id));
          resolve({
            ...current,
            status: "en_cours",
            attempt: current.attempt + 1,
            results: [],
          });
        }),

      connectAccounts: () =>
        new Promise((resolve) =>
          after(DEMO_TIMINGS.connectDelayMs, () => {
            mutate((draft) => {
              if (
                !draft.accounts.some(
                  (account) => account.platform === DEMO_X_ACCOUNT.platform
                )
              ) {
                draft.accounts.push(DEMO_X_ACCOUNT);
              }
            });
            resolve();
          })
        ),

      refreshAccounts: () =>
        Promise.resolve(stateRef.current?.accounts ?? []),

      fetchAnalytics: () =>
        new Promise((resolve) =>
          after(DEMO_TIMINGS.analyticsDelayMs, () => {
            const connected = new Set(
              stateRef.current?.accounts.map((account) => account.platform)
            );
            resolve(
              buildDemoAnalytics(Date.now()).filter((entry) =>
                connected.has(entry.platform)
              )
            );
          })
        ),
    }),
    [after, mutate, resolvePost]
  );

  const value = useMemo<ClipData>(
    () => ({
      state,
      loadError: null,
      retryLoad: () => {},
      demo: true,
      basePath: "/demo",
      sampleClip: DEMO_SAMPLE_CLIP,
      actions,
    }),
    [state, actions]
  );

  return (
    <ClipDataContext.Provider value={value}>
      {children}
    </ClipDataContext.Provider>
  );
}
