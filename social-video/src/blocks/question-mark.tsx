import { useCurrentFrame, useVideoConfig } from "remotion";
import { progress, wave } from "../motion.ts";

/*
 * Le grand signe au trait, derrière la scène à droite : « ? » tant que la
 * question attend, il se retourne en « ! » quand la réponse est posée, puis
 * flotte et s'éclaire en battant jusqu'à la fin.
 */

/* Corps du signe en rem, épaisseur du trait en px ; retournement (avance et
 * durée en images) ; balancement en degrés. */
const SIZE = 22;
const STROKE = 4;
const FLIP = { lead: 4, frames: 12 };
const SWAY = 3;
const FLOAT_PX = 14;

export function QuestionMark({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const shown = progress(frame, 0, FLIP.frames);
  const flip = progress(frame, at - FLIP.lead, FLIP.frames);
  const answered = flip >= 0.5;
  const glow = answered ? (1 + wave(frame - at, durationInFrames / 2, 0.75)) / 2 : 0;
  return (
    <div className="pointer-events-none absolute inset-y-0 -right-[1rem] -z-10 flex items-center" style={{ perspective: 1600 }}>
      <span
        className="kit-display block leading-none"
        style={{
          fontSize: `${SIZE}rem`,
          color: "transparent",
          WebkitTextStroke: `${STROKE}px color-mix(in oklab, var(--ember-2) 75%, var(--foreground))`,
          opacity: shown * (answered ? 0.7 + glow * 0.3 : 0.6),
          filter: `drop-shadow(0 0 ${glow * 1.5}rem color-mix(in oklab, var(--ember-2) ${glow * 60}%, transparent))`,
          transform: [
            `translateY(${wave(frame, durationInFrames) * FLOAT_PX}px)`,
            `rotate(${wave(frame, durationInFrames, 0.25) * SWAY}deg)`,
            `rotateY(${Math.sin(flip * Math.PI) * 90}deg)`,
          ].join(" "),
        }}
      >
        {answered ? "!" : "?"}
      </span>
    </div>
  );
}
