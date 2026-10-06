import { formatHour, formatInteger } from "@/lib/demo/reseau/format";

/** Le point « maintenant » : un anneau net, jamais un halo teinté (olive à l'image). */
const NOW_DOT = "rounded-full bg-ember-2 shadow-[0_0_0_2px_var(--surface),0_0_0_3.5px_var(--ember-2)]";

type Point = { at: number; count: number };

const WIDTH = 1000;
const HEIGHT = 100;

/** Graduations rondes (1, 2 ou 5 × 10ⁿ), au plus `count` pas jusqu'au maximum. */
function niceTicks(max: number, count: number): number[] {
  const power = 10 ** Math.floor(Math.log10(Math.max(1, max / count)));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => Math.ceil(max / s) <= count) ?? 10 * power;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Moyenne glissante centrée sur 2 × `half` + 1 points : la tendance plutôt que le bruit. */
export function smooth(points: Point[], half: number): Point[] {
  return points.map((p, i) => {
    const window = points.slice(Math.max(0, i - half), i + half + 1);
    return { at: p.at, count: window.reduce((s, q) => s + q.count, 0) / window.length };
  });
}

/**
 * Tracé lissé passant par chaque point, monotone entre deux points
 * (Fritsch–Carlson) : ni dépassement sous zéro, ni bosse qui n'existe pas.
 */
