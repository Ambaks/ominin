import type { CSSProperties, ReactNode } from "react";
import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { progress, wave } from "../motion.ts";

/*
 * Le parcours : un rail vertical, trois stations numérotées, une étape en
 * regard de chacune. La braise descend le rail de station en station, la
 * carte de l'étape en cours glisse avec elle, la station s'allume et l'étape
 * passe au premier plan ; celle d'avant se coche. Au bout, le rail file vers
 * le bas de la toile, un éclat le parcourt à intervalle régulier, chaque
 * station s'avive à son passage, et la dernière se coche à son tour.
 */

/** Hauteur d'une étape, en px de la toile. */
export const ROW = 250;
const STATION = 116;
const RAIL = 8;
/** Retrait du texte depuis le bord gauche du rail. */
const TEXT_LEFT = STATION + 48;
const CARD = { inset: 18, radius: 28 };
/** Une station pas encore atteinte reste en retrait : plus petite, son étape plus pâle. */
const STATION_IDLE = 0.84;
const GHOST = 0.75;
/** Le rail file sous la dernière station, jusqu'au bas de la toile ; il s'efface sur FADE px. */
const TAIL = 760;
const FADE = 520;
/* Entrée (en images) : le rail se dessine, les stations et les étapes montent. */
const ENTRY = { track: 2, draw: 16, station: 4, ghost: 7, stagger: 3, rise: 10 };
/* Rythme : première étape, dernière à LAST de la scène, écart maximal, trajet, allumage. */
const PACE = { first: 0.13, firstMin: 12, firstMax: 16, last: 0.66, maxGap: 44, travel: 11, lift: 6 };
/* La coche qui remplace le numéro d'une étape faite ; la dernière se coche END images après son allumage. */
const CHECK = { draw: 9, end: 22 };
/* L'éclat qui parcourt le rail fini : départ, traversée, période, longueur et portée en px. */
const COMET = { delay: 6, sweep: 24, every: 40, length: 280, reach: 150 };
/* L'onde de la station en cours : période et durée, en images. */
const RING = { every: 30, spread: 18 };

/** Les instants où chaque étape s'allume, et la durée du trajet de l'une à l'autre. */
export function stepsClock(frame: number, duration: number) {
  const first = Math.min(PACE.firstMax, Math.max(PACE.firstMin, duration * PACE.first));
  const last = Math.min(duration * PACE.last, first + 2 * PACE.maxGap);
  const gap = (last - first) / 2;
  const lit = [first, first + gap, last];
  const travel = Math.min(gap * 0.6, PACE.travel);
  const hop = (index: number) => progress(frame, lit[index] - travel, travel, Easing.bezier(0.5, 0, 0.15, 1));
  /* Avancement le long du parcours, en étapes : 0 sur la première station, 2 sur la dernière. */
  return { lit, hop, along: hop(1) + hop(2) };
}

/* Le pavé du titre (kit-mark), en disque ou en trait : chaque habillage le
 * recolore (braise, ou sombre sur flamme). Corps nul : son fond couvre tout.
 * Position et affichage en ligne, kit.css (hors couche) l'emporterait. */
function Mark({ className = "", style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <span className={`kit-mark overflow-hidden ${className}`} style={{ position: "absolute", display: "flex", fontSize: 0, padding: 0, ...style }}>
      {children}
    </span>
  );
}

