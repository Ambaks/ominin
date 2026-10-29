import { useContext } from "react";
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { SCREEN_BY_ID } from "../../../frontend/lib/social/screens.ts";
import type { LookId, PhoneProps } from "../../../frontend/lib/social/script.ts";
import { LookContext } from "../look.ts";
import { progress, wave } from "../motion.ts";
import { Headline } from "./headline.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Une capture réelle de l'outil dans le cadre iPhone du site, sous le titre.
 * Le téléphone monte, l'écran défile jusqu'à la zone qui compte (ZONES) et la
 * caméra s'en approche jusqu'à la dernière image ; un doigt y touche le bouton
 * clé. Toute capture se cadre ainsi, quelle que soit sa mise en page.
 */

const TITLE_SIZE = 3.3;
/* Le haut du plan se fond sur cette hauteur, en px ; la zone se centre entre
 * ce fondu et le haut de la bande d'Instagram, à WINDOW_BOTTOM px du bas. */
const FADE = 60;
const WINDOW_BOTTOM = SAFE.bottom - 20;
/* Hauteur de la zone visée, en px de toile, et échelle du cadre (24 rem) :
 * au plus K_MAX à la fin, K_PUSH de moins au début. */
const ZONE_PX = 820;
const K_MAX = 1.22;
const K_PUSH = 0.12;
/* Cadre du site : liseré de 0,5625 rem autour d'un écran de 22,875 rem, et
 * captures de 780 × 1688 ; hauteurs en part de la largeur, 24 rem de 36 px. */
const PHONE_W = 24 * 36;
const BEZEL = 0.5625 / 24;
const SHOT = 1688 / 780;
const SCREEN_H = (22.875 / 24) * SHOT;
const PHONE_H = SCREEN_H + 2 * BEZEL;
/* L'entrée : montée en px et bascule en degrés, puis la vie à partir de LIFE. */
const ENTER_AT = 6;
const RISE = 320;
const TILT = 12;
const LIFE = 22;
/* Le défilement part du haut de l'écran (son haut calé en haut de la
 * fenêtre, estimée à ZONE_PX) vers la zone, sauf sur un volet (focus
 * « bottom ») dont le haut n'est qu'un fond flou : course bornée en px,
 * durée en part de la vie. */
const SCROLL = [120, 480];
const SCROLL_SPAN = 0.5;
/* Le toucher : quand (part de la vie), appui puis onde, en images. */
const TAP_AT = 0.62;
const PRESS = 8;
const RIPPLE = 16;
/* Balancement du téléphone, en degrés. */
const SWAY = 2;

/* Ce qui compte dans chaque capture, en part de la hauteur de l'écran, et le
 * bouton qu'on y touche (x, y en part de l'écran). Une capture absente se
 * cadre sur son focus. */
type Zone = { zone: [number, number]; tap?: [number, number] };
const ZONES: Record<string, Zone> = {
  "menu-carte": { zone: [0.55, 0.98], tap: [0.55, 0.72] },
  "menu-plats": { zone: [0.3, 0.74], tap: [0.79, 0.655] },
  "menu-plat": { zone: [0.6, 0.99], tap: [0.64, 0.945] },
  "menu-panier": { zone: [0.55, 0.99], tap: [0.64, 0.945] },
  "collect-commande": { zone: [0.55, 0.99], tap: [0.5, 0.945] },
  "collect-paiement": { zone: [0.1, 0.6], tap: [0.2, 0.565] },
  "collect-suivi": { zone: [0.02, 0.47], tap: [0.81, 0.42] },
  "collect-gestion": { zone: [0.05, 0.49], tap: [0.33, 0.435] },
  "shop-vitrine": { zone: [0.13, 0.6], tap: [0.5, 0.57] },
  "shop-produit": { zone: [0.4, 0.92] },
};
const FALLBACK: Record<"top" | "bottom", Zone> = { top: { zone: [0.02, 0.5] }, bottom: { zone: [0.5, 0.99] } };

/* Par habillage : la lumière derrière le téléphone et son ombre portée. */
const HALO: Record<LookId, [string, number, string, number]> = {
  braise: ["--ember-2", 50, "--ember-3", 18],
  nuit: ["--ember-1", 36, "--ember-2", 12],
  lin: ["--ember-1", 30, "--ember-3", 10],
  flamme: ["--background", 60, "--background", 18],
};
const SHADOW: Record<LookId, string> = {
  braise: "rgb(0 0 0 / 0.9)",
  nuit: "rgb(0 0 0 / 0.9)",
  lin: "color-mix(in oklab, var(--foreground) 55%, transparent)",
  flamme: "color-mix(in oklab, var(--ember-3) 60%, transparent)",
};

const mix = (token: string, amount: number) => `color-mix(in oklab, var(${token}) ${amount}%, transparent)`;
const linear = (t: number) => t;

