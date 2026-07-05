export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  id,
  center,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  id?: string;
  center?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 ${center ? "items-center text-center" : ""}`}>
      <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl"
      >
        {title}
      </h2>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-muted lg:text-[15px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