export function StepsPath({ steps }: { steps: string[] }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { lit, along } = stepsClock(frame, durationInFrames);
  const center = (index: number) => index * ROW + ROW / 2;

  const tail = progress(frame, lit[2], durationInFrames - lit[2], (t) => 1 - (1 - t) ** 2);
  const fill = along * ROW + tail * TAIL;
  const cardIn = progress(frame, lit[0] - 3, 8);
  const breathe = wave(frame, RING.every * 2);

  /* L'éclat : sa position sur le rail (px depuis la première station), absente entre deux passages. */
  const since = frame - lit[2] - COMET.delay;
  const sweep = since < 0 ? -1 : (since % COMET.every) / COMET.sweep;
  const cometY = sweep < 0 || sweep > 1 ? null : -COMET.length + sweep * (2 * ROW + FADE + COMET.length);
  const near = (index: number) => (cometY === null ? 0 : Math.max(0, 1 - Math.abs(cometY + COMET.length * 0.7 - index * ROW) / COMET.reach));

  return (
    <div className="relative isolate" style={{ height: 3 * ROW }}>
      {/* La flaque de braise sous la carte en cours, qui la suit. */}
      <div
        className="absolute -z-10 rounded-full"
        style={{
          left: -200,
          right: -300,
          top: center(0) - 260,
          height: 520,
          opacity: cardIn * (0.85 + breathe * 0.15),
          transform: `translateY(${along * ROW}px)`,
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) 32%, transparent), transparent)",
        }}
      />

      {/* La carte de l'étape en cours : elle part de l'axe du rail, sous la station. */}
      <div
        className="absolute border-[1.5px]"
        style={{
          left: STATION / 2,
          right: 0,
          top: CARD.inset,
          height: ROW - 2 * CARD.inset,
          borderRadius: CARD.radius,
          opacity: cardIn,
          transform: `translateY(${along * ROW}px) scale(${0.94 + cardIn * 0.06})`,
          transformOrigin: "0 50%",
          borderColor: "color-mix(in oklab, var(--ember-1) 55%, transparent)",
          background: "color-mix(in oklab, var(--surface-raised) 72%, transparent)",
          boxShadow: `inset 0 1.5px 0 color-mix(in oklab, var(--foreground) 14%, transparent), 0 40px 90px -36px var(--ember-2), 0 30px 60px -30px rgb(0 0 0 / 0.5)`,
        }}
      />

      {/* Le rail, sa braise et l'éclat ; il s'efface vers le bas de la toile. */}
      <div
        className="absolute"
        style={{
          left: (STATION - RAIL) / 2,
          width: RAIL,
          top: center(0),
          height: 2 * ROW + TAIL,
          maskImage: `linear-gradient(to bottom, black ${2 * ROW + TAIL - FADE}px, transparent)`,
        }}
      >
        <div
          className="absolute inset-0 origin-top rounded-full"
          style={{ background: "color-mix(in oklab, var(--foreground) 18%, transparent)", transform: `scaleY(${progress(frame, ENTRY.track, ENTRY.draw)})` }}
        />
        <Mark className="inset-x-0 top-0 rounded-full" style={{ height: fill, boxShadow: "0 0 24px var(--ember-2)" }} />
        {cometY !== null && (
          <div
            className="absolute -inset-x-[3px] rounded-full"
            style={{
              top: cometY,
              height: COMET.length,
              background: "linear-gradient(to bottom, transparent, rgb(255 255 255 / 0.95) 70%, transparent)",
              filter: "drop-shadow(0 0 12px var(--ember-1))",
            }}
          />
        )}
      </div>

      {steps.map((step, index) => {
        const enter = spring({ frame: frame - (ENTRY.station + index * ENTRY.stagger), fps, config: { damping: 13, stiffness: 160 } });
        const on = progress(frame, lit[index] - 3, 6);
        const ignite = Math.sin(progress(frame, lit[index] - 3, 10) * Math.PI);
        /* Station en cours jusqu'au départ vers la suivante ; la dernière bat jusqu'à la fin. */
        const until = index < 2 ? lit[index + 1] - 3 : Infinity;
        const age = frame - lit[index];
        const ring = progress(age - Math.min(Math.floor(age / RING.every), Math.floor((until - lit[index]) / RING.every)) * RING.every, 0, RING.spread);
        const glow = near(index);
        const ghost = progress(frame, ENTRY.ghost + index * ENTRY.stagger, ENTRY.rise);
        const shown = progress(frame, lit[index] - 2, PACE.lift);
        /* Faite quand la suivante s'allume ; la dernière, peu après la sienne. */
        const done = progress(frame, index < 2 ? lit[index + 1] - 2 : lit[2] + CHECK.end, CHECK.draw);
        const tick = Math.sin(done * Math.PI);
        return (
          <div key={index} className="absolute inset-x-0" style={{ top: index * ROW, height: ROW }}>
            <div
              className="absolute left-0 top-1/2"
              style={{
                width: STATION,
                height: STATION,
                marginTop: -STATION / 2,
                opacity: Math.min(1, enter * 2),
                transform: `scale(${(0.5 + enter * 0.5) * (STATION_IDLE + (1 - STATION_IDLE) * on) * (1 + ignite * 0.16 + tick * 0.12 + glow * 0.14)})`,
              }}
            >
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full border-4 text-muted"
                style={{
                  borderColor: "color-mix(in oklab, var(--foreground) 26%, transparent)",
                  background: "color-mix(in oklab, var(--foreground) 8%, var(--background))",
                }}
              >
                <span className="kit-display text-[62px]">{index + 1}</span>
              </span>
              <span
                className="absolute inset-0 rounded-full border-[3px] border-ember-1"
                style={{ opacity: age > 0 ? (1 - ring) * 0.85 : 0, transform: `scale(${1 + ring * 0.75})` }}
              />
              <Mark
                className="inset-0 items-center justify-center rounded-full"
                style={{
                  opacity: on,
                  transform: `scale(${0.6 + on * 0.4})`,
                  boxShadow: `0 0 ${36 + glow * 70}px ${glow * 6 - 4}px var(--ember-2), 0 18px 40px -16px rgb(0 0 0 / 0.6)`,
                }}
              >
                <span className="kit-display text-[62px]" style={{ opacity: 1 - done, transform: `scale(${1 - done * 0.5})` }}>
                  {index + 1}
                </span>
                <svg viewBox="0 0 52 52" className="absolute inset-[26%]" fill="none" stroke="currentColor" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 27l9 9 19-20" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - done} opacity={done > 0 ? 1 : 0} />
                </svg>
              </Mark>
            </div>
            {/* En attente, l'étape se lit en retrait ; à son tour, elle passe au premier plan d'un geste net. */}
            <div
              className="absolute right-[36px] top-1/2 text-balance text-[60px] font-bold leading-[1.05] tracking-[-0.025em]"
              style={{
                left: TEXT_LEFT,
                opacity: Math.min(1, ghost * 1.6),
                transform: `translateY(calc(-50% + ${(1 - ghost) * 30}px))`,
              }}
            >
              <p className="text-muted" style={{ opacity: GHOST * (1 - shown) }}>{step}</p>
              <p className="absolute inset-0" style={{ opacity: shown, transform: `translateY(${(1 - shown) * 14}px)` }}>
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
