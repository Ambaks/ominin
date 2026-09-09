/*
 * Graphiques de l'onglet Clients : SVG à la main, sans bibliothèque, une seule
 * série et une seule couleur (--chart-mark) — même retenue que
 * shop/gestion/sales-chart.tsx. Une série unique n'a pas besoin de légende :
 * le titre du bloc la nomme, et rien n'est jamais distingué par la couleur
 * seule. Les valeurs restent en encres de texte, jamais en couleur de série.
 */

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-faint">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-medium tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export interface BarPoint {
  key: string;
  /** Étiquette d'axe, courte (« 12/08 »). */
  label: string;
  value: number;
  /** Texte complet au survol. */
  title: string;
}

export function BarSeries({
  data,
  ariaLabel,
  formatTick,
  empty = "Rien à afficher sur la période.",
}: {
  data: BarPoint[];
  ariaLabel: string;
  formatTick: (value: number) => string;
  empty?: string;
}) {
  const max = Math.max(0, ...data.map((point) => point.value));
  if (max === 0) {
    return (
      <p className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
        {empty}
      </p>
    );
  }

  const width = 640;
  const height = 200;
  const padLeft = 56;
  const padBottom = 24;
  const innerW = width - padLeft - 8;
  const innerH = height - padBottom - 8;
  const step = innerW / data.length;
  const barW = Math.min(22, step * 0.6);
  // Une étiquette d'axe sur N : au-delà, elles se chevauchent.
  const labelEvery = Math.ceil(data.length / 12);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-52 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {[0, 0.5, 1].map((ratio) => {
        const y = 8 + innerH - innerH * ratio;
        return (
          <g key={ratio}>
            <line
              x1={padLeft}
              x2={width - 8}
              y1={y}
              y2={y}
              stroke="var(--hairline)"
            />
            <text
              x={padLeft - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--faint)"
            >
              {formatTick(max * ratio)}
            </text>
          </g>
        );
      })}
      {data.map((point, index) => {
        const barH = (innerH * point.value) / max;
        const x = padLeft + step * index + (step - barW) / 2;
        return (
          <g key={point.key}>
            <title>{point.title}</title>
            <rect
              x={x}
              y={8 + innerH - barH}
              width={barW}
              height={barH}
              rx="3"
              fill="var(--chart-mark)"
            />
            {index % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--faint)"
              >
                {point.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface FunnelStep {
  label: string;
  value: number;
}

/**
 * L'entonnoir. Chaque étape est étiquetée : c'est la donnée elle-même, pas une
 * décoration. Le pourcentage se lit par rapport à la première étape — « sur
 * cent menus ouverts, combien de commandes ».
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.value ?? 0;
  if (top === 0) {
    return (
      <p className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
        Aucune visite sur la période.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((step) => {
        const ratio = step.value / top;
        return (
          <li key={step.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-muted">
              {step.label}
            </span>
            <span className="h-6 flex-1 overflow-hidden rounded-md bg-surface-raised">
              <span
                className="block h-full rounded-md"
                style={{
                  width: `${Math.max(ratio * 100, ratio > 0 ? 1.5 : 0)}%`,
                  background: "var(--chart-mark)",
                }}
              />
            </span>
            <span className="w-24 shrink-0 text-right text-xs tabular-nums">
              <span className="font-semibold">{step.value}</span>{" "}
              <span className="text-faint">
                {ratio.toLocaleString("fr-FR", {
                  style: "percent",
                  maximumFractionDigits: 0,
                })}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Barre de volume d'une ligne de tableau (palmarès des plats). */
export function VolumeBar({ ratio }: { ratio: number }) {
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%`,
          background: "var(--chart-mark)",
        }}
      />
    </span>
  );
}
