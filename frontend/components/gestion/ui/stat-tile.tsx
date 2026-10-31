import type { ReactNode } from "react";
import { ENTITY, type Entity } from "./entity";
import { GlassFrame } from "./glass-frame";
import { Plate } from "./plate";

export type DeltaTone = "better" | "worse" | "neutral";

const DELTA_CLASS: Record<DeltaTone, string> = {
  better: "text-status-signed",
  worse: "text-status-lost",
  neutral: "text-muted",
};

export function StatTile({
  label,
  value,
  baseline,
  delta,
  href,
  onClick,
  chart,
  fill = false,
  entity = "none",
  icon,
  hero = false,
  plain = false,
  title,
}: {
  label: string;
  value: string;
  /** Le repère unique : « vs vendredi dernier », « 3 à encaisser · 4 à servir ». */
  baseline?: string;
  /** Écart signé devant le repère, coloré par le sens. */
  delta?: { text: string; tone: DeltaTone };
  href?: string;
  /** La tuile ouvre le détail de son chiffre. */
  onClick?: () => void;
  /** Un graphique sous le chiffre. */
  chart?: ReactNode;
  /** Sans graphique, la plaque remplit quand même la hauteur de sa rangée. */
  fill?: boolean;
  entity?: Entity;
  icon?: ReactNode;
  /** Tuile du jour : chiffre 40 px dans un cadre héros. */
  hero?: boolean;
  /** Plaque seule avec un point d'entité, hors budget de verre. */
  plain?: boolean;
  title?: string;
}) {
  const ref = (baseline || delta) && (
    <p className={`${hero ? "mt-2.5 text-g-label" : "mt-2 text-g-meta"} text-muted`}>
      {delta && <b className={`font-semibold ${DELTA_CLASS[delta.tone]}`}>{delta.text}</b>}
      {delta && baseline && " "}
      {baseline}
    </p>
  );

  if (plain) {
    return (
      <Plate className={`${ENTITY[entity]} p-5`} title={title}>
        <p className="flex items-center gap-2 text-g-label text-muted">
          <span className="size-2 rounded-full bg-g-entity" aria-hidden />
          {label}
        </p>
        <p className="mt-3 text-g-kpi tabular-nums">{value}</p>
        {ref}
      </Plate>
    );
  }

  return (
    <GlassFrame
      entity={entity}
      eyebrow={label}
      icon={icon}
      href={href}
      onClick={onClick}
      hero={hero}
      title={title}
      className={chart || fill ? "flex flex-col" : ""}
    >
      <Plate className={`${hero ? "p-5" : "p-4"} ${chart || fill ? "flex-1" : ""}`}>
        <p className={`${hero ? "text-g-day" : "text-g-kpi"} tabular-nums whitespace-nowrap`}>
          {value}
        </p>
        {ref}
        {chart}
      </Plate>
    </GlassFrame>
  );
}
