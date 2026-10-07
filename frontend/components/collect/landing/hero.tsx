import { demoShowcaseOrder } from "@/lib/collect/demo/data";
import { hero, heroRelay, signupCta } from "@/lib/collect-landing-data";
import { formatPrice } from "@/lib/menu-data";

const order = demoShowcaseOrder();

/*
 * Hero : titre en trois lignes qui montent, pavé braise sur « Payé », la
 * rangée des chiffres de l'offre, et à droite le relais animé — la commande
 * de Camille tombe dans le panier, se paie, sort en ticket, passe prête.
 */

function Relay() {
  return (
    <div className="kit-relay relative mx-auto w-full min-w-0 max-w-md pb-8 sm:pb-12 lg:max-w-none" aria-hidden>
      {/* Téléphone du client */}
      <div
        className="relay-float relative z-10 w-[86%] rounded-[2rem] sm:w-[62%] border border-hairline bg-surface p-4 shadow-2xl shadow-black/40"
        style={{ "--float-tilt": "-1.5deg" } as React.CSSProperties}
      >
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-faint">
          <span>{heroRelay.phoneLabel}</span>
          <span className="size-1.5 rounded-full bg-ember-1" />
        </div>
        <p className="kit-display mt-3 text-2xl">{order.restaurant}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {order.lines.map((line, i) => (
            <li
              key={line.name}
              className="relay-line flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-background/60 px-3 py-2.5"
              style={{ "--line-delay": `${i * 0.35}s` } as React.CSSProperties}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{line.name}</span>
                <span className="block truncate text-xs text-faint">{line.description}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatPrice(line.price)}</span>
            </li>
          ))}
        </ul>
        <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-background/60 px-3 py-3">
          <span className="text-sm text-muted">Total</span>
          <span className="kit-display text-2xl tabular-nums">{formatPrice(order.total)}</span>
          <span className="relay-stamp absolute -top-4 left-1/3 rounded-lg border-2 border-ember-2 px-2.5 py-0.5 text-sm font-black uppercase tracking-widest text-ember-2">
            {heroRelay.stamp}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-hairline">
          <div className="relay-progress ember-gradient h-full rounded-full" />
        </div>
      </div>

      {/* Imprimante cuisine : le reçu sort de la fente et reste posé. Objet
          physique, mêmes couleurs dans les deux thèmes. */}
      <div
        className="relay-float relative z-20 -mt-6 ml-auto w-[66%] sm:absolute sm:right-0 sm:top-[22%] sm:mt-0 sm:w-[40%]"
        style={{ "--float-tilt": "2deg" } as React.CSSProperties}
      >
        <div className="rounded-xl bg-[#1c1712] px-3 pb-2.5 pt-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#fbf6ee]/60 shadow-2xl">
          {heroRelay.kitchenLabel}
          <div className="mt-1.5 h-1 rounded-full bg-black" />
        </div>
        <div className="relay-ticket mx-2 rounded-b-lg border border-t-0 border-black/10 bg-white px-3.5 pb-4 pt-3 font-mono text-[#1c1712] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)]">
          <p className="text-[9px] uppercase tracking-[0.2em] opacity-60">{heroRelay.ticket.printer}</p>
          <p className="mt-1 text-[11px] font-bold uppercase">{heroRelay.ticket.label}</p>
          <p className="kit-display mt-0.5 text-3xl">{heroRelay.ticket.customer}</p>
          <p className="mt-0.5 text-sm font-bold">{heroRelay.ticket.pickup}</p>
          <div className="mt-2 border-t border-dashed border-[#1c1712]/30 pt-2 text-[11px] leading-relaxed">
            {order.lines.map((line) => (
              <p key={line.id} className="truncate">1 × {line.name}</p>
            ))}
          </div>
        </div>
      </div>

      {/* « Prête » côté client */}
      <div className="relay-ready absolute -bottom-5 left-2 z-30 sm:-bottom-8 sm:left-4 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-bold text-background shadow-xl sm:-left-6">
        <span className="ember-gradient flex size-5 items-center justify-center rounded-full text-[11px] text-background">✓</span>
        {heroRelay.ready}
      </div>
    </div>
  );
}

export function CollectHero() {
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
                {line.mark ? <span className="kit-mark">{line.text}</span> : line.text}
                {line.after}
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
                <dd className="kit-display ember-text text-3xl sm:text-4xl">{stat.value}</dd>
                <dd className="mt-1.5 text-xs leading-snug text-muted sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>

          <div
            className="kit-rise mt-7 flex flex-wrap gap-3"
            style={{ "--rise-delay": "800ms" } as React.CSSProperties}
          >
            <a
              href={signupCta.href}
              className="ember-gradient rounded-full px-7 py-3.5 text-sm font-bold text-background shadow-[0_12px_40px_-12px_var(--ember-2)] transition-transform hover:scale-[1.03] lg:text-base"
            >
              {signupCta.label} — 0 € par mois
            </a>
            <a
              href={hero.primaryCta.href}
              className="group flex items-center gap-2 rounded-full border border-hairline px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ember-2/50 lg:text-base"
            >
              {hero.primaryCta.label}
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>

        <Relay />
      </div>
    </section>
  );
}
