import { useCurrentFrame, useVideoConfig } from "remotion";
import type { HookProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { HookCachet } from "./hook-cachet.tsx";
import { HookTitle, markStart } from "./hook-title.tsx";
import { SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * L'accroche : l'étiquette du sujet, le grand titre au pavé braise et le
 * Cachet de la table, empilés et centrés sur la zone utile, au-dessus d'un
 * plan de grille qui file vers le bas de la toile, sous l'interface. Le
 * titre prend toute la largeur au-dessus de la colonne d'icônes et se règle
 * sur la hauteur qui lui reste ; la carte entre quand le pavé s'écrit.
 */

/* Marge latérale du titre et de la carte, en px. */
const MARGIN = 48;
/* Zone de l'ensemble sur la toile, en px : le bas est celui de la carte,
 * dont le texte reste au-dessus de l'interface. */
const REGION = { top: 300, bottom: 1556 };
/* Hauteur de la carte posée, de l'étiquette avec son écart au titre, et
 * écart du titre à la carte, en px. */
const CARD_HEIGHT = 590;
const EYEBROW_HEIGHT = 84;
const TITLE_GAP = 52;
/* Retard de la carte sur l'écriture du pavé, en images. */
const CARD_LAG = 4;
/* Plan de grille : défilement en px par image, et ses lignes de braise. */
const FLOOR_SPEED = 3;
const FLOOR_LINE = "color-mix(in oklab, var(--ember-2) 48%, transparent)";
/* Halo sous la carte : taille en px, intensité en %, souffle, période en images. */
const POOL = { width: 900, height: 280, strength: 48, breathe: 0.3, period: 36 };

function HookEyebrow({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  /* Déjà presque posée à la première image : le Reel ne s'ouvre jamais sur du vide. */
  const shown = progress(frame, -4, 6);
  const pulse = Math.max(0, wave(frame, fps));
  return (
    <p
      className="flex items-center gap-[0.45rem] text-[1.15rem] font-bold uppercase tracking-[0.14em] text-ember-1"
      style={{ opacity: shown, transform: `translateY(${(1 - shown) * 16}px)` }}
    >
      <span
        className="ember-gradient size-[0.5rem] shrink-0 rounded-full"
        style={{ transform: `scale(${1 + pulse * 0.25})`, boxShadow: `0 0 ${12 + pulse * 20}px var(--ember-2)` }}
      />
      {text}
    </p>
  );
}

export function Hook({ eyebrow, title }: BlockBrand & HookProps) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const floor = progress(frame, 0, 12);
  const cardAt = markStart(title, 0) + CARD_LAG;
  /* Le halo naît quand la carte se pose : en flamme, il est une ombre. */
  const pool = progress(frame, cardAt + 4, 10) * (1 - POOL.breathe + wave(frame, POOL.period) * POOL.breathe);
  const column = width - 2 * MARGIN;
  return (
    <Stage>
      <div className="absolute" style={{ left: -SAFE.left, top: -SAFE.top, width, height }}>
        <div className="absolute inset-x-[-30%] bottom-0 h-[62%]" style={{ perspective: 700, opacity: floor }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: [0, 90].map((angle) => `linear-gradient(${angle}deg, ${FLOOR_LINE} 2px, transparent 2px)`).join(", "),
              backgroundSize: "56px 56px",
              transform: "rotateX(68deg)",
              transformOrigin: "50% 100%",
              backgroundPosition: `0 ${frame * FLOOR_SPEED}px`,
              maskImage: "linear-gradient(to top, black 35%, transparent 90%)",
            }}
          />
        </div>

        <div
          className="absolute flex flex-col justify-center"
          style={{ left: MARGIN, top: REGION.top, width: column, height: REGION.bottom - REGION.top }}
        >
          <HookEyebrow text={eyebrow} />
          <div className="mt-[0.6rem]" style={{ marginBottom: TITLE_GAP }}>
            <HookTitle title={title} start={0} column={column} budget={REGION.bottom - REGION.top - EYEBROW_HEIGHT - TITLE_GAP - CARD_HEIGHT} />
          </div>
          <div className="relative">
            <div
              className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2"
              style={{
                width: POOL.width,
                height: POOL.height,
                opacity: pool,
                background: `radial-gradient(closest-side, color-mix(in oklab, var(--ember-2) ${POOL.strength}%, transparent), transparent)`,
              }}
            />
            <HookCachet start={cardAt} width={column} />
          </div>
        </div>
      </div>
    </Stage>
  );
}
