import { Easing, Img, spring, staticFile, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { SCREENS } from "../../../frontend/lib/social/screens.ts";
import { progress, wave } from "../motion.ts";

/*
 * La preuve du second côté : le téléphone du client, à 80 % de la largeur,
 * monte du bas de la toile en ressort, sous l'interface du Reel (il n'y
 * porte que du décor). Un autre écran que celui des points. Puis le client
 * fait défiler la carte, en deux gestes, jusqu'à la fin ; le téléphone
 * flotte, un reflet passe sur la vitre.
 */

/** Hauteur du téléphone qui dépasse dans la toile, en px. */
export const PHONE_VISIBLE = 500;
const SCREEN_HEIGHT = 900;
/* Barre d'état au-dessus de la capture, qui commence en pleine page : l'île ne couvre rien. */
const STATUS_BAR = 96;
/* Défilement de la carte : position après chaque geste, en px de la toile, et durée d'un geste en images. */
const SCROLL = { stops: [460, 760], flick: 18 };
const GLOW = { width: 1200, height: 760 };
const GLASS = { every: 60, sweep: 30 };

/** at : arrivée ; scrollAt : les deux gestes ; frame : horloge de l'entrée ; clock : horloge réelle. */
export function SplitPhone({ brand, at, scrollAt, frame, clock }: { brand: SocialBrand; at: number; scrollAt: [number, number]; frame: number; clock: number }) {
  const { fps, durationInFrames } = useVideoConfig();
  const screens = SCREENS.filter((s) => s.brand === brand && !s.focus);
  const screen = screens[screens.length - 1] ?? SCREENS[0];
  const enter = spring({ frame: frame - at, fps, config: { damping: 18, stiffness: 170 } });
  const flick = (start: number) => progress(frame, start, SCROLL.flick, Easing.bezier(0.3, 0, 0.1, 1));
  const scroll = flick(scrollAt[0]) * SCROLL.stops[0] + flick(scrollAt[1]) * (SCROLL.stops[1] - SCROLL.stops[0]);
  const since = frame - at - 12;
  const glass = since < 0 ? -1 : progress(since % GLASS.every, 0, GLASS.sweep);

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center" style={{ height: PHONE_VISIBLE }}>
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full"
        style={{
          width: GLOW.width,
          height: GLOW.height,
          marginTop: -GLOW.height / 3,
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 40%, transparent), transparent)",
          opacity: Math.min(1, enter) * (0.8 + wave(clock, durationInFrames) * 0.2),
        }}
      />
      <div
        className="absolute top-0"
        style={{
          transformOrigin: "50% 0",
          filter: "drop-shadow(0 -24px 60px rgb(0 0 0 / 0.6)) drop-shadow(0 -4px 12px rgb(0 0 0 / 0.25))",
          transform: `perspective(2400px) translateY(${(1 - enter) * (PHONE_VISIBLE + 80) + wave(clock, durationInFrames, 0.25) * 8}px) rotateX(${(1 - enter) * 14}deg)`,
        }}
      >
        <IphoneFrame>
          <div className="relative bg-black" style={{ height: SCREEN_HEIGHT }}>
            <Img src={staticFile(`screens/${screen.id}.jpg`)} className="absolute inset-x-0 block w-full" style={{ top: STATUS_BAR - scroll }} />
            <div className="absolute inset-x-0 top-0 bg-black" style={{ height: STATUS_BAR }} />
            <div
              className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/15 to-transparent"
              style={{ left: `${-60 + glass * 170}%`, opacity: glass < 0 ? 0 : 1, transform: "skewX(-20deg)" }}
            />
          </div>
        </IphoneFrame>
      </div>
    </div>
  );
}
