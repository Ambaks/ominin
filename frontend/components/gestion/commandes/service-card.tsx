import { useState, type CSSProperties, type ReactNode } from "react";
import { ENTITY, Plate, type Entity } from "@/components/gestion/ui";

/**
 * Une carte du service sur une plaque : son surtitre à la couleur de ce
 * qu'elle attend (argent pour une addition, activité pour un service, grenat
 * pour un retard), son titre Fraunces, ce qui se lit en face, et son contenu.
 * `i` : rang d'entrée (`g-rise`) figé au montage — une carte déjà là ne
 * rejoue pas sa montée quand la page change d'onglet ou d'avis.
 */
export function ServiceCard({
  entity,
  eyebrow,
  icon,
  title,
  headingId,
  right,
  sub,
  i,
  ready = false,
  className = "",
  children,
}: {
  entity: Entity;
  eyebrow: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  headingId?: string;
  /** En face du titre : montant, règlement, état. */
  right?: ReactNode;
  /** Sous le titre : la règle, l'heure, l'identifiant caisse. */
  sub?: ReactNode;
  /** Rang d'entrée dans la page ; absent, la carte apparaît sans mouvement. */
  i?: number;
  /** Arrivée en temps réel : l'onde de braise, une fois. */
  ready?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [rise] = useState(i);
  return (
    <Plate
      className={`${ENTITY[entity]} ${rise === undefined ? "" : "g-rise"} ${ready ? "g-ready" : ""} flex flex-col p-5 ${className}`}
      style={rise === undefined ? undefined : ({ "--g-i": rise } as CSSProperties)}
    >
      <p className="g-eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
        {icon && <span className="flex shrink-0 *:size-4">{icon}</span>}
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="min-w-0 font-display text-g-h2 [overflow-wrap:anywhere]">
          {title}
        </h3>
        {right}
      </div>
      {sub && <div className="mt-1 text-g-meta text-muted">{sub}</div>}
      {children}
    </Plate>
  );
}
