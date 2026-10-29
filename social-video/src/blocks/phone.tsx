import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { SCREEN_BY_ID } from "../../../frontend/lib/social/screens.ts";
import type { PhoneProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { Headline } from "./headline.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Une capture réelle de l'outil dans le cadre iPhone du site, de près : le
 * téléphone monte déjà grand, puis la caméra glisse lentement le long de
 * l'écran jusqu'à la dernière image, comme un défilement. Il ne monte jamais
 * sur le titre : ce qui passe dessous s'y fond.
 */

const TITLE_SIZE = 3.3;
/* Échelle du cadre du site (24 rem), et sa lente dérive sur la scène. */
const SCALE = 1.1;
const DRIFT = 0.02;
/* Le haut du plan se fond sur cette hauteur, en px. */
const FADE = 56;
/* Focus « bottom » : où se pose le bas du téléphone, en px sous le titre. */
const BOTTOM_Y = 1040;
/* Glissement de la caméra sur la scène, en px, selon le focus. */
const PAN = { top: 460, bottom: 110 };
/* L'entrée : montée en px, puis la vie à partir de cette image. */
const RISE = 700;
const SETTLED = 14;

const ring = "color-mix(in oklab, var(--ember-1) 35%, transparent)";

export function Phone({ brand, title, screen }: BlockBrand & PhoneProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const focus = SCREEN_BY_ID.get(screen)!.focus ?? "top";
  /* Point du téléphone calé sur le plan : son haut, ou son bas. */
  const anchor = focus === "bottom" ? 1 : 0;
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 150 } });
  const shown = Math.min(1, enter);
  const life = progress(frame, SETTLED, durationInFrames - SETTLED, Easing.inOut(Easing.sin));
  const pan = PAN[focus] * (life - anchor);
  const edge = 220 + 360 * progress(frame, 0, durationInFrames, (t) => t);

  return (
    <Stage>
      <div className="relative z-10">
        <Eyebrow brand={brand} text="Sur le téléphone" />
        <div className="mt-[0.67rem]">
          <Headline title={title} start={4} size={TITLE_SIZE} />
        </div>
      </div>

      {/* Le plan du téléphone : centré sur la toile, sous le titre, jusqu'au bas de la toile. */}
      <div className="relative mt-[1.1rem] flex-1">
        <div
          className="absolute"
          style={{
            top: 0,
            left: -SAFE.left,
            right: -SAFE.right,
            bottom: -SAFE.bottom,
            mask: `linear-gradient(to bottom, transparent, #000 ${FADE}px)`,
          }}
        >
          <div className="absolute inset-0" style={{ perspective: 2400 }}>
            <div
              className="absolute inset-x-0 flex justify-center"
              style={{ top: anchor ? BOTTOM_Y : FADE, transform: `translateY(${-anchor * 100}%)` }}
            >
              <div
                className="relative"
                style={{
                  opacity: Math.min(1, enter * 3),
                  transformOrigin: `50% ${anchor * 100}%`,
                  transform: [
                    `translateY(${(1 - enter) * RISE - pan + wave(frame, durationInFrames) * 6}px)`,
                    `scale(${interpolate(enter, [0, 1], [0.94, 1]) * SCALE + life * DRIFT})`,
                    `rotateX(${interpolate(enter, [0, 1], [10, 0])}deg)`,
                    `rotateY(${wave(frame, durationInFrames, 0.25)}deg)`,
                  ].join(" "),
                }}
              >
                {/* Halo braise net, derrière ce que la caméra regarde. */}
                <div
                  className="absolute left-1/2 aspect-square w-[150%]"
                  style={{
                    top: `${35 + anchor * 40}%`,
                    translate: "-50% -50%",
                    opacity: shown * (0.85 + 0.15 * wave(frame, durationInFrames, 0.5)),
                    background:
                      "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 50%, transparent), color-mix(in oklab, var(--ember-3) 18%, transparent) 60%, transparent)",
                  }}
                />
                {/* Le sol sous le téléphone : une lueur braise et une ombre douce. */}
                <div
                  className="absolute left-1/2 top-full aspect-[3/1] w-[130%]"
                  style={{
                    translate: "-50% -42%",
                    opacity: shown,
                    background: [
                      "radial-gradient(closest-side, rgb(0 0 0 / 0.55), transparent 70%)",
                      "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 45%, transparent), color-mix(in oklab, var(--ember-3) 15%, transparent) 65%, transparent)",
                    ].join(", "),
                  }}
                />

                <div
                  className="relative rounded-[3.9rem]"
                  style={{
                    boxShadow:
                      "0 70px 120px -30px rgb(0 0 0 / 0.9), 0 0 160px -30px color-mix(in oklab, var(--ember-2) 60%, transparent)",
                  }}
                >
                  <IphoneFrame>
                    <Img src={staticFile(`screens/${screen}.jpg`)} className="block w-full" />
                  </IphoneFrame>
                  {/* Liseré braise de 2 px : une lueur en fait le tour sur la scène. */}
                  <div
                    className="pointer-events-none absolute -inset-[3px] rounded-[calc(3.9rem+3px)] p-[2px]"
                    style={{
                      background: `conic-gradient(from ${edge}deg, ${ring}, var(--ember-1) 40deg, ${ring} 90deg)`,
                      mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      maskComposite: "exclude",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}
