import Image from "next/image";
import Link from "next/link";
import { demoSection, demoCta } from "@/lib/landing-data";
import { QrCorners } from "./qr-corners";
import { SectionHeading } from "./section-heading";

export function DemoShowcase() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={demoSection.eyebrow}
          title={demoSection.title}
          subtitle={demoSection.subtitle}
          center
        />

        {/* Desktop : le téléphone posé en scène, à la table 12 */}
        <div className="relative mt-12 hidden overflow-hidden rounded-3xl border border-hairline lg:mt-16 lg:block">
          <Image
            src={demoSection.photo.src}
            alt={demoSection.photo.alt}
            fill
            sizes="(min-width: 1024px) 56rem, 100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-linear-to-b from-background/80 via-background/40 to-background/85"
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-6 px-10 py-14">
            <span className="rounded-full border border-hairline bg-background/60 px-4 py-1.5 font-display text-sm font-semibold backdrop-blur-sm">
              {demoSection.tableTag}
            </span>

            <div className="relative p-4">
              <QrCorners />
              <div className="w-80 overflow-hidden rounded-[2.5rem] border-2 border-surface-raised bg-surface-raised p-3 shadow-2xl shadow-black/50">
                <div className="overflow-hidden rounded-4xl bg-background">
                  <iframe
                    src={demoCta.href}
                    title={demoSection.iframeTitle}
                    loading="lazy"
                    className="h-170 w-full"
                  />
                </div>
              </div>
            </div>

            <p className="max-w-md text-center text-sm text-muted">
              {demoSection.sceneCaption}
            </p>
          </div>
        </div>

        {/* Mobile : carte tappable vers la démo plein écran */}
        <Link
          href={demoCta.href}
          className="relative mt-10 flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-hairline p-8 text-center transition-colors hover:border-ember-2/40 lg:hidden"
        >
          <Image
            src={demoSection.photo.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-linear-to-b from-background/85 to-background/70"
            aria-hidden
          />
          <span className="relative rounded-full border border-hairline bg-background/60 px-4 py-1.5 font-display text-sm font-semibold backdrop-blur-sm">
            {demoSection.tableTag}
          </span>
          <span className="relative text-sm font-semibold text-foreground">
            {demoSection.fullscreenLabel}
          </span>
          <span className="relative text-xs text-muted">
            {demoSection.mobileHint}
          </span>
        </Link>

        <p className="mt-6 hidden text-center lg:block">
          <Link
            href={demoCta.href}
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {demoSection.fullscreenLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}
