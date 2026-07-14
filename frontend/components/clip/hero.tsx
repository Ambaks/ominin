import Link from "next/link";
import { hero, heroShowcase, signupCta } from "@/lib/clip-landing-data";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <path d="M8 5.5v13l11-6.5z" />
    </svg>
  );
}

/** Maquette du produit : un clip déposé, l'agent rédige, quatre posts partent. */
function ClipFlow() {
  return (
    <div
      className="rise flex w-full flex-col"
      style={{ animationDelay: "320ms" }}
      aria-hidden
    >
      <div className="relative z-10 mx-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-hairline bg-surface-raised p-4 shadow-lg shadow-ember-2/5">
        <span className="ember-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-background">
          <PlayIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {heroShowcase.clip.file}
          </p>
          <p className="text-xs text-faint">
            {heroShowcase.clip.label} · {heroShowcase.clip.duration}
          </p>
        </div>
      </div>

      <div className="mx-auto flex flex-col items-center">
        <span className="ember-gradient h-5 w-px opacity-60" />
        <span className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-[11px] font-medium text-muted">
          {heroShowcase.agentLine}
        </span>
        <span className="ember-gradient h-5 w-px opacity-60" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {heroShowcase.posts.map((post, i) => (
          <div
            key={post.platform}
            className="rise flex flex-col gap-1.5 rounded-2xl border border-hairline bg-surface p-3.5"
            style={{ animationDelay: `${420 + i * 90}ms` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold">{post.platform}</span>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-faint">
                <span
                  className={`size-1.5 rounded-full ${
                    post.live ? "bg-ember-1" : "bg-faint"
                  }`}
                />
                {post.status}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted">{post.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClipHero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="clip-timeline-motif absolute inset-0 [mask-image:radial-gradient(ellipse_75%_85%_at_50%_15%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />

      <div className="relative mx-auto grid w-full max-w-2xl gap-12 px-5 pb-16 pt-16 lg:max-w-5xl lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-center lg:gap-16 lg:px-10 lg:pb-24 lg:pt-28">
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

        <ClipFlow />
      </div>
    </section>
  );
}
