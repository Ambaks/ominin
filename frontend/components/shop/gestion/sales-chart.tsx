import { formatPrice } from "@/lib/shop/format";

/*
 * Ventes par jour : histogramme SVG sans bibliothèque (une seule série,
 * une couleur de marque, axes discrets — même retenue que les autres
 * graphiques d'Ominin).
 */
interface Point {
  day: string;
  orders_count: number;
  revenue_cents: number;
}

export function SalesChart({ data }: { data: Point[] }) {
  const max = Math.max(0, ...data.map((d) => Number(d.revenue_cents)));
  if (max === 0) return <p className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">Aucune vente sur la période.</p>;

  const width = 640;
  const height = 200;
  const padLeft = 48;
  const padBottom = 24;
  const innerW = width - padLeft - 8;
  const innerH = height - padBottom - 8;
  const step = innerW / data.length;
  const barW = Math.min(22, step * 0.6);
  const ticks = [0, 0.5, 1].map((t) => Math.round((max * t) / 100));
  const label = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label="Ventes par jour">
      {ticks.map((euros, i) => {
        const y = 8 + innerH - (innerH * i) / 2;
        return (
          <g key={euros}>
            <line x1={padLeft} x2={width - 8} y1={y} y2={y} stroke="var(--hairline)" />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--faint)">
              {euros} €
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const revenue = Number(d.revenue_cents);
        const h = max ? (innerH * revenue) / max : 0;
        const x = padLeft + step * i + (step - barW) / 2;
        const y = 8 + innerH - h;
        return (
          <g key={d.day}>
            <title>{`${label(d.day)} · ${d.orders_count} commande${Number(d.orders_count) > 1 ? "s" : ""} · ${formatPrice(revenue)}`}</title>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill="var(--chart-mark)" />
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--faint)">
                {label(d.day)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
