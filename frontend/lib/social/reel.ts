/*
 * Script d'un Reel tel que l'agent l'écrit (social_posts.reel), modifiable
 * dans l'admin et monté par social-video/ (Remotion). Miroir de ReelScene
 * dans backend/app/prompts/social.py.
 */

export type ReelVisual = "demo" | "screen" | "stock" | "title";

export interface ReelScene {
  /** Ce que dit la voix off. */
  voiceover: string;
  /** Texte à l'écran ; les mots entre [[ ]] sur le dégradé. */
  caption: string;
  visual: ReelVisual;
  /** Id dans le catalogue du visuel : démo filmée (demo, lib/social/clips),
   * capture (screen, lib/social/screens), vidéo de personnes (stock,
   * lib/social/stock) ; "" pour un texte seul. */
  media: string;
}

export interface ReelScript {
  scenes: ReelScene[];
  /** Appel à l'action de l'écran final. */
  cta: string;
  /** Musique sous la voix (lib/social/music), ou "" : la voix seule. */
  music: string;
}

export type RenderStatus = "pending" | "rendering" | "ready" | "failed";

/** URL publique d'un Reel rendu (bucket social-videos). */
export function videoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-videos/${path}`;
}
