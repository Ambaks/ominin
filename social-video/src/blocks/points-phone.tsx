import { Img, spring, staticFile, useVideoConfig } from "remotion";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import type { SocialBrand } from "../../../frontend/lib/social/brands.ts";
import { SCREENS } from "../../../frontend/lib/social/screens.ts";
import { progress, wave } from "../motion.ts";

/*
 * Le téléphone du client, qui sort du bas de la toile : sur l'écran d'accueil
 * de l'offre, un volet monte et les points s'y cochent l'un après l'autre,
 * compteur en tête, et le grand bouton du volet se remplit de braise à chaque
 * coche. Rien d'autre que les points n'est écrit : la preuve reste neutre.
 * Une fois tout coché, le bouton prend sa coche, puis chaque point s'allume à
 * son tour, avec le compteur, jusqu'à la fin.
 */

/** Hauteur de l'écran rendu ; le bas sort de la toile. */
const SCREEN_HEIGHT = 1300;
/** Haut du volet dans l'écran : la capture reste visible au-dessus. */
const SHEET_TOP = 150;
/** Hauteur de la liste : les points se la partagent, à deux comme à trois. */
const ROWS_HEIGHT = 500;
/* La flaque de braise, centrée sur le haut du téléphone. */
const GLOW = { width: 1200, height: 900 };
const AT = { phone: 6, sheet: 14, rows: 20, rowGap: 7, check: 7, fill: 5, draw: 8, turn: 30, sheenEvery: 45, sheen: 20 };

const check = (
  <path d="M15 27l8 8 15-17" fill="none" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} />
);

