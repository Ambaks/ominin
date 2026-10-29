import { useCurrentFrame, useVideoConfig } from "remotion";
import type { PointsProps } from "../../../frontend/lib/social/script.ts";
import { progress } from "../motion.ts";
import { PointsPhone } from "./points-phone.tsx";
import { PointsTitle } from "./points-title.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Ce que fait la fonctionnalité : l'étiquette et le titre, ancrés en haut,
 * puis le téléphone du client monte du bas de la toile, qu'il déborde ; ses
 * points s'y cochent. Le pavé du titre a la largeur des marges, son texte le
 * même retrait que l'étiquette.
 */

/** Marge du pavé, de chaque côté de la toile. */
const EDGE = 72;
/** Retrait du texte dans le pavé. */
const INSET = 28;
/** Haut de l'étiquette, en px de la toile. */
const KICKER_TOP = 330;
/** Bas du volet, en px de la toile : ses points restent au-dessus de l'interface d'Instagram, le ticket sort dessous. */
const SHEET_BOTTOM = 1590;
/** En dessous, l'entrée se joue plus vite pour finir à temps. */
const PACE_FRAMES = 75;

export function Points({ brand, kicker, title, points }: BlockBrand & PointsProps) {
  const { width, durationInFrames } = useVideoConfig();
  const pace = Math.max(1, PACE_FRAMES / durationInFrames);
  const frame = useCurrentFrame() * pace;
  const boxWidth = width - 2 * EDGE;
  const kickerIn = progress(frame, 0, 12);
  return (
    <Stage>
      <div
        className="isolate flex shrink-0 flex-col"
        style={{ paddingTop: KICKER_TOP - SAFE.top, marginLeft: EDGE - SAFE.left, width: boxWidth, height: SHEET_BOTTOM - SAFE.top }}
      >
        <div style={{ paddingLeft: INSET, transform: `translateY(${(1 - kickerIn) * 16}px)` }}>
          <Eyebrow brand={brand} text={kicker} />
        </div>
        <div className="mt-[24px]">
          <PointsTitle title={title} start={0} frame={frame} width={boxWidth} inset={INSET} />
        </div>
        {/* Le téléphone prend la hauteur restante (unités cqh) : le volet finit toujours à SHEET_BOTTOM. */}
        <div className="mt-[44px] min-h-0 flex-1" style={{ containerType: "size" }}>
          <PointsPhone brand={brand} points={points} frame={frame} end={durationInFrames * pace} />
        </div>
      </div>
    </Stage>
  );
}
