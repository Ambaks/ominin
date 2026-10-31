import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "icon";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: Variant;
  /** Lien habillé en bouton. */
  href?: string;
  /** Compteur sur un bouton icône (non-lus). */
  badge?: number;
} & ({ variant: "icon"; "aria-label": string } | { variant?: "primary" | "secondary" });

export function GlassButton({
  variant = "secondary",
  href,
  badge,
  className = "",
  children,
  ...props
}: Props) {
  const classes = `g-btn g-btn-${variant} g-press ${className}`;
  const content = (
    <>
      {children}
      {badge != null && badge > 0 && (
        <span className="g-badge" aria-label={`${badge} non lu${badge > 1 ? "s" : ""}`}>
          {badge}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} title={props.title} aria-label={props["aria-label"]} className={classes}>
      {content}
    </Link>
  ) : (
    <button type="button" {...props} className={classes}>
      {content}
    </button>
  );
}
