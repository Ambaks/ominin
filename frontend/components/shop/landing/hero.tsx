import Image from "next/image";
import { hero, heroRelay } from "@/lib/shop-landing-data";

/*
 * Hero : titre en trois lignes qui montent, pavé braise sur « seules. », la
 * rangée des chiffres, et à droite le relais animé du kit — la commande de
 * Léa tombe dans le panier MyBox, se paie, le bon de préparation sort dans
 * votre espace, le colis part.
 */

function Relay() {
  return (
    <div className="kit-relay relative mx-auto w-full min-w-0 max-w-md pb-8 sm:pb-12 lg:max-w-none" aria-hidden>
      <div
        className="relay-float relative z-10 w-[86%] rounded-[2rem] border border-hairline bg-surface p-4 shadow-2xl shadow-black/40 sm:w-[62%]"
        style={{ "--float-tilt": "-1.5deg" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span>{heroRelay.phoneLabel}</span>
          <span className="size-1.5 rounded-full bg-ember-1" />
        </div>
        <p className="kit-display mt-3 text-2xl">{heroRelay.shop}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {heroRelay.lines.map((line, i) => (
            <li
              key={line.name}
              className="relay-line flex items-center gap-3 rounded-2xl border border-hairline bg-background/60 p-2 pr-3"
              style={{ "--line-delay": `${i * 0.35}s` } as React.CSSProperties}
            >
              <Image src={line.image} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-snug">{line.name}</span>
                <span className="block truncate text-xs text-faint">{line.detail}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{line.price}</span>
            </li>
          ))}
        </ul>
        <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-background/60 px-3 py-3">
          <span className="text-sm text-muted">{heroRelay.totalLabel}</span>
          <span className="kit-display text-2xl tabular-nums">{heroRelay.total}</span>
          <span className="relay-stamp absolute -top-4 left-1/3 rounded-lg border-2 border-ember-2 px-2.5 py-0.5 text-sm font-black uppercase tracking-widest text-ember-2">
            {heroRelay.stamp}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
          <div className="relay-progress ember-gradient h-full rounded-full" />
        </div>
      </div>

      {/* Le bon de préparation sort de l'imprimante : objet physique, mêmes
          couleurs dans les deux thèmes. */}
      <div
        className="relay-float relative z-20 mt-3 ml-auto w-[70%] sm:absolute sm:right-0 sm:top-[20%] sm:mt-0 sm:w-[44%]"
        style={{ "--float-tilt": "2deg" } as React.CSSProperties}
      >
        <div className="relay-printer">
          <div className="rounded-xl bg-[#1c1712] px-3 pb-2.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fbf6ee]/60 shadow-2xl">
            {heroRelay.deskLabel}
            <div className="mt-1.5 h-1 rounded-full bg-black" />
          </div>
          <div className="relay-ticket mx-2 rounded-b-lg border border-t-0 border-black/10 bg-white px-3.5 pb-4 pt-3 font-mono text-[#1c1712] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">{heroRelay.slip.title}</p>
            <p className="kit-display mt-1 text-3xl">{heroRelay.slip.customer}</p>
            <p className="mt-0.5 text-xs font-bold">{heroRelay.slip.shipping}</p>
            <div className="mt-2 border-t border-dashed border-[#1c1712]/30 pt-2 text-[11px] leading-relaxed">
              {heroRelay.slip.lines.map((line) => (
                <p key={line} className="truncate">{line}</p>
              ))}
              <p className="mt-1.5 italic opacity-75">{heroRelay.slip.gift}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relay-ready absolute -bottom-5 left-2 z-30 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background shadow-xl sm:-bottom-8 sm:left-4">
        <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] text-background">✓</span>
        {heroRelay.shipped}
      </div>
    </div>
  );
}

export function ShopHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="kit-grid absolute inset-0" aria-hidden />
      <div className="kit-aura absolute inset-0 opacity-50 lg:opacity-100" aria-hidden />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-4 pt-8 sm:px-6 sm:pb-12 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:px-10 lg:pb-24 lg:pt-14">
        <div className="min-w-0">
          <p className="kit-rise flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
            <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
            {hero.eyebrow}
          </p>
          <h1 className="kit-display mt-6 text-[clamp(2.6rem,11.5vw,5rem)] lg:text-[clamp(3.6rem,6.3vw,6.2rem)]">
            {hero.lines.map((line, i) => (
              <span
                key={line.text}
                className="kit-rise block sm:whitespace-nowrap"
                style={{ "--rise-delay": `${120 + i * 140}ms` } as React.CSSProperties}
              >
                {"mark" in line ? <span className="kit-mark">{line.text}</span> : line.text}
              </span>
            ))}
          </h1>
          <p
            className="kit-rise mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted lg:text-lg"
            style={{ "--rise-delay": "560ms" } as React.CSSProperties}
          >
            {hero.subtitle}
          </p>

          <dl
            className="kit-rise mt-7 grid grid-cols-3 gap-4 border-t border-hairline pt-6"
            style={{ "--rise-delay": "680ms" } as React.CSSProperties}
          >
            {hero.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="kit-display ember-text whitespace-nowrap text-[clamp(1.5rem,7.6vw,1.875rem)] sm:text-4xl">{stat.value}</dd>
                <dd className="mt-1.5 text-xs leading-snug text-muted sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>

          <div
            className="kit-rise mt-7 flex flex-wrap gap-3"
            style={{ "--rise-delay": "800ms" } as React.CSSProperties}
          >
            <a
              href={hero.primaryCta.href}
              className="ember-gradient rounded-full px-7 py-3.5 text-sm font-bold text-background shadow-[0_12px_40px_-12px_var(--ember-2)] transition-transform hover:scale-[1.03] lg:text-base"
            >
              {hero.primaryCta.label}
            </a>
            <a
              href={hero.secondaryCta.href}
              className="group flex items-center gap-2 rounded-full border border-hairline px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ember-2/50 lg:text-base"
            >
              {hero.secondaryCta.label}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>

          <p
            className="kit-rise mt-6 flex flex-wrap gap-x-4 gap-y-1 pb-2 text-xs text-muted"
            style={{ "--rise-delay": "920ms" } as React.CSSProperties}
          >
            {hero.trustline.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <span className="text-ember-1" aria-hidden>✓</span>
                {item}
              </span>
            ))}
          </p>
        </div>

        <Relay />
      </div>
    </section>
  );
}
