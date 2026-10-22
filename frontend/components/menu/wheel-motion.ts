/** Les quatre nombres d'un cubic-bezier CSS. */
export type Ease = [number, number, number, number];

/** cubic-bezier en fonction : l'angle de la roue se calcule, sans relire le style à chaque image. */
export function bezier([x1, y1, x2, y2]: Ease) {
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < x) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}

/** Petit gain, beau gain, gros lot : la fête se mesure au lot. */
export type WinTier = "small" | "mid" | "jackpot";

export interface Piece {
  x: number;
  rise: number;
  turn: number;
  delay: number;
  kind: "coin" | "a" | "b" | "c";
}

/** Pièces et fanions, par vagues : deux petites, trois, ou quatre pleines pour le gros lot. */
export function burst(tier: WinTier): Piece[] {
  // Écart et hauteur bornés — la roue est encore à pleine échelle (×1,78) au
  // jaillissement : les pièces restent sous la série et le titre.
  const [waves, perWave, spread, lift] = {
    small: [2, 8, 60, 40],
    mid: [3, 14, 70, 50],
    jackpot: [4, 20, 80, 60],
  }[tier];
  const kinds: Piece["kind"][] = ["coin", "a", "coin", "b", "coin", "c"];
  return Array.from({ length: waves * perWave }, (_, i) => {
    const side = Math.random() < 0.5 ? -1 : 1;
    return {
      x: side * (25 + Math.random() * spread),
      rise: -(60 + Math.random() * lift),
      turn: (Math.random() - 0.5) * 1080,
      delay: Math.floor(i / perWave) * 180 + Math.random() * 60,
      kind: kinds[i % kinds.length],
    };
  });
}

/**
 * Le tour, de l'élan pris (`start`, le recul) à la part (`target`) : longue
 * accélération, six tours, dépassement de 0,3 part — parfois dans la voisine,
 * l'aiguille y claque —, retour un rien trop loin, arrêt. `tease` : le
 * dépassement va jusqu'à 0,45 part et la roue y hésite un instant avant de
 * revenir, le frisson du presque. Rend les images clés de Web Animations et
 * l'angle à chaque instant, pour l'aiguille.
 */
export function spinPath(start: number, target: number, step: number, tease = false) {
  const past = target + step * (tease ? 0.45 : 0.3);
  const segments: { until: number; to: number; ease: Ease }[] = [
    { until: tease ? 0.85 : 0.875, to: past, ease: [0.5, 0, 0.12, 1] },
    ...(tease ? [{ until: 0.875, to: past, ease: [0, 0, 1, 1] as Ease }] : []),
    { until: 0.955, to: target - step * 0.04, ease: [0.2, 0.6, 0.3, 1] },
    { until: 1, to: target, ease: [0.45, 0, 0.55, 1] },
  ];
  const curves = segments.map((segment) => bezier(segment.ease));
  const angleAt = (progress: number) => {
    let from = start;
    let begin = 0;
    for (const [i, segment] of segments.entries()) {
      if (progress <= segment.until) {
        return from + (segment.to - from) * curves[i]((progress - begin) / (segment.until - begin));
      }
      from = segment.to;
      begin = segment.until;
    }
    return target;
  };
  const keyframes: Keyframe[] = [
    { transform: `rotate(${start}deg)`, easing: `cubic-bezier(${segments[0].ease})` },
    ...segments.map((segment, i) => ({
      transform: `rotate(${segment.to}deg)`,
      offset: segment.until,
      ...(segments[i + 1] && { easing: `cubic-bezier(${segments[i + 1].ease})` }),
    })),
  ];
  return { keyframes, angleAt };
}
