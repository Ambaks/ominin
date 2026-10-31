import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { GLASS_ENTITY, type Entity } from "./entity";

export function GlassFrame({
  entity = "none",
  eyebrow,
  icon,
  href,
  onClick,
  hero = false,
  title,
  className = "",
  i,
  children,
}: {
  entity?: Entity;
  /** Surtitre à la couleur de l'entité, au-dessus de la plaque. */
  eyebrow?: string;
  icon?: ReactNode;
  /** Cadre cliquable : le cadre entier est le lien. */
  href?: string;
  /** Cadre bouton : il ouvre une feuille ; une flèche le dit. */
  onClick?: () => void;
  /** Tuile du jour : rayon héros (24 px), surtitre plus haut. */
  hero?: boolean;
  title?: string;
  className?: string;
  /** Rang d'entrée : le verre lui-même monte (`g-rise`, `--g-i`). Absent, pas d'entrée. */
  i?: number;
  children: ReactNode;
}) {
  const classes = `g-glass block p-g-pad ${hero ? "g-glass-hero" : ""} ${GLASS_ENTITY[entity]} ${href || onClick ? "g-press" : ""} ${i == null ? "" : "g-rise"} ${className}`;
  const style = i == null ? undefined : ({ "--g-i": i } as CSSProperties);
  const body = (
    <>
      {eyebrow && (
        <div className="g-cap">
          {icon && <span className="flex shrink-0 text-g-entity *:size-4">{icon}</span>}
          <span className="g-eyebrow">{eyebrow}</span>
          {onClick && <span className="g-cap-more" aria-hidden>›</span>}
        </div>
      )}
      {children}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onClick}
        title={title}
        className={`${classes} w-full cursor-pointer text-left`}
        style={style}
      >
        {body}
      </button>
    );
  }
  return href ? (
    <Link href={href} title={title} className={classes} style={style}>
      {body}
    </Link>
  ) : (
    <div title={title} className={classes} style={style}>
      {body}
    </div>
  );
}
