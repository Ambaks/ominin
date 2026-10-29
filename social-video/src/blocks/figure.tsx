import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { FigureProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { FigureCount, parseValue, useFigureSize } from "./figure-count.tsx";
import { FigureFloor } from "./figure-floor.tsx";
import { FigureGauge } from "./figure-gauge.tsx";
import { Headline } from "./headline.tsx";
import { SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Le chiffre : le titre, puis la valeur en très grand qui se compte sur ses
 * rouleaux pendant que la règle dessous se remplit ; à l'arrivée, le chiffre
 * frappe, l'étincelle éclate, l'unité et la ligne qui dit ce qu'il mesure
 * se posent ; un reflet de braise passe ensuite sur le chiffre et la jauge.
 * Le titre en haut de la zone sûre, la jauge et la ligne en bas, au-dessus du
 * sol gradué qui défile avec le compte (figure-floor.tsx), le chiffre centré
 * entre les deux. Après l'arrivée, le chiffre respire, l'étincelle émet des
 * ondes et une lumière balaie le sol.
 */

/** Corps du titre, en rem. */
const TITLE_REM = 3.2;
/** Corps maximal du chiffre, en px de la toile. */
const MAX_SIZE = 680;
/** En dessous, l'entrée se joue plus vite pour finir à temps. */
const PACE_FRAMES = 75;
/* Le compte part quand le pavé du titre est posé. */
const AT = { gauge: 8, count: 13 };
const GAUGE_DRAW = 14;
/* Le compte : un ressort qui file puis ralentit ; il s'arrête net sur la valeur. */
const COUNT_SPRING = { mass: 1, stiffness: 34, damping: 8.6 };
/** Rebond du rouleau des unités à l'arrêt : amplitude en cases, demi-période et amortissement en images. */
const SETTLE = { cells: 0.12, half: 3, decay: 3 };
/** Frappe du chiffre à l'arrivée, et poussée lente jusqu'à la fin. */
const THUMP = 0.035;
const PUSH = 0.03;
/** Respiration du chiffre une fois posé : amplitude et période en images. */
const SWELL = { scale: 0.015, period: 45 };
/** Respiration de l'étincelle, en images. */
const BREATH = 40;
/** Reflet sur le chiffre et la jauge : période et durée du passage, en images. */
const SHEEN = { every: 45, frames: 22 };
/** Balayage du sol et onde de l'étincelle, sur la même période que le reflet, en images. */
const SCAN_FRAMES = 30;
const RING_FRAMES = 20;
/** Sol : défilement pendant le compte, puis glissement par image, en px du plan. */
const FLOOR = { run: 1440, creep: 2.4 };

export function Figure({ title, value, label }: BlockBrand & FigureProps) {
  const { width, fps, durationInFrames } = useVideoConfig();
  const pace = Math.max(1, PACE_FRAMES / durationInFrames);
  const frame = useCurrentFrame() * pace;
  const parsed = parseValue(value);
  const span = parsed.target - parsed.from;
  const inner = width - SAFE.left - SAFE.right;
  const { size, widths, sizer } = useFigureSize(parsed, inner, MAX_SIZE);

  const counted = (at: number) => spring({ frame: at - AT.count, fps, config: COUNT_SPRING });
  const p = counted(frame);
  const countAt = (q: number) => parsed.from + span * Math.min(1, q);
  let land = AT.count;
  while (counted(land) < 1) land += 1;
  const since = frame - land;

  const settle = since < 0 ? 0 : Math.sign(span) * SETTLE.cells * Math.exp(-since / SETTLE.decay) * Math.sin((since * Math.PI) / SETTLE.half);
  const hit = (attack: number, release: number) => interpolate(since, [0, attack, release], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shown = progress(frame, AT.count, 5);
  const push = progress(since, 0, durationInFrames * pace - land, Easing.linear);
  const labelIn = progress(frame, land - 2, 12);
  const sheen = since < 0 ? 0 : progress(since % SHEEN.every, 0, SHEEN.frames);
  const direction = span < 0 ? 1 : -1;
  const cycle = since < 0 ? -1 : since % SHEEN.every;
  const swell = since < 0 ? 0 : SWELL.scale * (0.5 - 0.5 * wave(since, SWELL.period, 0.25)) * progress(since, 0, 12);

  return (
    <Stage>
      <FigureFloor
        shown={progress(frame, AT.gauge, 16)}
        scroll={direction * (FLOOR.run * Math.min(1, p) + FLOOR.creep * Math.max(0, since))}
        glow={progress(frame, AT.gauge, 20) * (0.75 + hit(3, 24) * 0.5)}
        scan={cycle < 0 ? -1 : cycle / SCAN_FRAMES}
      />
      <div className="relative flex flex-1 flex-col">
        <Headline title={title} start={0} size={TITLE_REM} />
        <div className="relative flex flex-1 flex-col justify-center">
          {sizer}
          <div
            style={{
              opacity: shown,
              transform: `translateY(${(1 - shown) * 40}px) scale(${1 + hit(2, 10) * THUMP + push * PUSH + swell})`,
              transformOrigin: "left bottom",
              filter: "drop-shadow(0 0.04em 0.18em color-mix(in oklab, var(--ember-2) 35%, transparent))",
            }}
          >
            <FigureCount
              value={parsed}
              count={countAt(p)}
              previous={countAt(counted(frame - pace))}
              settle={settle}
              size={size}
              widths={widths}
              unitShown={progress(frame, land - 4, 8)}
              sheen={sheen}
            />
          </div>
        </div>
        <div>
          <FigureGauge width={inner} draw={progress(frame, AT.gauge, GAUGE_DRAW)} fill={Math.min(1, p)} flare={hit(3, 18)} breath={progress(since, 6, 12) * (0.5 - 0.5 * wave(since - 6, BREATH, 0.25))} sheen={sheen} pulse={cycle < 0 ? -1 : (cycle - SHEEN.frames / 2) / RING_FRAMES} />
        </div>
        <p
          className="mt-[0.7rem] text-balance text-[1.6rem] font-semibold leading-[1.12] text-foreground/90"
          style={{ opacity: labelIn, transform: `translateY(${(1 - labelIn) * 24}px)`, filter: `blur(${(1 - labelIn) * 5}px)` }}
        >
          {label}
        </p>
      </div>
    </Stage>
  );
}
