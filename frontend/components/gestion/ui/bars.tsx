import type { CSSProperties } from "react";
import { ENTITY, type Entity } from "./entity";

export interface Bar {
  /** Étiquette d'axe ; vide pour une colonne muette (heures). */
  label: string;
  value: number;
  /** Second chiffre sous l'étiquette (commandes du jour). */
  sub?: string;
}

export function Bars({
  data,
  ticks,
  format,
  label,
  entity = "money",
  dense = false,
}: {
  data: readonly Bar[];
  /** Valeurs des lignes de grille, 0 compris ; la plus haute est le plafond. */
  ticks: readonly number[];
  /** Valeur → texte (étiquette du maximum, infobulles). */
  format: (value: number) => string;
  /** Description complète pour les lecteurs d'écran. */
  label: string;
  entity?: Entity;
  /** Beaucoup de colonnes (24 heures) : barres pleines, axe clairsemé. */
  dense?: boolean;
}) {
  const top = Math.max(...ticks);
  const max = Math.max(...data.map((bar) => bar.value));
  const maxIndex = data.findIndex((bar) => bar.value === max);
  const axisFormat = new Intl.NumberFormat("fr-FR");
  return (
    <div
      role="img"
      aria-label={label}
      className={`g-bars ${dense ? "g-bars-dense" : ""} ${ENTITY[entity]}`}
      style={{ "--g-top": top, "--g-n": data.length } as CSSProperties}
    >
      <div className="g-bars-grid">
        {ticks.map((tick) => (
          <i key={tick} style={{ "--g-y": tick } as CSSProperties}>
            {tick > 0 && <span>{axisFormat.format(tick)}</span>}
          </i>
        ))}
      </div>
      <div className="g-bars-plot">
        {data.map((bar, index) => (
          <i
            key={index}
            className="g-bar"
            style={{ "--g-v": bar.value } as CSSProperties}
            title={[bar.label, format(bar.value), bar.sub].filter(Boolean).join(" · ")}
          >
            {index === maxIndex && max > 0 && <b>{format(max)}</b>}
          </i>
        ))}
      </div>
      <div className="g-bars-axis">
        {data.map((bar, index) => (
          <span key={index}>
            {bar.label}
            {bar.sub && <small>{bar.sub}</small>}
          </span>
        ))}
      </div>
    </div>
  );
}
