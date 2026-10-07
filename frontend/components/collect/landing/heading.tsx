import type { ReactNode } from "react";
import { Reveal } from "./reveal";

/** Titre de section : sur-titre braise, titre Geist serré, chapeau. */
export function CollectHeading({
  eyebrow,
  title,
  subtitle,
  center,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1 ${center ? "justify-center" : ""}`}>
        <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
        {eyebrow}
      </p>
      <h2 className="collect-display mt-4 text-balance text-4xl sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-pretty text-base leading-relaxed text-muted lg:text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
