import type { ReactNode } from "react";

export function SectionHeading({
  title,
  sub,
  right,
  id,
  level = 2,
}: {
  title: string;
  sub?: string;
  /** Contrôle ou légende, à droite du titre. */
  right?: ReactNode;
  id?: string;
  /** 1 : titre de page (36 px) ; 2 : section (20 px). */
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <Heading id={id} className={`font-display ${level === 1 ? "text-g-h1" : "text-g-h2"}`}>
          {title}
        </Heading>
        {sub && (
          <p className={`text-muted ${level === 1 ? "mt-1.5 text-g-body" : "mt-1 text-g-meta"}`}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}