export function Phone({ brand, title, screen }: BlockBrand & PhoneProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const look = useContext(LookContext);
  const focus = SCREEN_BY_ID.get(screen)?.focus ?? "top";
  const { zone, tap } = ZONES[screen] ?? FALLBACK[focus];

  const life = durationInFrames - LIFE;
  const enter = spring({ frame: frame - ENTER_AT, fps, config: { damping: 13, stiffness: 110 } });
  const scrolled = progress(frame, LIFE, SCROLL_SPAN * life, Easing.inOut(Easing.cubic));
  /* L'échelle qui fait tenir la zone, puis l'approche continue jusqu'à la fin. */
  const end = Math.min(K_MAX, ZONE_PX / ((zone[1] - zone[0]) * SCREEN_H * PHONE_W));
  const scale = end - K_PUSH * (1 - progress(frame, LIFE, life, linear));
  /* Centre de la zone, en part de la hauteur du téléphone : c'est là que la
   * caméra vise et qu'elle s'approche. */
  const aim = (BEZEL + ((zone[0] + zone[1]) / 2) * SCREEN_H) / PHONE_H;
  const start = focus === "bottom" ? 0 : (end - K_PUSH) * PHONE_H * PHONE_W * aim - ZONE_PX / 2;
  const course = Math.min(SCROLL[1], Math.max(SCROLL[0], start));
  const y = (1 - enter) * RISE + (1 - scrolled) * course;

  const tapAt = LIFE + Math.min(TAP_AT * life, life - PRESS - RIPPLE);
  const press = progress(frame, tapAt, PRESS);
  const ripple = progress(frame, tapAt + PRESS, RIPPLE, linear);
  const glint = interpolate(scrolled, [0, 1], [-30, 130]);
  const [hot, hotAmount, warm, warmAmount] = HALO[look];

  return (
    <Stage>
      <div className="relative z-10">
        <Eyebrow brand={brand} text="Sur le téléphone" />
        <div className="mt-[0.67rem]">
          <Headline title={title} start={4} size={TITLE_SIZE} />
        </div>
      </div>

      {/* Le plan du téléphone : toute la largeur de la toile, du titre à son bas. */}
      <div className="relative mt-[1.1rem] flex-1">
        <div className="absolute" style={{ top: 0, left: -SAFE.left, right: -SAFE.right, bottom: -SAFE.bottom }}>
          {/* Lumière derrière le téléphone : s'éteint d'elle-même avant le titre. */}
          <div
            className="absolute left-1/2 aspect-square w-[130%]"
            style={{
              top: "48%",
              translate: "-50% -50%",
              opacity: Math.min(1, enter) * (0.85 + 0.15 * wave(frame, durationInFrames, 0.5)),
              background: `radial-gradient(closest-side, ${mix(hot, hotAmount)}, ${mix(warm, warmAmount)} 55%, transparent)`,
            }}
          />

          <div
            className="absolute inset-0"
            style={{ perspective: 2400, mask: `linear-gradient(to bottom, transparent, rgb(0 0 0 / 0.6) ${FADE / 2}px, #000 ${FADE}px)` }}
          >
            {/* La fenêtre où la zone se centre. */}
            <div className="absolute inset-x-0" style={{ top: FADE, bottom: WINDOW_BOTTOM }}>
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  opacity: progress(frame, ENTER_AT, 4),
                  transformOrigin: `50% ${aim * 100}%`,
                  transform: [
                    `translate(-50%, calc(${-aim * 100}% + ${y}px))`,
                    `scale(${scale})`,
                    `rotateX(${(1 - enter) * TILT}deg)`,
                    `rotateY(${wave(frame, durationInFrames, 0.25) * SWAY}deg)`,
                  ].join(" "),
                }}
              >
                <div
                  className="absolute left-1/2 top-full aspect-[4/1] w-[120%]"
                  style={{ translate: "-50% -50%", background: `radial-gradient(closest-side, ${SHADOW[look]}, transparent)` }}
                />
                <div className="relative rounded-[3.9rem]" style={{ boxShadow: `0 60px 110px -30px ${SHADOW[look]}` }}>
                  <IphoneFrame>
                    <Img src={staticFile(`screens/${screen}.jpg`)} className="block w-full" />
                    {/* Reflet sur la vitre, qui la traverse pendant le défilement. */}
                    <div
                      className="absolute inset-0"
                      style={{
                        opacity: Math.sin(scrolled * Math.PI),
                        background: `linear-gradient(115deg, transparent ${glint - 16}%, rgb(255 255 255 / 0.16) ${glint}%, transparent ${glint + 16}%)`,
                      }}
                    />
                    {/* Le doigt : il appuie, puis une onde part du bouton. */}
                    {tap && (
                      <div
                        className="absolute size-[2.6rem]"
                        style={{ left: `${tap[0] * 100}%`, top: `${tap[1] * 100}%`, translate: "-50% -50%" }}
                      >
                        <div
                          className="absolute -inset-[1.3rem] rounded-full"
                          style={{
                            opacity: 0.5 * press * (1 - ripple),
                            background: "radial-gradient(closest-side, rgb(255 255 255 / 0.6), transparent)",
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-full border-[3px] border-white bg-white/35 shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
                          style={{ opacity: press * (1 - ripple), scale: `${1.25 - 0.25 * press}` }}
                        />
                        <div
                          className="absolute inset-0 rounded-full border-2 border-white"
                          style={{ opacity: (1 - ripple) * Math.min(1, ripple * 4), scale: `${1 + 1.6 * ripple}` }}
                        />
                      </div>
                    )}
                  </IphoneFrame>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
}
