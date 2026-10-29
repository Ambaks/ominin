import { Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { SCREENS } from "../../../frontend/lib/social/screens.ts";
import { progress, wave } from "../motion.ts";
import { stepsClock } from "./steps-path.tsx";

/*
 * Le produit, écran par écran : un téléphone monte du pied de la toile, sous
 * l'interface, et passe à l'écran suivant de l'offre à chaque étape, comme
 * une navigation, en même temps que la carte. Écrans : le premier, le deuxième
 * et le dernier de l'offre, l'arrivée du parcours ; une fois au bout, l'écran
 * défile doucement jusqu'à la fin (sauf un écran montré par le bas).
 */

/** Échelle du cadre (w-96 du site) : un peu moins de la moitié de la largeur utile. */
const ZOOM = 0.56;
/** Défilement de l'écran après la dernière étape, en px de l'écran. */
const SCROLL = 220;
/** Seul le haut du téléphone est sur la toile : un écran dont l'essentiel est en bas y monte, en % de sa hauteur. */
const FOCUS_LIFT = 45;
const ENTER = { at: 6, damping: 18, stiffness: 120, rise: 1400, tilt: 14 };

function screensOf(brand: SocialBrand) {
  const own = SCREENS.filter((screen) => screen.brand === brand);
  const list = own.length ? own : SCREENS.filter((screen) => screen.brand === SCREENS[0].brand);
  return list.length >= 3 ? [list[0], list[1], list[list.length - 1]] : [0, 1, 2].map((index) => list[index % list.length]);
}

export function StepsPhone({ brand }: { brand: SocialBrand }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { lit, along } = stepsClock(frame, durationInFrames);
  const enter = spring({ frame: frame - ENTER.at, fps, config: { damping: ENTER.damping, stiffness: ENTER.stiffness } });
  const scroll = progress(frame, lit[2] + 6, durationInFrames - lit[2] - 6, (t) => t * t * (3 - 2 * t));
  const glass = progress(frame, ENTER.at, durationInFrames - ENTER.at, (t) => t);
  return (
    <div
      className="relative"
      style={{
        zoom: ZOOM,
        transformOrigin: "50% 0",
        filter: "drop-shadow(0 -30px 70px rgb(0 0 0 / 0.55))",
        transform: `perspective(2400px) translateY(${(1 - enter) * ENTER.rise + wave(frame, durationInFrames, 0.25) * 28}px) rotateX(${(1 - enter) * ENTER.tilt}deg)`,
      }}
    >
      <IphoneFrame>
        <div className="flex" style={{ transform: `translateX(${-along * 100}%)` }}>
          {screensOf(brand).map((screen, index) => (
            <Img
              key={index}
              src={staticFile(`screens/${screen.id}.jpg`)}
              className="block w-full shrink-0"
              style={{
                transform: screen.focus === "bottom" ? `translateY(-${FOCUS_LIFT}%)` : `translateY(${index === 2 ? -scroll * SCROLL : 0}px)`,
              }}
            />
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/8 to-transparent"
          style={{ transform: `translateX(${-120 + glass * 340}%) skewX(-20deg)` }}
        />
      </IphoneFrame>
    </div>
  );
}
