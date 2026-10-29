import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND_BY_ID } from "../../../frontend/lib/social/brands.ts";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";

export type BlockBrand = { brand: SocialBrand };
import { progress, wave } from "../motion.ts";

/*
 * Le plateau commun des scènes : fond des landings (grille, halo de braise
 * qui respire) et zone sûre d'un Reel — l'interface d'Instagram couvre
 * environ 250 px en haut, 400 px en bas et une colonne d'icônes à droite.
 */

export const SAFE = { top: 260, bottom: 400, left: 80, right: 160 };

export function Stage({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill className="loop kit-landing bg-background text-foreground">
      {/* Fond débordant de 15 % : un zoom ou un glissement de transition
          n'en montre jamais le bord. */}
      <div className="kit-grid absolute -inset-[15%]" />
      <div
        className="absolute -inset-[15%]"
        style={{
          background: [
            "radial-gradient(circle 620px at 78% 52%, color-mix(in oklab, var(--ember-2) 38%, transparent), transparent)",
            "radial-gradient(circle 520px at 12% 88%, color-mix(in oklab, var(--ember-3) 26%, transparent), transparent)",
          ].join(", "),
          transform: `translate3d(${wave(frame, durationInFrames) * -40}px, ${wave(frame, durationInFrames, 0.25) * 30}px, 0)`,
        }}
      />
      <div className="absolute flex flex-col" style={{ top: SAFE.top, bottom: SAFE.bottom, left: SAFE.left, right: SAFE.right }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** L'étiquette braise des landings : « ● Ominin Menu · Commande à table ». */
export function Eyebrow({ brand, text, start = 0 }: { brand: SocialBrand; text: string; start?: number }) {
  const frame = useCurrentFrame();
  return (
    <p
      className="flex items-center gap-[0.3rem] text-[0.9rem] font-semibold uppercase tracking-[0.2em] text-ember-1"
      style={{ opacity: progress(frame, start, 12) }}
    >
      <span className="size-[0.32rem] rounded-full bg-ember-1" />
      {BRAND_BY_ID.get(brand)!.name} · {text}
    </p>
  );
}