export function PointsPhone({ brand, points, frame }: { brand: SocialBrand; points: string[]; frame: number }) {
  const { fps, durationInFrames } = useVideoConfig();
  const screen = SCREENS.find((s) => s.brand === brand && !s.focus) ?? SCREENS[0];
  const pop = (at: number, damping = 14) => spring({ frame: frame - at, fps, config: { damping, stiffness: 140 } });
  const enter = pop(AT.phone, 18);
  const sheet = pop(AT.sheet, 20);
  const checkAt = (index: number) => AT.rows + index * AT.rowGap + AT.check;
  const done = points.filter((_, index) => frame >= checkAt(index) + AT.fill).length;
  const filled = progress(frame, checkAt(0), checkAt(points.length - 1) + AT.fill - checkAt(0));
  const complete = checkAt(points.length - 1) + AT.draw;
  const seal = pop(complete, 9);
  const sealDraw = progress(frame, complete, AT.fill);
  /* Après l'accent final, un point s'allume à son tour, toutes les AT.turn images. */
  const after = frame - complete - AT.draw;
  const lit = after < 0 ? -1 : Math.floor(after / AT.turn) % points.length;
  const beat = after < 0 ? 0 : Math.sin(((after % AT.turn) / AT.turn) * Math.PI);
  const sheen = after < 0 ? 0 : progress(after % AT.sheenEvery, 0, AT.sheen);
  const glass = progress(frame, AT.phone, durationInFrames - AT.phone, (t) => t);

  return (
    <div className="relative flex justify-center">
      <div
        className="absolute left-1/2 -z-10 -translate-x-1/2 rounded-full"
        style={{
          top: -GLOW.height / 2,
          width: GLOW.width,
          height: GLOW.height,
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 42%, transparent), transparent)",
          opacity: enter * (0.8 + wave(frame, durationInFrames) * 0.2),
        }}
      />
      <div
        style={{
          transformOrigin: "50% 0",
          filter: "drop-shadow(0 -24px 60px rgb(0 0 0 / 0.6))",
          transform: `perspective(2400px) translateY(${(1 - enter) * 760 + wave(frame, durationInFrames, 0.25) * 10}px) rotateX(${(1 - enter) * 20}deg)`,
        }}
      >
        <IphoneFrame>
          <div className="relative" style={{ height: SCREEN_HEIGHT }}>
            <Img src={staticFile(`screens/${screen.id}.jpg`)} className="absolute inset-x-0 top-0 block w-full" />
            <div className="absolute inset-0 bg-black" style={{ opacity: sheet * 0.45 }} />
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-[48px] border-t border-hairline bg-surface px-[18px] pt-[18px] shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.7)]"
              style={{ top: SHEET_TOP, transform: `translateY(${(1 - sheet) * (SCREEN_HEIGHT - SHEET_TOP)}px)` }}
            >
              <div className="mx-auto h-[8px] w-[96px] rounded-full bg-hairline" />
              <div className="mt-[22px] flex items-center justify-between px-[8px]">
                <span
                  className={`kit-display text-[64px] tabular-nums ${done === points.length ? "ember-text" : ""}`}
                  style={{ transform: `scale(${1 + Math.sin(progress(frame, complete, 10) * Math.PI) * 0.15 + beat * 0.05})`, transformOrigin: "left center" }}
                >
                  {done}/{points.length}
                </span>
                <span className="flex gap-[14px]">
                  {points.map((point, index) => (
                    <span key={point} className="size-[24px] rounded-full bg-hairline">
                      <span
                        className="ember-gradient block size-full rounded-full"
                        style={{ opacity: progress(frame, checkAt(index), AT.fill), transform: `scale(${1 + (index === lit ? beat * 0.35 : 0)})` }}
                      />
                    </span>
                  ))}
                </span>
              </div>
              <ul className="mt-[24px] flex flex-col" style={{ height: ROWS_HEIGHT, gap: points.length < 3 ? 28 : 22 }}>
                {points.map((point, index) => {
                  const rise = pop(AT.rows + index * AT.rowGap, 10);
                  const fill = progress(frame, checkAt(index), AT.fill);
                  const bump = Math.sin(progress(frame, checkAt(index), AT.draw) * Math.PI);
                  const glow = index === lit ? beat : 0;
                  const tick = progress(frame, checkAt(index) + 2, AT.draw);
                  return (
                    <li
                      key={point}
                      className="flex flex-1 items-center gap-[20px] rounded-[32px] border px-[22px] py-[14px]"
                      style={{
                        opacity: Math.min(1, rise * 5),
                        transform: `translateY(${(1 - rise) * 60}px) scale(${1 + glow * 0.02})`,
                        borderColor: `color-mix(in oklab, var(--ember-2) ${fill * 30 + glow * 45}%, var(--hairline))`,
                        background: `color-mix(in oklab, var(--ember-2) ${glow * 12}%, color-mix(in oklab, var(--background) 70%, transparent))`,
                        boxShadow: "inset 0 1.5px 0 rgb(255 255 255 / 0.08), 0 22px 40px -18px rgb(0 0 0 / 0.9)",
                      }}
                    >
                      <span
                        className="relative flex size-[56px] shrink-0 items-center justify-center rounded-full border-[3px] border-ember-2/60"
                        style={{ transform: `scale(${1 + bump * 0.22 + glow * 0.12})` }}
                      >
                        <span
                          className="ember-gradient absolute -inset-[3px] rounded-full"
                          style={{ opacity: fill, boxShadow: `0 0 ${18 + glow * 30}px -4px var(--ember-2)` }}
                        />
                        <svg viewBox="0 0 52 52" className="relative size-full stroke-background" style={{ strokeDashoffset: 1 - tick, opacity: tick > 0 ? 1 : 0 }} aria-hidden>
                          {check}
                        </svg>
                      </span>
                      <span className="text-balance text-[42px] font-bold leading-[1.08] tracking-[-0.015em]">{point}</span>
                    </li>
                  );
                })}
              </ul>
              {/* Le bouton du volet : il se remplit à chaque coche, puis prend la sienne. */}
              <div
                className="relative mt-[48px] h-[160px] overflow-hidden rounded-full border border-hairline bg-background/60"
                style={{ boxShadow: `0 40px 90px -20px color-mix(in oklab, var(--ember-2) ${filled * 70}%, transparent)` }}
              >
                <div className="ember-gradient absolute inset-0 origin-left" style={{ transform: `scaleX(${filled})` }} />
                <div
                  className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/40 to-transparent"
                  style={{ transform: `translateX(${-110 + sheen * 420}%) skewX(-18deg)` }}
                />
                <svg
                  viewBox="0 0 52 52"
                  className="absolute left-1/2 top-1/2 size-[110px] stroke-background"
                  style={{ transform: `translate(-50%, -50%) scale(${0.6 + seal * 0.4})`, strokeDashoffset: 1 - sealDraw, opacity: sealDraw > 0 ? 1 : 0 }}
                  aria-hidden
                >
                  {check}
                </svg>
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/6 to-transparent"
              style={{ transform: `translateX(${-120 + glass * 340}%) skewX(-20deg)` }}
            />
          </div>
        </IphoneFrame>
      </div>
    </div>
  );
}
