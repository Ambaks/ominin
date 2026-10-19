import { required } from "./env.ts";

/*
 * Accès à la base et au stockage par l'API REST de Supabase, avec la clé
 * service_role (secret du workflow) : le rendu lit les Reels en attente,
 * dépose les MP4 dans le bucket public social-videos et note l'état.
 */

const BUCKET = "social-videos";

function headers(extra: Record<string, string> = {}) {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function rest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${required("SUPABASE_URL")}${path}`, init);
  if (!response.ok) {
    throw new Error(`Supabase ${init.method ?? "GET"} ${path} : ${response.status} ${await response.text()}`);
  }
  return response;
}

export interface PendingReel {
  id: string;
  brand: string;
  reel: { scenes: unknown[]; cta: string };
  video_path: string | null;
}

/** Reels à rendre. Un « rendering » trouvé au départ est un rendu
 * interrompu : le workflow n'en fait tourner qu'un à la fois. */
export async function pendingReels(): Promise<PendingReel[]> {
  const query = new URLSearchParams({
    select: "id,brand,reel,video_path",
    format: "eq.reel",
    render_status: "in.(pending,rendering)",
    status: "in.(draft,approved)",
    order: "scheduled_at",
  });
  return (await rest(`/rest/v1/social_posts?${query}`, { headers: headers() })).json();
}

/** Met à jour un post si son état de rendu est encore `when` : une
 * modification du script pendant le rendu le repasse en « pending », et ce
 * rendu-là ne doit plus l'écraser. Rend vrai si la ligne a changé. */
export async function updatePost(id: string, when: string, fields: Record<string, unknown>): Promise<boolean> {
  const query = new URLSearchParams({ id: `eq.${id}`, render_status: `eq.${when}` });
  const response = await rest(`/rest/v1/social_posts?${query}`, {
    method: "PATCH",
    headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(fields),
  });
  return ((await response.json()) as unknown[]).length > 0;
}

export async function upload(path: string, mp4: Buffer): Promise<void> {
  await rest(`/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: headers({ "Content-Type": "video/mp4", "x-upsert": "true" }),
    body: new Uint8Array(mp4),
  });
}

export async function remove(path: string): Promise<void> {
  await rest(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: [path] }),
  });
}
