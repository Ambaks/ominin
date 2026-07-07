import Image from "next/image";
import Link from "next/link";
import { hero, demoCta, clientsSection } from "@/lib/landing-data";
import { QrCorners } from "./qr-corners";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Image
        src={hero.photo.src}
        alt={hero.photo.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      {/* Scrims : lisibilité du texte, puis fondu vers la section suivante */}
      <div
        className="absolute inset-0 bg-linear-to-b from-background/80 via-background/45 to-background"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-background/75 via-background/35 to-transparent"
        aria-hidden
      />
      <div className="ember-glow absolute inset-0" aria-hidden />

      <div className="relative mx-auto w-full max-w-2xl px-5 pb-16 pt-24 lg:max-w-5xl lg:px-10 lg:pb-24 lg:pt-36">
        <div className="relative flex max-w-2xl flex-col items-center gap-8 px-4 py-8 text-center sm:px-8 lg:items-start lg:text-left">
          <QrCorners />

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
              href={demoCta.href}
              className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base"
            >
              {demoCta.label}
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

          <div
            className="rise flex flex-col items-center gap-3 pt-2 lg:items-start"
            style={{ animationDelay: "400ms" }}
          >
            <p className="text-xs font-medium text-faint">{hero.clientsLabel}</p>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {clientsSection.clients.map((client) => (
                <span
                  key={client.name}
                  className="rounded-full border border-hairline bg-background/50 px-3 py-1.5 text-xs text-muted backdrop-blur-sm"
                >
                  {client.name} · {client.city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
