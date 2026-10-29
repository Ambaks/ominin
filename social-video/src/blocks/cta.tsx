import type { ReactNode } from "react";
import { Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND_BY_ID } from "../../../frontend/lib/social/brands.ts";
import type { CtaProps } from "../../../frontend/lib/social/script.ts";
import { progress } from "../motion.ts";
import { CtaChat, ctaTimeline } from "./cta-chat.tsx";
import { Stage, type BlockBrand } from "./stage.tsx";

/*
 * L'écran final, centré : « Écrivez », le mot-clé en très grand sur le pavé
 * braise, « en message », l'adresse ; dessous, le téléphone où le mot-clé
 * est envoyé et où l'équipe répond par la ligne de la scène. Temps fort de
 * fin : le pavé brille et bat, l'adresse s'allume.
 */

/* La montée du titre du hero (kit-rise) : flou, décalage, fondu. */
const RISE_FRAMES = 8;
/* Corps du mot-clé : le pavé couvre ~80 % de la largeur utile, quel que soit le mot
 * (largeur d'une capitale Geist 800 serrée, pavé compris, en em). */
const MARK_WIDTH = "80cqw";
const CAP_EM = 0.74;
const MARK_PAD_EM = 0.3;
/* Le reflet passe sur le pavé à son arrivée, puis au temps fort. */
const SHEEN_FRAMES = 16;
const BEAT_PERIOD = 30;
/* Haut du téléphone dans la zone sûre, en px de la toile. */
const PHONE_TOP = 590;

function Rise({ at, blur = true, className = "", children }: { at: number; blur?: boolean; className?: string; children: ReactNode }) {
  const t = progress(useCurrentFrame(), at, RISE_FRAMES);
  return (
    <span
      className={`block ${className}`}
      style={{ opacity: Math.min(1, t * 1.6), transform: `translateY(${(1 - t) * 0.4}em)`, filter: blur ? `blur(${(1 - t) * 4}px)` : undefined }}
    >
      {children}
    </span>
  );
}

export function Cta({ brand: brandId, cta, line }: BlockBrand & CtaProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const brand = BRAND_BY_ID.get(brandId)!;
  const [before, keyword = "", after = ""] = cta.split(/\[\[(.+?)\]\]/);
  const t = ctaTimeline(keyword.length, durationInFrames);

  const pulse = (at: number, frames: number) => Math.sin(progress(frame, at, frames) * Math.PI);
  const echo = pulse(t.send, 10) * 0.03 + pulse(t.glint, 14) * 0.06;
  const sweep = (at: number) => progress(frame, at, SHEEN_FRAMES, Easing.inOut(Easing.quad));
  const sheen = frame < t.glint ? sweep(t.mark + RISE_FRAMES) : sweep(t.glint);
  const url = progress(frame, t.url, RISE_FRAMES);
  /* Au temps fort, l'adresse s'allume puis bat doucement jusqu'à la fin. */
  const beat = frame < t.glint ? 0 : (1 - Math.cos(((frame - t.glint) / BEAT_PERIOD) * 2 * Math.PI)) / 2;

  return (
    <Stage>
      <div className="flex flex-col items-center text-center">
        <Rise at={t.eyebrow} className="text-[1.05rem] font-semibold uppercase leading-none tracking-[0.18em] text-ember-1">
          {brand.name} · Une question ?
        </Rise>
        <h1 className="kit-display @container mt-[0.45rem] w-full">
          <Rise at={t.before} className="text-[3.5rem]">{before.trim()}</Rise>
          <Rise at={t.mark} blur={false}>
            <span
              className="inline-block"
              style={{
                fontSize: `calc(${MARK_WIDTH} / ${CAP_EM * keyword.length + MARK_PAD_EM})`,
                transform: `scale(${1 + echo})`,
                filter: "drop-shadow(0 0.06em 0.12em color-mix(in oklab, var(--ember-2) 50%, transparent))",
              }}
            >
              <span className="kit-mark">
                <span className="absolute inset-[0.08em_-0.02em_0.02em] z-[-1] overflow-hidden rounded-[0.12em]">
                  <span
                    className="absolute inset-y-0 w-[22%] -skew-x-[20deg] bg-linear-to-r from-transparent via-white/35 to-transparent"
                    style={{ left: `${-30 + sheen * 140}%` }}
                  />
                </span>
                {keyword}
              </span>
            </span>
          </Rise>
          <Rise at={t.after} className="text-[3.5rem]">{after.trim()}</Rise>
        </h1>
        <p
          className="mt-[0.6rem] rounded-full border-2 border-ember-1 bg-surface-raised px-[0.8rem] py-[0.4rem] text-[1.1rem] font-bold leading-none text-ember-1"
          style={{
            opacity: url,
            transform: `translateY(${(1 - url) * 0.5}rem) scale(${1 + beat * 0.04})`,
            boxShadow: `0 0.4rem 1.2rem -0.3rem rgb(0 0 0 / 0.6), 0 0 ${beat * 1.4}rem color-mix(in oklab, var(--ember-2) ${beat * 55}%, transparent)`,
          }}
        >
          {brand.url}
        </p>
      </div>

      <div className="absolute inset-x-0 flex justify-center" style={{ top: PHONE_TOP }}>
        <CtaChat name={brand.name} url={brand.url} keyword={keyword} line={line} timeline={t} />
      </div>
    </Stage>
  );
}
