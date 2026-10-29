import type { ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SplitProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { PHONE_VISIBLE, SplitPhone } from "./split-phone.tsx";
import { SplitTitle } from "./split-title.tsx";
import { SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Le face-à-face : le titre, puis l'écran se coupe en deux bandes obliques
 * de toute la largeur. La première, hachurée, se déroule sous son bord ; on
 * la lit seule un instant. Puis la couture de braise se trace, le disque
 * pivot se pose, la première phrase est barrée et s'éteint, et la seconde
 * bande, pleine, coule de la couture avec sa phrase, plus grande. Le
 * téléphone du client monte enfin du bas de la toile. Jusqu'à la fin, la
 * seconde phrase avance, la première recule, la couture brille.
 */

/* En dessous, l'entrée se joue plus vite pour finir à temps. */
const PACE_FRAMES = 90;
/* Images où chaque temps commence. */
const AT = { before: 4, beforeText: 6, cut: 21, after: 23, afterText: 25, check: 31, life: 36 };
/* Le téléphone monte quand la seconde phrase est posée, puis on fait défiler la carte. */
const PHONE_AFTER_WORDS = 4;
/* Déroulé de chaque bande, en images. */
const WIPE = { before: 11, after: 10 };
/* Pente des bandes (px de dénivelé sur la largeur), écart entre elles, trait de la couture, en px. */
const SLANT = 72;
const GAP = 40;
const SEAM = 7;
/* Écart du titre aux bandes, en px. */
const TITLE_GAP = 32;
/* Mots de la seconde phrase : écart et montée, en images. */
const WORD = { stagger: 1, fade: 2, rise: 9 };
/* Hachures du premier côté : trait et pas en px, encre en % du texte, glissement en px par image. */
const HATCH = { line: 2, step: 26, ink: 13, drift: 0.6 };
/* Temps de vie, en images : battement du disque, reflet de l'étiquette, éclat sur la couture. */
const PULSE_EVERY = 30;
const SHEEN = { every: 60, sweep: 20 };
const GLINT = { every: 40, sweep: 22 };
/* Jusqu'à la fin, la seconde phrase avance et la première recule, d'autant. */
const PUSH = 0.03;

/** Monte flou et se pose net, à partir de at. */
function Rise({ frame, at, children, className = "" }: { frame: number; at: number; children: ReactNode; className?: string }) {
  const rise = progress(frame, at, 10);
  return (
    <div
      className={className}
      style={{ opacity: progress(frame, at, 4), transform: `translateY(${(1 - rise) * 28}px)`, filter: `blur(${(1 - rise) * 6}px)` }}
    >
      {children}
    </div>
  );
}

export function Split({ brand, title, beforeLabel, before, afterLabel, after }: BlockBrand & SplitProps) {
  const clock = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const pace = Math.max(1, PACE_FRAMES / durationInFrames);
  const frame = clock * pace;
  const pop = (at: number, damping: number, stiffness = 160) => spring({ frame: frame - at, fps, config: { damping, stiffness } });

  const shown = progress(frame, AT.before, WIPE.before);
  const cut = progress(frame, AT.cut, 10);
  const seam = progress(frame, AT.cut, 12);
  const disc = pop(AT.cut + 2, 11, 200);
  const poured = progress(frame, AT.after, WIPE.after);
  const pill = pop(AT.afterText, 12, 220);
  const tick = progress(frame, AT.check, 8);
  const push = progress(frame, AT.after, durationInFrames * pace - AT.after, (x) => x);
  const since = frame - AT.life;
  const ring = since < 0 ? 0 : (since % PULSE_EVERY) / PULSE_EVERY;
  const sheen = since < 0 ? 0 : progress(since % SHEEN.every, 0, SHEEN.sweep);
  const glint = since < 0 ? -1 : progress(since % GLINT.every, 0, GLINT.sweep);
  const breath = wave(clock, durationInFrames);
  const afterWords = after.split(/\s+/);
  const phoneAt = AT.afterText + afterWords.length * WORD.stagger + WORD.rise / 2 + PHONE_AFTER_WORDS;
  /* Deux gestes de défilement qui se partagent la fin de la scène. */
  const end = durationInFrames * pace;
  const scrollAt: [number, number] = [phoneAt + (end - phoneAt) * 0.35, phoneAt + (end - phoneAt) * 0.62];

  return (
    <Stage>
      <SplitTitle title={title} frame={frame} />

      <div className="relative flex flex-1 flex-col" style={{ marginTop: TITLE_GAP, marginLeft: -SAFE.left, marginBottom: -SAFE.bottom, width }}>
        {/* Premier côté : hachuré, éteint ; il se déroule sous son bord haut. */}
        <div
          className="relative flex flex-[1_1_0] flex-col justify-center"
          style={{ paddingLeft: SAFE.left, paddingRight: SAFE.right, paddingTop: SLANT, paddingBottom: SLANT }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "color-mix(in oklab, var(--surface) 65%, transparent)",
              backgroundImage: `repeating-linear-gradient(135deg, color-mix(in oklab, var(--foreground) ${HATCH.ink}%, transparent) 0 ${HATCH.line}px, transparent ${HATCH.line}px ${HATCH.step}px)`,
              backgroundPosition: `${clock * HATCH.drift}px 0`,
              clipPath: `polygon(0 ${SLANT}px, 100% 0, 100% calc(${shown} * (100% - ${SLANT}px)), 0 calc(${SLANT}px + ${shown} * (100% - ${SLANT}px)))`,
            }}
          />
          <div className="relative origin-left" style={{ transform: `scale(${1 - cut * 0.03 - push * PUSH})` }}>
            <Rise frame={frame} at={AT.beforeText} className="flex items-center gap-[0.35rem] text-[1.25rem] font-bold uppercase tracking-[0.2em] text-muted">
              <svg viewBox="0 0 24 24" className="size-[1.4rem] shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <circle cx={12} cy={12} r={10.5} strokeWidth={1.6} />
                <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" />
              </svg>
              {beforeLabel}
            </Rise>
            <Rise frame={frame} at={AT.beforeText + 2} className="mt-[0.3rem]">
              <p
                className="text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.02em]"
                style={{ color: `color-mix(in oklab, var(--muted) ${cut * 60}%, var(--foreground))` }}
              >
                {/* La rature se trace sur chaque ligne à la fois. */}
                <span
                  style={{
                    boxDecorationBreak: "clone",
                    WebkitBoxDecorationBreak: "clone",
                    backgroundImage: "linear-gradient(var(--ember-3), var(--ember-3))",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0 56%",
                    backgroundSize: `${progress(frame, AT.cut + 2, 9) * 100}% 0.06em`,
                  }}
                >
                  {before}
                </span>
              </p>
            </Rise>
          </div>
        </div>

        {/* Second côté : plein, il coule de la couture vers le bas de la toile. */}
        <div
          className="relative flex flex-[1_1_0] flex-col justify-center"
          style={{ marginTop: GAP - SLANT, paddingLeft: SAFE.left, paddingRight: SAFE.right, paddingTop: SLANT * 1.1, paddingBottom: PHONE_VISIBLE + 60 }}
        >
          <div
            className="absolute inset-0 bg-surface"
            style={{
              clipPath: `polygon(0 ${SLANT}px, 100% 0, 100% calc(${poured} * 100%), 0 calc(${SLANT}px + ${poured} * (100% - ${SLANT}px)))`,
              backgroundImage: `radial-gradient(ellipse 80% 45% at 22% 28%, color-mix(in oklab, var(--ember-1) ${14 + breath * 4}%, transparent), transparent)`,
            }}
          />
          {/* La couture de braise, au milieu de l'écart, tracée de gauche à droite ; un éclat la parcourt. */}
          <div
            className="ember-gradient absolute inset-x-0 overflow-hidden"
            style={{
              top: -GAP / 2 - SEAM / 2,
              height: SLANT + SEAM,
              clipPath: `polygon(0 ${SLANT}px, ${seam * 100}% ${SLANT * (1 - seam)}px, ${seam * 100}% ${SLANT * (1 - seam) + SEAM}px, 0 ${SLANT + SEAM}px)`,
            }}
          >
            <div
              className="absolute inset-y-0 w-[30%] bg-linear-to-r from-transparent via-white to-transparent"
              style={{ left: `${-30 + glint * 140}%`, opacity: glint < 0 ? 0 : 1 }}
            />
          </div>
          {/* Le disque pivot, posé sur la couture. */}
          <div
            className="ember-gradient absolute z-10 flex size-[2.4rem] items-center justify-center rounded-full shadow-[0_12px_30px_-8px_rgb(0_0_0/0.6)]"
            style={{
              left: "50%",
              top: SLANT / 2 - GAP / 2,
              opacity: Math.min(1, disc * 3),
              transform: `translate(-50%, -50%) scale(${disc}) rotate(${(1 - disc) * -90}deg)`,
            }}
          >
            <span
              className="absolute inset-0 rounded-full border-[0.1rem] border-ember-2"
              style={{ opacity: since < 0 ? 0 : (1 - ring) * 0.7, transform: `scale(${1 + ring * 0.9})` }}
            />
            <svg
              viewBox="0 0 24 24"
              className="size-[1.3rem]"
              fill="none"
              stroke="var(--background)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `translateY(${wave(clock, PULSE_EVERY) * 1.5}px)` }}
            >
              <path d="M12 4.5v15M5.5 13l6.5 6.5 6.5-6.5" />
            </svg>
          </div>

          <div className="relative origin-left" style={{ transform: `translateY(${breath * 4}px) scale(${1 + push * PUSH})` }}>
            <div
              className="ember-gradient relative inline-flex items-center gap-[0.3rem] overflow-hidden rounded-full py-[0.24rem] pl-[0.36rem] pr-[0.7rem] text-[1.17rem] font-bold uppercase tracking-[0.16em] text-background shadow-[0_10px_30px_-10px_var(--ember-2)]"
              style={{ opacity: Math.min(1, pill * 3), transform: `scale(${0.8 + pill * 0.2})`, transformOrigin: "left center" }}
            >
              <span
                className="absolute inset-y-0 w-[40%] -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent"
                style={{ left: `${-50 + sheen * 170}%` }}
              />
              <svg viewBox="0 0 24 24" className="relative size-[1.3rem]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
              </svg>
              <span className="relative">{afterLabel}</span>
            </div>
            <p className="kit-display mt-[0.4rem] text-[2.45rem] leading-[1]">
              {afterWords.map((text, i) => {
                const at = AT.afterText + 1 + i * WORD.stagger;
                const rise = progress(frame, at, WORD.rise);
                return (
                  <span key={i}>
                    {i > 0 && " "}
                    <span
                      className="inline-block"
                      style={{ opacity: progress(frame, at, WORD.fade), transform: `translateY(${(1 - rise) * 0.3}em)`, filter: `blur(${(1 - rise) * 6}px)` }}
                    >
                      {text}
                    </span>
                  </span>
                );
              })}
            </p>
          </div>
        </div>

        <SplitPhone brand={brand} at={phoneAt} scrollAt={scrollAt} frame={frame} clock={clock} />
      </div>
    </Stage>
  );
}
