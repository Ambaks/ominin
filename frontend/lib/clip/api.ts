import type { Tables } from "@/lib/supabase/database.types";
import type {
  CaptionSet,
  ClipPlatform,
  ConnectedAccount,
  PlatformAnalytics,
} from "./provider/types";
import { commit, fetchApi, getState } from "./store";
import { rowToClipPost, type ClipPost, type ClipState } from "./types";

/*
 * Surface de mutation de l'espace clipper : chaque fonction appelle une route
 * /api/clip puis répercute la réponse sur le snapshot local du store. Les
 * écrans ne connaissent que cette surface (pattern lib/gestion/api.ts).
 */

function apply<T>(recipe: (draft: ClipState) => T): T {
  const draft = structuredClone(getState());
  const result = recipe(draft);
  commit(draft);
  return result;
}

function replacePost(draft: ClipState, next: ClipPost) {
  const index = draft.posts.findIndex((post) => post.id === next.id);
  if (index === -1) draft.posts.unshift(next);
  else draft.posts[index] = next;
}

/** URL de la page hébergée où le clipper connecte ses comptes sociaux. */
export async function requestLinkUrl(): Promise<string> {
  const { url } = await fetchApi<{ url: string }>("/api/clip/link", {
    method: "POST",
  });
  return url;
}

/** Recharge les comptes connectés (retour de la page de liaison, refocus). */
export async function refreshAccounts(): Promise<ConnectedAccount[]> {
  const { accounts } = await fetchApi<{ accounts: ConnectedAccount[] }>(
    "/api/clip/accounts"
  );
  apply((draft) => {
    draft.accounts = accounts;
  });
  return accounts;
}

/**
 * Upload direct navigateur → bucket via URL signée (la vidéo ne transite
 * jamais par nos routes). Renvoie le chemin de l'objet à publier.
 */
export async function uploadClip(
  file: File,
  onProgress: (fraction: number) => void
): Promise<string> {
  const { path, signedUrl } = await fetchApi<{
    path: string;
    signedUrl: string;
  }>("/api/clip/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
  });

  // XHR plutôt que fetch : seul moyen d'avoir la progression d'envoi.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("L'envoi du clip a échoué. Réessayez."));
    };
    xhr.onerror = () =>
      reject(new Error("L'envoi du clip a échoué. Réessayez."));
    xhr.send(file);
  });

  return path;
}

/** Titres/descriptions proposés par l'IA — éditables avant publication. */
export async function generateCaptions(
  context: string,
  platforms: ClipPlatform[]
): Promise<CaptionSet> {
  const { captions } = await fetchApi<{ captions: CaptionSet }>(
    "/api/clip/captions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, platforms }),
    }
  );
  return captions;
}

export async function publishClip(input: {
  path: string;
  title: string;
  captions: CaptionSet;
  platforms: ClipPlatform[];
}): Promise<ClipPost> {
  const { post } = await fetchApi<{ post: Tables<"clip_posts"> }>(
    "/api/clip/publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  const created = rowToClipPost(post);
  apply((draft) => replacePost(draft, created));
  return created;
}

/** Réconcilie le statut d'une publication en cours auprès du prestataire. */
export async function pollPostStatus(id: string): Promise<ClipPost> {
  const { post } = await fetchApi<{ post: Tables<"clip_posts"> }>(
    `/api/clip/posts/${id}/status`
  );
  const next = rowToClipPost(post);
  apply((draft) => replacePost(draft, next));
  return next;
}

export async function retryPost(id: string): Promise<ClipPost> {
  const { post } = await fetchApi<{ post: Tables<"clip_posts"> }>(
    `/api/clip/posts/${id}/retry`,
    { method: "POST" }
  );
  const next = rowToClipPost(post);
  apply((draft) => replacePost(draft, next));
  return next;
}

export async function fetchAnalytics(): Promise<PlatformAnalytics[]> {
  const { analytics } = await fetchApi<{ analytics: PlatformAnalytics[] }>(
    "/api/clip/analytics"
  );
  return analytics;
}
