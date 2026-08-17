import type { Restaurant } from "@/lib/menu-data";

const PARTICLES = [
  { left: "10%", w: 3, h: 3, bg: "var(--ember-1)", delay: "0s", dur: "13s", peak: 0.45 },
  { left: "25%", w: 2, h: 2, bg: "var(--ember-2)", delay: "3s", dur: "15s", peak: 0.35 },
  { left: "42%", w: 4, h: 4, bg: "var(--ember-1)", delay: "6s", dur: "11s", peak: 0.55 },
  { left: "58%", w: 2, h: 2, bg: "var(--ember-3)", delay: "1.5s", dur: "14s", peak: 0.3 },
  { left: "73%", w: 3, h: 3, bg: "var(--ember-2)", delay: "8s", dur: "12s", peak: 0.4 },
  { left: "88%", w: 2, h: 2, bg: "var(--ember-1)", delay: "4.5s", dur: "16s", peak: 0.35 },
  { left: "33%", w: 2, h: 2, bg: "var(--ember-3)", delay: "10s", dur: "13s", peak: 0.3 },
  { left: "65%", w: 3, h: 3, bg: "var(--ember-1)", delay: "7s", dur: "11s", peak: 0.5 },
  { left: "18%", w: 2, h: 2, bg: "var(--ember-2)", delay: "5s", dur: "14s", peak: 0.25 },
  { left: "80%", w: 3, h: 3, bg: "var(--ember-3)", delay: "2s", dur: "12s", peak: 0.4 },
];

function LogoHero({ restaurant }: { restaurant: Restaurant }) {
  return (
    <header className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 80% 50% at 50% 42%, color-mix(in srgb, var(--ember-1) 14%, transparent), transparent 70%)",
            "radial-gradient(ellipse 55% 40% at 25% 58%, color-mix(in srgb, var(--ember-3) 9%, transparent), transparent 65%)",
            "radial-gradient(ellipse 50% 35% at 78% 35%, color-mix(in srgb, var(--ember-2) 7%, transparent), transparent 60%)",
          ].join(", "),
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, var(--background) 100%)",
        }}
      />

      <div className="hero-gradient-drift absolute inset-0" />

      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="ember-particle"
          style={
            {
              left: p.left,
              width: p.w,
              height: p.h,
              backgroundColor: p.bg,
              animationDelay: p.delay,
              "--particle-duration": p.dur,
              "--particle-peak": p.peak,
            } as React.CSSProperties
          }
        />
      ))}

      <div className="hero-entrance relative z-10 mb-8 lg:mb-12">
        <div
          className="logo-breathe absolute -inset-10 rounded-full blur-3xl lg:-inset-16"
          style={{
            background:
              "radial-gradient(circle, var(--ember-1), var(--ember-2) 60%, transparent 80%)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres */}
        <img
          src={restaurant.logo}
          alt=""
          className="relative size-32 sm:size-40 lg:size-52 xl:size-60"
        />
      </div>

      <p
        className="hero-entrance ember-text relative z-10 text-[11px] font-semibold uppercase tracking-[0.35em] lg:text-xs lg:tracking-[0.4em]"
        style={{ animationDelay: "200ms" }}
      >
        {restaurant.tagline}
      </p>

      <h1
        className="hero-entrance relative z-10 mt-3 font-display text-6xl font-medium leading-none tracking-tight sm:text-7xl lg:mt-5 lg:text-8xl xl:text-9xl"
        style={{ animationDelay: "350ms" }}
      >
        {restaurant.name}
      </h1>

      <div
        className="hero-entrance ember-gradient relative z-10 mt-6 h-px w-20 opacity-50 lg:mt-8 lg:w-28"
        aria-hidden
        style={{ animationDelay: "500ms" }}
      />

      <div
        className="hero-entrance relative z-10 mt-6 flex flex-wrap justify-center gap-2 px-5 text-xs text-muted lg:mt-8 lg:gap-3 lg:text-sm"
        style={{ animationDelay: "650ms" }}
      >
        <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
          {restaurant.hours}
        </span>
        <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
          {restaurant.address}
        </span>
        <a
          href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
          className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur transition-colors hover:text-foreground"
        >
          {restaurant.phone}
        </a>
      </div>

      <div
        className="hero-entrance absolute bottom-8 z-10 flex flex-col items-center gap-2 text-faint lg:bottom-12"
        style={{ animationDelay: "1100ms" }}
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">
          Découvrir le menu
        </span>
        <svg
          className="scroll-bounce size-4 opacity-60"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>
    </header>
  );
}

export function Hero({ restaurant }: { restaurant: Restaurant }) {
  if (!restaurant.coverImage && restaurant.logo) {
    return <LogoHero restaurant={restaurant} />;
  }

  return (
    <header className="relative h-[46svh] min-h-80 w-full overflow-hidden lg:h-[52svh] lg:min-h-96">
      {restaurant.coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL saisie par l'utilisateur, hors remotePatterns de next/image
        <img
          src={restaurant.coverImage}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="ember-gradient absolute inset-0 opacity-25" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/55 to-background" />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-2xl px-5 pb-6 lg:max-w-5xl lg:px-10 lg:pb-10">
        {restaurant.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- actif local de marque, dimensions libres
          <img
            src={restaurant.logo}
            alt=""
            className="mb-3 size-14 lg:mb-4 lg:size-16"
          />
        )}
        <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em] lg:text-xs lg:tracking-[0.35em]">
          {restaurant.tagline}
        </p>
        <h1 className="mt-2 font-display text-5xl font-medium leading-none tracking-tight sm:text-6xl lg:text-7xl">
          {restaurant.name}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted lg:mt-6 lg:gap-3 lg:text-sm">
          <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
            {restaurant.hours}
          </span>
          <span className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur">
            {restaurant.address}
          </span>
          <a
            href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
            className="rounded-full border border-hairline bg-surface/70 px-3 py-1.5 backdrop-blur transition-colors hover:text-foreground"
          >
            {restaurant.phone}
          </a>
        </div>
      </div>
    </header>
  );
}
