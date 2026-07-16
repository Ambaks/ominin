/*
 * Types neutres du prestataire de publication. Aucun nom de prestataire ici :
 * l'adapter (upload-post.ts) les implémente, les route handlers et le store
 * client ne connaissent que cette surface.
 */

export const CLIP_PLATFORMS = ["tiktok", "instagram", "youtube", "x"] as const;
export type ClipPlatform = (typeof CLIP_PLATFORMS)[number];

export interface ConnectedAccount {
  platform: ClipPlatform;
  handle: string;
  displayName: string;
  reauthRequired: boolean;
}

/** Titres/descriptions par plateforme, figés au moment de la publication. */
export type CaptionSet = Partial<
  Record<ClipPlatform, { title: string; description?: string }>
>;

export interface PostSubmission {
  username: string;
  videoUrl: string;
  title: string;
  captions: CaptionSet;
  platforms: ClipPlatform[];
  idempotencyKey: string;
}

export interface PlatformResult {
  platform: ClipPlatform;
  success: boolean;
  message: string;
}

export interface PostStatus {
  state: "en_cours" | "publie" | "partiel" | "echec";
  results: PlatformResult[];
}

export interface PlatformAnalytics {
  platform: ClipPlatform;
  followers: number;
  views: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  reachTimeseries: { date: string; value: number }[];
}
