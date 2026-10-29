import { useContext } from "react";
import { LookContext } from "../look.ts";
import { progress, wave } from "../motion.ts";

/*
 * Le ticket de cuisine, imprimé sous le volet une fois tout coché : une
 * ligne par point, longue comme son texte, entre deux pointillés. Aucun mot
 * dessus ; le papier reste clair dans tous les habillages.
 */

const WIDTH = 560;
const TEETH = 20;
/** Durée de l'impression, en images. */
const FEED = 20;
/** Bord haut qui reste sous le volet, ticket sorti, en px. */
const HIDDEN = 40;
/** Longueur de texte d'une ligne pleine. */
const FULL_LINE = 34;

const zigzag = Array.from({ length: TEETH }, (_, i) => `L${((i + 0.5) * WIDTH) / TEETH} 18 L${((i + 1) * WIDTH) / TEETH} 0`).join(" ");

/** bottom : bas du volet, en px depuis le bas de l'écran ; lag : retard du volet à l'entrée, en px. */
export function PointsTicket({ points, frame, at, end, bottom, lag }: { points: string[]; frame: number; at: number; end: number; bottom: number; lag: number }) {
  const look = useContext(LookContext);
  const light = look === "lin" || look === "flamme";
  const paper = light ? "var(--surface-raised)" : "var(--foreground)";
  const ink = light ? "var(--foreground)" : "var(--background)";
  const feed = progress(frame, at, FEED);
  const rule = <div className="mt-[22px] border-t-[3px] border-dashed" style={{ borderColor: `color-mix(in oklab, ${ink} 30%, transparent)` }} />;
  const bar = (width: string, height: number, alpha: number) => (
    <span className="block rounded-full" style={{ width, height, background: `color-mix(in oklab, ${ink} ${alpha}%, transparent)` }} />
  );

  return (
    <div
      className="absolute left-1/2"
      style={{
        bottom: bottom + 4,
        width: WIDTH,
        transformOrigin: "50% 0",
        filter: "drop-shadow(0 24px 30px rgb(0 0 0 / 0.55))",
        transform: `translate(-50%, calc(${lag}px + ${feed} * (100% - ${HIDDEN}px))) rotate(${wave(frame, end) * 0.6}deg)`,
      }}
    >
      <div className="px-[36px] pb-[28px] pt-[52px]" style={{ background: paper }}>
        <div className="flex items-center justify-between">
          {bar("46%", 18, 85)}
          <span className="ember-gradient block h-[30px] w-[90px] rounded-full" />
        </div>
        {rule}
        <div className="mt-[20px] flex flex-col gap-[18px]">
          {points.map((point) => (
            <div key={point} className="flex items-center gap-[16px]">
              <svg viewBox="0 0 52 52" className="size-[30px] shrink-0" style={{ stroke: ink }} aria-hidden>
                <path d="M15 27l8 8 15-17" fill="none" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {bar(`${Math.min(1, point.length / FULL_LINE) * 100}%`, 14, 65)}
            </div>
          ))}
        </div>
        {rule}
        <div className="mt-[20px] flex items-center justify-between">
          {bar("30%", 18, 85)}
          {bar("22%", 18, 85)}
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} 18`} className="block w-full" style={{ fill: paper }} aria-hidden>
        <path d={`M0 0 ${zigzag} Z`} />
      </svg>
    </div>
  );
}
