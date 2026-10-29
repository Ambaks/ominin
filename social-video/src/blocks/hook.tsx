import { useCurrentFrame, useVideoConfig } from "remotion";
import type { HookProps } from "../../../frontend/lib/social/script.ts";
import { progress, wave } from "../motion.ts";
import { HookCachet } from "./hook-cachet.tsx";
import { HookTitle } from "./hook-title.tsx";
import { SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * L'accroche : l'étiquette du sujet et le grand titre au pavé braise, posés
 * sur le Cachet de la table, lui-même posé sur un plan de grille qui file
 * vers le bas de la toile, sous l'interface. La carte ne bouge pas d'un
 * titre à l'autre : le titre s'empile vers le haut au-dessus d'elle.
 */

/* Haut de la carte sur la toile, et écart du titre à la carte, en px. */
const CARD_TOP = 1060;
const TITLE_GAP = 90;
/* Plan de grille : défilement en px par image, et ses lignes de braise. */
const FLOOR_SPEED = 1.5;
const FLOOR_LINE = "color-mix(in oklab, var(--ember-2) 26%, transparent)";

function HookEyebrow({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = progress(frame, 0, 8);
  const pulse = Math.max(0, wave(frame, fps));
  return (
    <p
      className="flex items-center gap-[0.42rem] text-[1.05rem] font-bold uppercase tracking-[0.14em] text-ember-1"
      style={{ opacity: shown, transform: `translateY(${(1 - shown) * 16}px)` }}
    >
      <span
        className="ember-gradient size-[0.45rem] shrink-0 rounded-full"
        style={{ transform: `scale(${1 + pulse * 0.25})`, boxShadow: `0 0 ${12 + pulse * 20}px var(--ember-2)` }}
      />
      {text}
    </p>
  );
}

export function Hook({ eyebrow, title }: BlockBrand & HookProps) {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const floor = progress(frame, 4, 20);
  return (
    <Stage>
      {/* Toute la toile : le plan de grille et la flaque de lumière sous la carte. */}
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
          className="absolute inset-0"
          style={{
            opacity: floor * (0.85 + wave(frame, durationInFrames) * 0.15),
            background: `radial-gradient(ellipse 620px 300px at 50% ${CARD_TOP + 560}px, color-mix(in oklab, var(--ember-2) 34%, transparent), transparent)`,
          }}
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex flex-col justify-end" style={{ height: CARD_TOP - SAFE.top - TITLE_GAP }}>
        <HookEyebrow text={eyebrow} />
        <div className="mt-[1rem]">
          <HookTitle title={title} start={2} />
        </div>
      </div>
      <div className="absolute left-0" style={{ top: CARD_TOP - SAFE.top }}>
        <HookCachet />
      </div>
    </Stage>
  );
}
