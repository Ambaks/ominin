import { Reveal } from "./reveal";

interface Link {
  label: string;
  href: string;
}

/** Bloc d'appel final, pleine largeur sur le dégradé braise. */
export function KitFinalCta({
  id,
  title,
  subtitle,
  primary,
  secondary,
  microcopy,
}: {
  id: string;
  title: string;
  subtitle: string;
  primary: Link;
  secondary: Link;
  microcopy: readonly string[];
}) {
  return (
    <section id={id} className="scroll-mt-20 px-4 pb-24 sm:px-6 lg:px-10">
      <Reveal className="ember-gradient relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.5rem] px-6 py-20 text-center text-background lg:py-28">
        <div className="kit-grid absolute inset-0 opacity-30" aria-hidden />
        <h2 className="kit-display relative mx-auto max-w-4xl text-balance text-5xl sm:text-6xl lg:text-7xl">
          {title}
        </h2>
        <p className="relative mx-auto mt-6 max-w-xl text-pretty text-base font-semibold leading-relaxed lg:text-lg">
          {subtitle}
        </p>
        <div className="relative mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={primary.href}
            className="rounded-full bg-background px-8 py-4 text-sm font-bold text-foreground transition-transform hover:scale-[1.03] lg:text-base"
          >
            {primary.label}
          </a>
          <a
            href={secondary.href}
            className="rounded-full bg-[#1c1712] px-8 py-4 text-sm font-bold text-[#fbf6ee] transition-transform hover:scale-[1.03] lg:text-base"
          >
            {secondary.label}
          </a>
        </div>
        <div className="relative mt-8 flex flex-wrap justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em]">
          {microcopy.map((line) => (
            <span key={line} className="rounded-full bg-[#1c1712]/85 px-3.5 py-1.5 text-[#fbf6ee]">
              {line}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
