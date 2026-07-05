import Link from "next/link";
import {
  hero,
  demoCta,
  clientsSection,
} from "@/lib/landing-data";

export function Hero() {
  return (
    <section className="ember-glow relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-5 pb-16 pt-20 text-center lg:max-w-5xl lg:px-10 lg:pb-24 lg:pt-32">
        <p
          className="rise text-[11px] font-semibold uppercase tracking-[0.28em] text-muted lg:text-xs lg:tracking-[0.35em]"
          style={{ animationDelay: "0ms" }}
        >
          {hero.eyebrow}
        </p>

        <h1
          className="rise max-w-3xl font-display text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
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
          <Link
            href={demoCta.href}
            className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base"
          >
            {demoCta.label}
          </Link>
          <a
            href={hero.secondaryCta.href}
            className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-ember-2/40 lg:px-8 lg:py-3.5 lg:text-base"
          >
            {hero.secondaryCta.label}
          </a>
        </div>

        <div
          className="rise flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-faint"
          style={{ animationDelay: "320ms" }}
        >
          {hero.trustline.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div
          className="rise flex flex-col items-center gap-3 pt-4"
          style={{ animationDelay: "400ms" }}
        >
          <p className="text-xs font-medium text-faint">{hero.clientsLabel}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {clientsSection.clients.map((client) => (
              <span
                key={client.name}
                className="rounded-full border border-hairline px-3 py-1.5 text-xs text-muted"
              >
                {client.name} · {client.city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
