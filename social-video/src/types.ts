import type { SocialBrand } from "../../frontend/lib/social/brands.ts";
import type { ReelVisual } from "../../frontend/lib/social/reel.ts";

import type { PostScript } from "../../frontend/lib/social/script.ts";

export type { ReelScript } from "../../frontend/lib/social/reel.ts";

/** Scène prête à monter : médias résolus, durée fixée par la voix. */
export interface RenderScene {
  caption: string;
  voiceover: string;
  visual: ReelVisual;
  /** staticFile (démo filmée, capture) ou URL (vidéo de personnes, Mixkit). */
  src: string | null;
  /** Démo filmée : où commence le parcours dans l'enregistrement, et sa
   * durée utile, en secondes — la scène la joue en entier, accélérée. */
  clipStart: number;
  clipSeconds: number;
  /** Capture cadrée en bas (lib/social/screens). */
  focusBottom: boolean;
  voice: string;
  frames: number;
}

export interface ReelProps extends Record<string, unknown> {
  brand: SocialBrand;
  scenes: RenderScene[];
  cta: string;
  /** URL du morceau (catalogue Mixkit), ou null : la voix seule. */
  music: string | null;
}

export interface PostProps extends PostScript, Record<string, unknown> {}
