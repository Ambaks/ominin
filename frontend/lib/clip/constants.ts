import type { ClipPlatform } from "./provider/types";
import type { ClipPostStatus } from "./types";

/** Plafond fichier du palier gratuit Supabase (aligné sur le bucket clips). */
export const MAX_CLIP_BYTES = 50 * 1024 * 1024;

/** Formats vidéo acceptés (type MIME → extension), alignés sur le bucket. */
export const ACCEPTED_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Cadence de vérification du statut d'une publication en cours. */
export const POLL_INTERVAL_MS = 5000;
/** Au-delà, on arrête d'interroger : le prochain passage sur la page reprendra. */
export const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export const POSTS_PAGE_SIZE = 50;

export const STATUS_LABELS: Record<ClipPostStatus, string> = {
  en_cours: "Publication en cours",
  publie: "Publié",
  partiel: "Partiellement publié",
  echec: "Échec",
};

export const PLATFORM_LABELS: Record<ClipPlatform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram Reels",
  youtube: "YouTube Shorts",
  x: "X",
};
