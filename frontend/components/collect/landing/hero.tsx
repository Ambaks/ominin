import { hero, heroShowcase } from "@/lib/collect-landing-data";

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

/** Maquette produit : la commande relaie du téléphone au comptoir. */
function TicketRelay() {
  return (
    <div
      className="rise flex w-full flex-col"
      style={{ animationDelay: "320ms" }}
      aria-hidden
    >
      <div className="relative z-10 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-hairline bg-surface-raised p-4 shadow-lg shadow-ember-2/5">
        <span className="ember-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-background">
          <BagIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {heroShowcase.phoneChip.title}
          </p>
          <p className="text-xs text-faint">{heroShowcase.phoneChip.detail}</p>
        </div>
      </div>

      <div className="mx-auto flex flex-col items-center">
        <span className="ember-gradient h-5 w-px opacity-60" />
        <span className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-[11px] font-medium text-muted">
          {heroShowcase.relayLine}
        </span>
        <span className="ember-gradient h-5 w-px opacity-60" />
      </div>

      <div className="flex flex-col gap-2.5">
        {[heroShowcase.kitchenChip, heroShowcase.readyChip].map((chip, i) => (
          <div
            key={chip.title}
            className="rise flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-3.5"
            style={{ animationDelay: `${440 + i * 110}ms` }}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                i === 0 ? "bg-ember-2" : "bg-ember-1"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{chip.title}</p>
              <p className="truncate text-xs text-muted">{chip.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollectHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="collect-dash-motif absolute inset-0 [mask-image:radial-gradient(ellipse_75%_85%_at_50%_15%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-2xl gap-12 px-5 pb-16 pt-16 lg:max-w-5xl lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:gap-16 lg:px-10 lg:pb-24 lg:pt-28">
        <div className="flex flex-col items-center gap-8 text-center lg:items-start lg:text-left">
          <p
            className="rise text-[11px] font-semibold uppercase tracking-[0.28em] text-muted lg:text-xs lg:tracking-[0.35em]"
            style={{ animationDelay: "0ms" }}
          >
            {hero.eyebrow}
          </p>

          <h1
            className="rise font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            {hero.titleStart}{" "}
            <span className="ember-text">{hero.titleAccent}</span>
          </h1>

          <p
            className="rise max-w-xl text-sm leading-relaxed text-muted lg:text-base"
            style={{ animationDelay: "160ms" }}
          >
            {hero.subtitle}
          </p>

          <div
            className="rise flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href={hero.primaryCta.href}
              className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base"
            >
              {hero.primaryCta.label}
            </a>
            <a
              href={hero.secondaryCta.href}
              className="rounded-full border border-hairline bg-background/50 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition-colors hover:border-ember-2/40 lg:px-8 lg:py-3.5 lg:text-base"
            >
              {hero.secondaryCta.label}
            </a>
          </div>

          <div
            className="rise flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-faint lg:justify-start"
            style={{ animationDelay: "320ms" }}
          >
            {hero.trustline.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <TicketRelay />
      </div>
    </section>
  );
}
