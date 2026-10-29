import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND_BY_ID } from "../../../frontend/lib/social/brands.ts";
import type { QuestionProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { answerDone, QuestionAnswer } from "./question-answer.tsx";
import { AskerAvatar, QuestionBubble, QuestionThanks } from "./question-bubble.tsx";
import { QuestionMark } from "./question-mark.tsx";
import { Stage, type BlockBrand } from "./stage.tsx";

/*
 * La question en haut de la toile, dans sa bulle, déjà en train de s'écrire
 * à la première image ; la réponse en bas, en grand titre au pavé braise ;
 * entre les deux, un fil descend de l'avatar de qui demande à celui de la
 * marque et l'occupe toute la hauteur, à côté d'un grand « ? » au trait qui
 * se retourne en « ! » quand la réponse est posée ; une coche s'épingle sous
 * la question, puis qui demandait répond d'un cœur. Le fil,
 * le pavé, la bulle et le cœur vivent jusqu'à la fin.
 */

/* Temps pensés pour 90 images, resserrés si la scène est plus courte ; dots
 * négatif : la bulle d'écriture est déjà à moitié là à la première image. */
const BASE_FRAMES = 90;
const AT = { dots: -4, bubble: 4, rail: 9, brand: 20, answer: 25, stagger: 3, check: 3, thanks: 55 };
/* Fil : durée du tracé, période de l'étincelle qui le descend. */
const RAIL = { draw: 14, spark: 34 };
/* Tenue : la question et la réponse dérivent lentement l'une vers l'autre, en px. */
const DRIFT = { ask: 14, answer: 10 };

function timeline(duration: number) {
  const at = (frames: number) => Math.round(frames * Math.min(1, duration / BASE_FRAMES));
  return {
    dots: AT.dots,
    bubble: at(AT.bubble),
    rail: at(AT.rail),
    brand: at(AT.brand),
    answer: at(AT.answer),
    thanks: at(AT.thanks),
    stagger: Math.max(2, at(AT.stagger)),
  };
}

export function Question({ brand: brandId, question, answer }: BlockBrand & QuestionProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const brand = BRAND_BY_ID.get(brandId)!;
  const t = timeline(durationInFrames);
  const check = answerDone(answer, t.answer, t.stagger) + AT.check;
  const rail = progress(frame, t.rail, RAIL.draw);
  const spark = ((frame - t.rail - RAIL.draw) % RAIL.spark) / RAIL.spark;
  const drift = progress(frame, 0, durationInFrames, (x) => x);
  const signed = spring({ frame: frame - t.brand, fps, config: { damping: 11, stiffness: 220 } });
  /* Le fil s'allume quand la réponse est posée. */
  const flash = Math.sin(progress(frame, check, 14) * Math.PI);

  return (
    <Stage>
      <div className="isolate flex flex-1 flex-col pb-[0.4rem] pt-[1.6rem]">
        <div className="flex items-end gap-[0.45rem]" style={{ transform: `translateY(${drift * DRIFT.ask}px)` }}>
          <AskerAvatar />
          <QuestionBubble question={question} dots={t.dots} bubble={t.bubble} check={check} />
        </div>

        <div className="relative flex min-h-[3rem] flex-1 gap-[0.45rem]">
          <QuestionMark at={check} />
          <div className="flex w-[1.9rem] shrink-0 justify-center py-[0.35rem]">
            <span
              className="relative w-[0.16rem] rounded-full bg-linear-to-b from-hairline via-ember-2/60 to-ember-2"
              style={{
                transformOrigin: "top",
                transform: `scaleY(${rail})`,
                boxShadow: `0 0 ${flash * 1.2}rem color-mix(in oklab, var(--ember-2) ${flash * 80}%, transparent)`,
              }}
            >
              {frame >= t.rail + RAIL.draw && (
                <span
                  className="absolute left-1/2 size-[0.4rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-1 shadow-[0_0_0.6rem_0.2rem] shadow-ember-2"
                  style={{ top: `${spark * 100}%`, opacity: Math.sin(spark * Math.PI) }}
                />
              )}
            </span>
          </div>
          <div className="mt-[2.6rem] self-start" style={{ transform: `translateY(${drift * DRIFT.ask}px)` }}>
            <QuestionThanks at={t.thanks} />
          </div>
        </div>

        <div style={{ transform: `translateY(${-drift * DRIFT.answer}px)` }}>
          <div
            className="flex items-center gap-[0.45rem]"
            style={{ opacity: Math.min(1, signed * 3), transformOrigin: "left center", transform: `scale(${0.7 + signed * 0.3})` }}
          >
            <span className="ember-gradient kit-display flex size-[1.9rem] shrink-0 items-center justify-center rounded-full text-[1rem] text-background shadow-[0_0.3rem_1rem_-0.2rem] shadow-ember-2/60">
              {brand.name[0]}
            </span>
            <span className="text-[1.2rem] font-bold uppercase tracking-[0.16em] text-ember-1">{brand.name}</span>
          </div>
          <div className="mt-[0.85rem]">
            <QuestionAnswer title={answer} start={t.answer} stagger={t.stagger} />
          </div>
        </div>
      </div>
    </Stage>
  );
}
