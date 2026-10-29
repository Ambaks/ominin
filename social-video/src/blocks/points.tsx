import { useCurrentFrame, useVideoConfig } from "remotion";
import type { PointsProps } from "../../../frontend/lib/social/script.ts";
import { progress } from "../motion.ts";
import { PointsPhone } from "./points-phone.tsx";
import { PointsTitle } from "./points-title.tsx";
import { Eyebrow, SAFE, Stage, type BlockBrand } from "./stage.tsx";

/*
 * Ce que fait la fonctionnalité : l'étiquette et le titre, ancrés en haut,
 * puis le téléphone du client sort du bas de la toile et ses points s'y
 * cochent. Le pavé du titre a la largeur des marges, son texte le même
 * retrait que l'étiquette.
 */

/** Marge du pavé, de chaque côté de la toile. */
const EDGE = 72;
/** Retrait du texte dans le pavé. */
const INSET = 28;
/** Haut de l'étiquette, en px de la toile. */
const KICKER_TOP = 330;
/** L'étiquette du plateau, agrandie d'un dixième sous ce titre plus grand. */
const KICKER_ZOOM = 1.1;
/** En dessous, l'entrée se joue plus vite pour finir à temps. */
const PACE_FRAMES = 75;

export function Points({ brand, kicker, title, points }: BlockBrand & PointsProps) {
  const { width, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame() * Math.max(1, PACE_FRAMES / durationInFrames);
  const boxWidth = width - 2 * EDGE;
  const kickerIn = progress(frame, 0, 12);
  return (
    <Stage>
      <div className="isolate flex flex-col" style={{ paddingTop: KICKER_TOP - SAFE.top, marginLeft: EDGE - SAFE.left, width: boxWidth }}>
        <div style={{ paddingLeft: INSET / KICKER_ZOOM, zoom: KICKER_ZOOM, transform: `translateY(${(1 - kickerIn) * 16}px)` }}>
          <Eyebrow brand={brand} text={kicker} />
        </div>
        <div className="mt-[24px]">
          <PointsTitle title={title} start={2} frame={frame} width={boxWidth} inset={INSET} />
        </div>
        <div className="mt-[48px]">
          <PointsPhone brand={brand} points={points} frame={frame} />
        </div>
      </div>
    </Stage>
  );
}
