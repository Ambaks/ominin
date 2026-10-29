import { useVideoConfig } from "remotion";
import { SAFE } from "./stage.tsx";

/*
 * Le sol de la scène, sous l'interface d'Instagram : la règle du chiffre
 * couchée en perspective, sur toute la largeur, qui défile pendant le compte
 * (vers la gauche en montant, vers la droite à rebours) puis glisse
 * lentement jusqu'à la fin, dans une flaque de braise ; après l'arrivée, une
 * lumière balaie ses graduations de gauche à droite.
 */

/* Graduations du sol : pas et longueur en px du plan, opacité de la teinte. */
const STEPS = [
  { every: 48, length: 260, tint: "var(--foreground) 30%" },
  { every: 240, length: 560, tint: "var(--foreground) 48%" },
  { every: 480, length: 1400, tint: "var(--ember-2) 100%" },
];
/** Balayage : course sur la largeur du plan et demi-largeur de la bande, en %. */
const SCAN = { from: 18, to: 82, half: 7 };
const LINE = 4;
/* La lumière du balayage : braise éclaircie, lisible sur fond sombre comme sur flamme. */
const LIGHT = "color-mix(in oklab, var(--ember-1) 65%, var(--surface-raised)) 100%";
const LIGHT_LINE = 9;
/** Hauteur du sol sur la toile, et inclinaison du plan. */
const FLOOR_HEIGHT = 820;
const TILT = 62;

const ticks = (scroll: number, tint?: string, line = LINE) =>
  STEPS.map(
    (step) => `linear-gradient(90deg, color-mix(in oklab, ${tint ?? step.tint}, transparent) 0 ${line}px, transparent ${line}px) ${scroll - (line - LINE) / 2}px 100% / ${step.every}px ${step.length}px repeat-x`,
  ).join(", ");

/**
 * shown : apparition (0 → 1) ; scroll : défilement en px du plan ; glow :
 * intensité de la flaque ; scan : avancée du balayage (0 → 1), hors de
 * l'intervalle, pas de balayage.
 */
export function FigureFloor({ shown, scroll, glow, scan }: { shown: number; scroll: number; glow: number; scan: number }) {
  const { width, height } = useVideoConfig();
  const at = SCAN.from + scan * (SCAN.to - SCAN.from);
  return (
    <div className="pointer-events-none absolute" style={{ left: -SAFE.left, top: -SAFE.top, width, height }}>
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: FLOOR_HEIGHT,
          opacity: glow,
          background: `radial-gradient(ellipse 75% 55% at 50% 100%, color-mix(in oklab, var(--ember-2) 40%, transparent), transparent)`,
        }}
      />
      <div className="absolute inset-x-[-60%] bottom-0" style={{ height: FLOOR_HEIGHT, perspective: 800, opacity: shown }}>
        <div
          className="absolute inset-0"
          style={{ transform: `rotateX(${TILT}deg)`, transformOrigin: "50% 100%", maskImage: "linear-gradient(to top, black 40%, transparent 92%)" }}
        >
          <div className="absolute inset-0" style={{ background: ticks(scroll) }} />
          {scan >= 0 && scan <= 1 && (
            <div
              className="absolute inset-0"
              style={{
                background: ticks(scroll, LIGHT, LIGHT_LINE),
                maskImage: `linear-gradient(90deg, transparent ${at - SCAN.half}%, black ${at}%, transparent ${at + SCAN.half}%)`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
