import { Reveal } from "@/components/landing-kit/reveal";
import { finalCta } from "@/lib/menu-landing-data";

/*
 * L'appel final, sur le kit de gestion (DESIGN.md) : un cadre de verre héros,
 * une plaque, la braise en lumière (un halo), jamais en aplat. À gauche le
 * message et les deux commandes, à droite l'addition, les conditions lues
 * d'un coup d'œil au moment de se décider, et l'adresse pour une question.
 */
export function MenuFinalCta() {
  const { bill, contact } = finalCta;
  return (
    <section id={finalCta.id} className="scroll-mt-20 px-4 pb-24 sm:px-6 lg:px-10">
      <Reveal className="g-glass g-glass-hero mx-auto w-full max-w-6xl p-g-pad">
        <div className="g-plate relative grid items-center gap-10 overflow-hidden p-6 sm:p-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:p-14">
          <div className="menu-cta-bloom pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-ember-1">
              <span aria-hidden className="ember-gradient size-1.5 rounded-full" />
              {finalCta.eyebrow}
            </p>
            <h2 className="kit-display mt-4 text-balance text-[clamp(1.75rem,8.2vw,2.25rem)] sm:text-5xl lg:text-[3.4rem]">{finalCta.title}</h2>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted lg:text-lg">{finalCta.subtitle}</p>
            <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
              <a href={finalCta.primary.href} className="g-btn g-btn-primary g-press group">
                {finalCta.primary.label}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </a>
              <a href={finalCta.secondary.href} className="g-btn g-btn-secondary g-press">
                {finalCta.secondary.label}
              </a>
            </div>
          </div>

          <div className="relative rounded-g-card border border-hairline bg-surface-raised/50 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{bill.title}</p>
            <dl className="mt-4 flex flex-col">
              {bill.rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 border-t border-hairline py-3 first:border-t-0 first:pt-0">
                  <dt className="text-sm text-muted">{row.label}</dt>
                  <dd className={`text-right text-sm font-semibold tabular-nums ${"ours" in row ? "text-ember-1" : ""}`}>{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-faint">{bill.note}</p>
            <p className="mt-5 border-t border-hairline pt-4 text-sm text-muted">
              {contact.label}{" "}
              <a href={`mailto:${contact.email}`} className="font-semibold text-foreground underline decoration-hairline underline-offset-4 transition-colors hover:decoration-ember-1">
                {contact.email}
              </a>
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
