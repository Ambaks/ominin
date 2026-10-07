import Image from "next/image";
import Link from "next/link";
import { demoSection, demoCta } from "@/lib/landing-data";
import { IphoneFrame } from "./iphone-frame";
import { QrCorners } from "./qr-corners";
import { KitHeading } from "@/components/landing-kit/heading";

export function DemoShowcase() {
  return (
    <section id="demo" className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <KitHeading
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
            <span className="rounded-full border border-hairline bg-background/60 px-4 py-1.5 kit-display text-sm font-semibold backdrop-blur-sm">
              {demoSection.tableTag}
            </span>

            <div className="relative p-4">
              <QrCorners />
              <IphoneFrame>
                <iframe
                  src={`${demoCta.href}?embed=1`}
                  title={demoSection.iframeTitle}
                  loading="lazy"
                  className="h-204 w-full"
                />
              </IphoneFrame>
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
          <span className="relative rounded-full border border-hairline bg-background/60 px-4 py-1.5 kit-display text-sm font-semibold backdrop-blur-sm">
            {demoSection.tableTag}
          </span>
          <span className="ember-gradient relative rounded-full px-6 py-3 text-sm font-bold text-background">
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
