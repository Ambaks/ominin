import Link from "next/link";
import { hero, heroLog, signupCta } from "@/lib/agents-landing-data";

/*
 * Maquette du produit : le journal de bord d'une matinée de l'agent —
 * recherche, adresse trouvée, brouillon en attente de validation, envoi,
 * réponse. Le seul geste demandé au client (valider) y est mis en relief.
 */
function AgentLog() {
  return (
    <div
      className="rise w-full rounded-3xl border border-hairline bg-surface/90 p-5 shadow-lg shadow-ember-2/5 backdrop-blur-sm"
      style={{ animationDelay: "320ms" }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-faint">
          {heroLog.title}
        </p>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember-1 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-ember-1" />
          </span>
          {heroLog.day}
        </span>
      </div>

      <ol className="relative mt-4 flex flex-col gap-3 before:absolute before:bottom-3 before:left-[3.475rem] before:top-3 before:w-px before:bg-hairline">
        {heroLog.entries.map((entry, i) => (
          <li
            key={entry.time}
            className="rise relative grid grid-cols-[2.6rem_1rem_1fr] items-start gap-x-1.5"
            style={{ animationDelay: `${420 + i * 110}ms` }}
          >
            <span className="pt-0.5 font-mono text-[11px] tabular-nums text-faint">
              {entry.time}
            </span>
            <span
              className={`relative z-10 mt-1.5 size-2 justify-self-center rounded-full ring-4 ring-surface ${
                entry.pending || entry.hot ? "ember-gradient" : "bg-faint"
              }`}
            />
            <div
              className={
                entry.pending
                  ? "rounded-xl border border-ember-2/40 bg-ember-2/5 p-3"
                  : "pb-0.5"
              }
            >
              <p className="text-sm font-medium leading-snug">{entry.text}</p>
              <p className={`mt-0.5 text-xs ${entry.hot ? "ember-text font-semibold" : "text-muted"}`}>
                {entry.detail}
              </p>
              {entry.pending && (
                <div className="mt-2.5 flex gap-2">
                  <span className="rounded-full border border-hairline px-3 py-1 text-[11px] font-medium text-muted">
                    Rejeter
                  </span>
                  <span className="ember-gradient rounded-full px-3 py-1 text-[11px] font-semibold text-background">
                    Approuver
                  </span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AgentsHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="agents-radar-motif absolute inset-0 [mask-image:radial-gradient(ellipse_75%_85%_at_50%_10%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-2xl gap-12 px-5 pb-16 pt-16 lg:max-w-5xl lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-14 lg:px-10 lg:pb-24 lg:pt-28">
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
            {hero.titleStart} <span className="ember-text">{hero.titleAccent}</span>
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
              href={signupCta.href}
              className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base"
            >
              {signupCta.label}
            </Link>
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

        <AgentLog />
      </div>
    </section>
  );
}
