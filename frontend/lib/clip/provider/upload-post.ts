import {
  PROVIDER_API_URL,
  PROVIDER_TIMEOUT_MS,
  providerApiKey,
} from "./config";
import {
  CLIP_PLATFORMS,
  type CaptionSet,
  type ClipPlatform,
  type ConnectedAccount,
  type PlatformAnalytics,
  type PlatformResult,
  type PostStatus,
  type PostSubmission,
} from "./types";

/*
 * Adapter upload-post : seul fichier du dépôt qui connaisse ce prestataire.
 * Changer de prestataire (API directes des plateformes, autre agrégateur) =
 * réécrire ce fichier derrière la même surface, sans toucher routes ni UI.
 */

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${PROVIDER_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Apikey ${providerApiKey()}`,
      ...init.headers,
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request(path, init);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Prestataire de publication : ${response.status} sur ${path}${body ? ` — ${body.slice(0, 300)}` : ""}`
    );
  }
  return (await response.json()) as T;
}

function isClipPlatform(value: string): value is ClipPlatform {
  return (CLIP_PLATFORMS as readonly string[]).includes(value);
}

/** Crée le profil chez le prestataire ; un profil déjà existant (409) est un succès. */
async function ensureProfile(username: string): Promise<void> {
  const response = await request("/uploadposts/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!response.ok && response.status !== 409) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Prestataire de publication : création du profil impossible (${response.status})${body ? ` — ${body.slice(0, 300)}` : ""}`
    );
  }
}

/** URL de la page hébergée où le clipper connecte ses comptes (valide 48 h). */
async function createLinkUrl(
  username: string,
  redirectUrl: string
): Promise<string> {
  const data = await requestJson<{ access_url: string }>(
    "/uploadposts/users/generate-jwt",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        redirect_url: redirectUrl,
        platforms: CLIP_PLATFORMS,
        language: "fr",
        connect_title: "Connectez vos comptes",
        connect_description:
          "Choisissez les réseaux à relier à votre espace Ominin Clip.",
      }),
    }
  );
  return data.access_url;
}

interface RawSocialAccount {
  username?: string;
  handle?: string;
  display_name?: string;
  reauth_required?: boolean;
}

async function listConnectedAccounts(
  username: string
): Promise<ConnectedAccount[]> {
  const data = await requestJson<{
    profile?: {
      social_accounts?: Record<string, RawSocialAccount | string | null>;
    };
  }>(`/uploadposts/users/${encodeURIComponent(username)}`);

  const raw = data.profile?.social_accounts ?? {};
  const accounts: ConnectedAccount[] = [];
  for (const [platform, value] of Object.entries(raw)) {
    // Le prestataire renvoie null / "" pour une plateforme non connectée.
    if (!isClipPlatform(platform) || !value) continue;
    const account = typeof value === "string" ? { username: value } : value;
    const handle = account.handle ?? account.username ?? "";
    if (!handle) continue;
    accounts.push({
      platform,
      handle,
      displayName: account.display_name ?? handle,
      reauthRequired: account.reauth_required ?? false,
    });
  }
  return accounts;
}

/** Champs de titre par plateforme attendus par l'API d'upload. */
const CAPTION_FIELDS: Record<ClipPlatform, string> = {
  tiktok: "tiktok_title",
  instagram: "instagram_title",
  youtube: "youtube_title",
  x: "x_title",
};

async function submitPost(submission: PostSubmission): Promise<string> {
  const form = new FormData();
  form.set("user", submission.username);
  form.set("video", submission.videoUrl);
  form.set("title", submission.title);
  form.set("async_upload", "true");
  for (const platform of submission.platforms) {
    form.append("platform[]", platform);
    const caption = submission.captions[platform];
    if (caption?.title) form.set(CAPTION_FIELDS[platform], caption.title);
    if (platform === "youtube" && caption?.description) {
      form.set("youtube_description", caption.description);
    }
  }

  const data = await requestJson<{ request_id?: string }>("/upload", {
    method: "POST",
    headers: { "Idempotency-Key": submission.idempotencyKey },
    body: form,
  });
  if (!data.request_id) {
    throw new Error("Prestataire de publication : request_id absent de la réponse.");
  }
  return data.request_id;
}

async function getPostStatus(requestId: string): Promise<PostStatus> {
  const data = await requestJson<{
    status?: string;
    results?: {
      platform?: string;
      success?: boolean;
      message?: string;
    }[];
  }>(`/uploadposts/status?request_id=${encodeURIComponent(requestId)}`);

  const results: PlatformResult[] = (data.results ?? [])
    .filter((entry) => entry.platform && isClipPlatform(entry.platform))
    .map((entry) => ({
      platform: entry.platform as ClipPlatform,
      success: entry.success ?? false,
      message: entry.message ?? "",
    }));

  if (data.status !== "completed") {
    return { state: "en_cours", results };
  }
  const successes = results.filter((entry) => entry.success).length;
  const state =
    successes === 0 ? "echec" : successes === results.length ? "publie" : "partiel";
  return { state, results };
}

interface RawAnalytics {
  followers?: number;
  views?: number;
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  reach_timeseries?: { date?: string; value?: number }[];
}

async function getAnalytics(
  username: string,
  platforms: ClipPlatform[]
): Promise<PlatformAnalytics[]> {
  if (platforms.length === 0) return [];
  const data = await requestJson<Record<string, RawAnalytics | null>>(
    `/analytics/${encodeURIComponent(username)}?platforms=${platforms.join(",")}`
  );

  const analytics: PlatformAnalytics[] = [];
  for (const platform of platforms) {
    const raw = data[platform];
    if (!raw || typeof raw !== "object") continue;
    analytics.push({
      platform,
      followers: raw.followers ?? 0,
      views: raw.views ?? raw.impressions ?? 0,
      reach: raw.reach ?? 0,
      likes: raw.likes ?? 0,
      comments: raw.comments ?? 0,
      shares: raw.shares ?? 0,
      reachTimeseries: (raw.reach_timeseries ?? [])
        .filter((point) => point.date != null && point.value != null)
        .map((point) => ({ date: point.date as string, value: point.value as number })),
    });
  }
  return analytics;
}

export const uploadPostProvider = {
  ensureProfile,
  createLinkUrl,
  listConnectedAccounts,
  submitPost,
  getPostStatus,
  getAnalytics,
};

export type ClipProvider = typeof uploadPostProvider;
export type { CaptionSet };