export function curve(points: [number, number][]): string {
  const n = points.length;
  if (n < 2) return "";
  const x = points.map((p) => p[0]);
  const y = points.map((p) => p[1]);
  const slope = x.slice(1).map((xi, i) => (y[i + 1] - y[i]) / (xi - x[i]));
  const tangent = x.map((_, i) =>
    i === 0 ? slope[0] : i === n - 1 ? slope[n - 2] : slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  );
  slope.forEach((s, i) => {
    if (s === 0) {
      tangent[i] = tangent[i + 1] = 0;
      return;
    }
    const a = tangent[i] / s;
    const b = tangent[i + 1] / s;
    const h = a * a + b * b;
    if (h > 9) {
      tangent[i] = (3 * a * s) / Math.sqrt(h);
      tangent[i + 1] = (3 * b * s) / Math.sqrt(h);
    }
  });
  let d = `M${x[0].toFixed(1)},${y[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const third = (x[i + 1] - x[i]) / 3;
    d += `C${(x[i] + third).toFixed(1)},${(y[i] + tangent[i] * third).toFixed(2)} ${(x[i + 1] - third).toFixed(1)},${(y[i + 1] - tangent[i + 1] * third).toFixed(2)} ${x[i + 1].toFixed(1)},${y[i + 1].toFixed(2)}`;
  }
  return d;
}

/**
 * Commandes par tranche de temps : aujourd'hui jusqu'à l'instant, la
 * semaine dernière en pointillés, lissée, sur toute la journée. Le repère
 * SVG est étiré à la taille du cadre (traits non déformés) ; textes et
 * points sont en HTML, placés en pourcentage.
 */
export function ActivityChart({
  today,
  reference,
  start,
  end,
  now,
  label,
  tickHours,
  scaleMax,
  ticks,
  forecast,
}: {
  today: Point[];
  /** La semaine dernière, déjà lissée. */
  reference: Point[];
  start: number;
  end: number;
  now: number;
  /** Ce que montre la courbe, lu par les lecteurs d'écran. */
  label: string;
  tickHours: number;
  /**
   * Maximum de l'axe, pris sur toute la journée (aujourd'hui compris) : la
   * graduation ne bouge plus quand l'heure avance.
   */
  scaleMax: number;
  /** Nombre de pas de graduation, au plus. */
  ticks: number;
  /** Prochaine pointe attendue, signalée sur la courbe de la semaine dernière. */
  forecast: (Point & { label: string }) | null;
}) {
  const levels = niceTicks(Math.max(1, scaleMax), ticks);
  const top = levels[levels.length - 1];
  const x = (at: number) => ((at - start) / (end - start)) * WIDTH;
  const y = (count: number) => HEIGHT - (count / top) * HEIGHT;
  const path = (points: Point[]) => curve(points.map((p) => [x(p.at), y(p.count)]));
  // La courbe finit sur le rythme du moment (le dernier quart d'heure
  // glissant), marqué d'un point jaune.
  const last = today[today.length - 1];
  // Graduations toutes les `tickHours` heures depuis l'ouverture, à pas réguliers.
  const graduations: number[] = [];
  for (let h = start; h <= end; h += tickHours * 3600) graduations.push(h);
  const inRange = now >= start && now <= end && last != null;
  const pct = (at: number, count: number) => ({
    left: `${(x(at) / WIDTH) * 100}%`,
    top: `${(y(count) / HEIGHT) * 100}%`,
  });

  return (
    <div className="flex h-full flex-col" role="img" aria-label={label}>
      <div className="relative min-h-0 flex-1">
        {levels.map((level) => (
          <span
            key={level}
            className="absolute left-0 w-9 -translate-y-1/2 text-right text-[0.8125rem] text-faint tabular-nums"
            style={{ top: `${(1 - level / top) * 100}%` }}
          >
            {formatInteger(level)}
          </span>
        ))}
        <div className="absolute inset-y-0 left-12 right-4">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {levels.map((level) => (
              <line
                key={level}
                x1={0}
                x2={WIDTH}
                y1={y(level)}
                y2={y(level)}
                className={level === 0 ? "stroke-foreground/15" : "stroke-hairline"}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path
              d={path(reference)}
              className="fill-none stroke-foreground/40"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
            {today.length > 1 && (
              <>
                <path
                  d={`${path(today)}L${x(last.at).toFixed(1)},${HEIGHT}L${x(today[0].at).toFixed(1)},${HEIGHT}Z`}
                  className="fill-foreground/[0.05]"
                />
                <path
                  d={path(today)}
                  className="fill-none stroke-foreground/90"
                  strokeWidth={2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )}
            {inRange && (
              <line
                x1={x(now)}
                x2={x(now)}
                y1={0}
                y2={HEIGHT}
                className="stroke-foreground/25"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
          {inRange && (
            <span className={`absolute size-2.5 -translate-x-1/2 -translate-y-1/2 ${NOW_DOT}`} style={pct(last.at, last.count)} />
          )}
          {forecast && (
            <>
              <span
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/60 bg-surface"
                style={pct(forecast.at, forecast.count)}
              />
              <span
                className="absolute -translate-x-1/2 -translate-y-[calc(100%+0.5rem)] whitespace-nowrap rounded bg-surface px-1 text-[0.8125rem] text-muted tabular-nums"
                style={pct(forecast.at, forecast.count)}
              >
                Pointe attendue · {forecast.label}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="relative ml-12 mr-4 mt-2 h-4 text-xs text-faint tabular-nums sm:text-[0.8125rem]">
        {graduations.map((h) => (
          <span key={h} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${(x(h) / WIDTH) * 100}%` }}>
            {formatHour(h / 60)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** La légende des courbes : aujourd'hui, la semaine dernière, l'instant et son rythme (`pace` `unit`). */
export function ChartLegend({ reference, pace, unit }: { reference: string; pace: number | null; unit: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="h-0.5 w-4 rounded-full bg-foreground/70" />
        Aujourd’hui
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="w-4 border-t border-dashed border-faint" />
        {reference}
      </span>
      <span className="flex items-center gap-1.5 tabular-nums">
        <span aria-hidden className={`size-2 ${NOW_DOT}`} />
        Maintenant
        {pace != null && (
          <span>
            {" · "}
            <span className="font-semibold text-foreground">{formatInteger(pace)}</span> {unit}
          </span>
        )}
      </span>
    </div>
  );
}
