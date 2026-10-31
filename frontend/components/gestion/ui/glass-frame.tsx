import Link from "next/link";
import type { ReactNode } from "react";
import { GLASS_ENTITY, type Entity } from "./entity";

export function GlassFrame({
  entity = "none",
  eyebrow,
  icon,
  href,
  hero = false,
  title,
  className = "",
  children,
}: {
  entity?: Entity;
  /** Surtitre à la couleur de l'entité, au-dessus de la plaque. */
  eyebrow?: string;
  icon?: ReactNode;
  /** Cadre cliquable : le cadre entier est le lien. */
  href?: string;
  /** Tuile du jour : rayon héros (24 px), surtitre plus haut. */
  hero?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = `g-glass block p-g-pad ${hero ? "g-glass-hero" : ""} ${GLASS_ENTITY[entity]} ${href ? "g-press" : ""} ${className}`;
  const body = (
    <>
      {eyebrow && (
        <div className="g-cap">
          {icon && <span className="flex shrink-0 text-g-entity *:size-4">{icon}</span>}
          <span className="g-eyebrow">{eyebrow}</span>
        </div>
      )}
      {children}
    </>
  );
  return href ? (
    <Link href={href} title={title} className={classes}>
      {body}
    </Link>
  ) : (
    <div title={title} className={classes}>
      {body}
    </div>
  );
}
