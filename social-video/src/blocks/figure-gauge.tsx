/*
 * La règle sous le chiffre : ses graduations se tracent de gauche à droite,
 * puis le dégradé de braise la remplit au rythme du compte, une étincelle à
 * son front, sur un halo qui naît avec la règle ; à l'arrivée, l'étincelle
 * éclate, puis elle émet des ondes et un reflet traverse la jauge à
 * intervalle régulier.
 */

const TRACK = 16;
const TICK = 3;
const MINOR = { count: 40, height: 12 };
const MAJOR = { count: 8, height: 28 };
const SPARK = 22;
/** Onde de l'étincelle : agrandissement final et épaisseur, en px. */
const RING = { scale: 6, border: 6 };
const TICK_COLOR = "color-mix(in oklab, var(--foreground) 34%, transparent)";

/**
 * draw : tracé des graduations (0 → 1) ; fill : remplissage ; flare : éclat
 * de l'étincelle (0 → 1 → 0) ; breath : sa respiration ensuite (0 → 1) ;
 * sheen : passage du reflet (0 → 1) ; pulse : avancée de l'onde (0 → 1),
 * hors de l'intervalle, pas d'onde.
 */
export function FigureGauge({ width, draw, fill, flare, breath, sheen, pulse }: { width: number; draw: number; fill: number; flare: number; breath: number; sheen: number; pulse: number }) {
  const tick = (step: { count: number; height: number }) => `linear-gradient(90deg, ${TICK_COLOR} 0 ${TICK}px, transparent ${TICK}px) 0 ${TRACK + 6}px / ${width / step.count}px ${step.height}px repeat-x`;
  return (
    <div className="relative" style={{ width: width + TICK, height: TRACK + 6 + MAJOR.height }}>
      <div
        className="absolute -inset-x-[10%] -inset-y-[160%]"
        style={{ opacity: draw, background: "radial-gradient(ellipse 50% 50% at 50% 50%, color-mix(in oklab, var(--ember-2) 22%, transparent), transparent)" }}
      />
      <div className="absolute inset-0" style={{ background: `${tick(MAJOR)}, ${tick(MINOR)}`, clipPath: `inset(0 ${(1 - draw) * 100}% 0 0)` }} />
      <div className="absolute left-0 top-0 overflow-hidden rounded-full" style={{ width, height: TRACK, background: TICK_COLOR, clipPath: `inset(0 ${(1 - draw) * 100}% 0 0 round ${TRACK}px)` }}>
        <div className="ember-gradient absolute inset-0 origin-left" style={{ transform: `scaleX(${fill})` }} />
        <div
          className="absolute inset-y-0 w-[30%] bg-linear-to-r from-transparent via-white/45 to-transparent"
          style={{ transform: `translateX(${-110 + sheen * 450}%) skewX(-18deg)` }}
        />
      </div>
      {pulse >= 0 && pulse <= 1 && (
        <span
          className="absolute rounded-full"
          style={{
            width: SPARK,
            height: SPARK,
            left: width - SPARK / 2,
            top: TRACK / 2 - SPARK / 2,
            border: `${RING.border / (1 + pulse * RING.scale)}px solid color-mix(in oklab, var(--ember-1) 65%, var(--surface-raised))`,
            opacity: (1 - pulse) * 0.9,
            transform: `scale(${1 + pulse * RING.scale})`,
          }}
        />
      )}
      <span
        className="absolute rounded-full bg-foreground"
        style={{
          width: SPARK,
          height: SPARK,
          left: fill * width - SPARK / 2,
          top: TRACK / 2 - SPARK / 2,
          opacity: Math.min(1, fill * 8),
          transform: `scale(${1 + flare * 0.6})`,
          boxShadow: `0 0 ${16 + flare * 40 + breath * 14}px ${4 + flare * 10 + breath * 4}px color-mix(in oklab, var(--ember-1) ${70 - flare * 20}%, transparent)`,
        }}
      />
    </div>
  );
}
