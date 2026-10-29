import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { progress, wave } from "../motion.ts";

/*
 * Le message de qui pose la question : son avatar, la bulle « en train
 * d'écrire » déjà là à la première image, puis la question qui jaillit de
 * son coin, à sa taille de lecture. Quand la réponse est posée, une coche
 * braise s'épingle sous la bulle et son liseré s'allume ; plus tard, celui
 * qui demandait répond d'un cœur.
 */

const DOTS_PERIOD = 16;
const HALO_PERIOD = 40;
const HEART_PERIOD = 24;
/* Bulle de la question : échelle et inclinaison de départ. */
const POP = { scale: 0.86, tilt: -1.5 };

export function AskerAvatar() {
  return (
    <span className="flex size-[1.9rem] shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-raised text-muted">
      <svg viewBox="0 0 24 24" className="mt-[0.35rem] size-[1.6rem]" fill="currentColor">
        <circle cx="12" cy="8" r="4.6" />
        <path d="M2.5 24c0-5.6 4.3-9.6 9.5-9.6s9.5 4 9.5 9.6z" />
      </svg>
    </span>
  );
}

export function QuestionBubble({ question, dots, bubble, check }: { question: string; dots: number; bubble: number; check: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typing = spring({ frame: frame - dots, fps, config: { damping: 13, stiffness: 240 } });
  const pop = spring({ frame: frame - bubble, fps, config: { damping: 12, stiffness: 190 } });
  const shown = progress(frame, bubble, 3);
  const tick = spring({ frame: frame - check, fps, config: { damping: 9, stiffness: 230 } });
  const ring = progress(frame, check, 16);
  /* Répondue, la bulle prend un liseré braise qui respire jusqu'à la fin. */
  const halo = frame < check ? 0 : Math.min(1, ring * 2) * (0.6 + 0.4 * Math.cos(((frame - check) / HALO_PERIOD) * 2 * Math.PI));

  return (
    <div className="relative min-w-0">
      {/* « En train d'écrire » : s'efface quand la question arrive. */}
      <span
        className="absolute bottom-0 left-0 flex gap-[0.32rem] rounded-[1.2rem] rounded-bl-[0.3rem] border border-hairline bg-surface-raised px-[1rem] py-[0.85rem]"
        style={{ opacity: Math.min(1, typing * 3) * (1 - shown), transformOrigin: "bottom left", transform: `scale(${0.6 + typing * 0.4})` }}
      >
        {[0, 1, 2].map((i) => {
          const lift = Math.max(0, wave(frame - dots, DOTS_PERIOD, -i / 6));
          return (
            <span
              key={i}
              className="size-[0.7rem] rounded-full bg-foreground"
              style={{ opacity: 0.35 + lift * 0.65, transform: `translateY(${-lift * 0.22}rem)` }}
            />
          );
        })}
      </span>

      <div
        className="relative"
        style={{
          opacity: shown,
          transformOrigin: "bottom left",
          transform: `scale(${POP.scale + pop * (1 - POP.scale)}) rotate(${(1 - pop) * POP.tilt}deg)`,
        }}
      >
        <p
          className="rounded-[1.2rem] rounded-bl-[0.3rem] border-[0.06rem] bg-surface-raised px-[0.85rem] py-[0.6rem] text-balance text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.01em] shadow-[0_1.2rem_2.4rem_-0.8rem_rgb(0_0_0_/_0.5)]"
          style={{ borderColor: `color-mix(in oklab, var(--ember-2) ${halo * 70}%, var(--hairline))` }}
        >
          {question}
        </p>
        {/* La coche braise et son onde, sous le coin de la bulle, sans couper son liseré. */}
        <span className="absolute -bottom-[1.9rem] right-[0.45rem] size-[1.5rem]">
          <span
            className="absolute inset-0 rounded-full border-[0.1rem] border-ember-2"
            style={{ opacity: (1 - ring) * Math.min(1, ring * 4), transform: `scale(${1 + ring * 1.2})` }}
          />
          <span
            className="ember-gradient absolute inset-0 flex items-center justify-center rounded-full text-background shadow-[0_0.3rem_0.9rem_-0.2rem] shadow-ember-2/70 ring-[0.12rem] ring-background"
            style={{ opacity: Math.min(1, tick * 4), transform: `scale(${tick})` }}
          >
            <svg viewBox="0 0 20 20" className="size-[0.9rem]" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 10.5 8.5 14.5 15.5 6" strokeDasharray={18} strokeDashoffset={18 * (1 - progress(frame, check + 2, 8))} />
            </svg>
          </span>
        </span>
      </div>
    </div>
  );
}

/** La réponse de celui qui demandait : une petite bulle au cœur braise qui bat. */
export function QuestionThanks({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 210 } });
  const beat = frame < at ? 0 : Math.max(0, wave(frame - at, HEART_PERIOD, 0.25));
  return (
    <span
      className="flex rounded-[1.1rem] rounded-tl-[0.3rem] border border-hairline bg-surface-raised px-[0.75rem] py-[0.5rem] shadow-[0_0.8rem_1.8rem_-0.6rem_rgb(0_0_0_/_0.45)]"
      style={{ opacity: Math.min(1, pop * 3), transformOrigin: "top left", transform: `scale(${0.6 + pop * 0.4})` }}
    >
      <svg viewBox="0 0 24 22" className="size-[1.5rem] text-ember-2" fill="currentColor" style={{ transform: `scale(${1 + beat * 0.14})` }}>
        <path d="M12 21.5 10.3 20C4.2 14.6.5 11.3.5 6.9.5 3.4 3.2.7 6.7.7c2 0 3.9.9 5.3 2.4C13.4 1.6 15.3.7 17.3.7c3.5 0 6.2 2.7 6.2 6.2 0 4.4-3.7 7.7-9.8 13.1z" />
      </svg>
    </span>
  );
}
