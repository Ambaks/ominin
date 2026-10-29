import { type ReactNode, useContext } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Easing } from "remotion";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { LookContext } from "../look.ts";
import { progress, wave } from "../motion.ts";

export type BlockBrand = { brand: SocialBrand };

/*
 * Le plateau commun des scènes : fond des landings (grille, halo de braise
 * qui respire, selon l'habillage de la publication — src/loop.css) et zone
 * sûre d'un Reel — l'interface d'Instagram couvre
 * environ 250 px en haut, 400 px en bas et une colonne d'icônes à droite.
 * Une caméra avance lentement sur toute la scène : aucune image n'est figée,
 * même quand le bloc a fini son entrée.
 */

export const SAFE = { top: 260, bottom: 400, left: 80, right: 160 };
/* L'avancée de la caméra sur la scène entière, en part de la taille. */
const CAMERA_PUSH = 0.03;

export function Stage({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const look = useContext(LookContext);
  return (
    <AbsoluteFill className={`loop look-${look} kit-landing bg-background text-foreground`}>
      {/* Fond débordant de 15 % : un zoom ou un glissement de transition
          n'en montre jamais le bord. */}
      <div className="kit-grid absolute -inset-[15%]" />
      <div
        className="stage-halo absolute -inset-[15%]"
        style={{
          transform: `translate3d(${wave(frame, durationInFrames) * -40}px, ${wave(frame, durationInFrames, 0.25) * 30}px, 0)`,
        }}
      />
      <div
        className="absolute flex flex-col"
        style={{
          top: SAFE.top,
          bottom: SAFE.bottom,
          left: SAFE.left,
          right: SAFE.right,
          // Ancrée à droite : le texte ne déborde pas vers la colonne d'icônes.
          transformOrigin: "80% 45%",
          transform: `scale(${1 + CAMERA_PUSH * progress(frame, 0, durationInFrames, Easing.inOut(Easing.sin))})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** L'étiquette braise des landings : « ● Commande à table ». La marque se lit
 * déjà ailleurs (adresse, conversation) : l'étiquette garde sa place pour
 * rester lisible sur un téléphone. */
export function Eyebrow({ text, start = 0 }: { brand: SocialBrand; text: string; start?: number }) {
  const frame = useCurrentFrame();
  return (
    <p
      className="flex items-center gap-[0.35rem] text-[1.15rem] font-semibold uppercase tracking-[0.14em] text-ember-1"
      style={{ opacity: progress(frame, start, 12) }}
    >
      <span className="size-[0.36rem] rounded-full bg-ember-1" />
      {text}
    </p>
  );
}
