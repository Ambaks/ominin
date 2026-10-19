import type { PlanMark, ZoneLayout } from "@/lib/club/types";

/*
 * Le dessin d'une offre : la silhouette de sa zone (murs, bar, DJ, scène),
 * en traits d'or sur sa teinte, sans aucune table — l'ambiance du lieu,
 * jamais son stock. Les murs se tracent à l'arrivée (pathLength 1), les
 * repères apparaissent ensuite ; choisie, l'offre se retrace en plus vif.
 */
function Mark({ mark }: { mark: PlanMark }) {
  if (mark.kind === "rambarde") return <line x1={mark.x} y1={mark.y} x2={mark.x + (mark.w ?? 0)} y2={mark.y} />;
  if (!mark.w || !mark.h) return null;
  return <rect className={`club-offer-mark club-offer-${mark.kind}`} x={mark.x} y={mark.y} width={mark.w} height={mark.h} rx={8} />;
}

export function OfferVisual({ layout }: { layout: ZoneLayout }) {
  return (
    <span className="club-offer-visual" aria-hidden>
      <svg viewBox={`0 0 ${layout.w} ${layout.h}`} preserveAspectRatio="xMidYMid meet">
        <g className="club-offer-walls">
          {layout.walls.map((wall, index) => (
            <polyline key={index} pathLength={1} points={wall.map(([x, y]) => `${x},${y}`).join(" ")} />
          ))}
        </g>
        <g className="club-offer-marks">
          {layout.marks.map((mark, index) => (
            <Mark key={index} mark={mark} />
          ))}
        </g>
      </svg>
    </span>
  );
}
