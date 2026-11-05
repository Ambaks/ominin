import Link from "next/link";
import { demoSection, demoCta } from "@/lib/landing-data";
import { IphoneFrame } from "./iphone-frame";
import { QrCorners } from "./qr-corners";
import { KitHeading } from "@/components/landing-kit/heading";

export function DemoShowcase() {
  return (
    <section id="demo" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-24">
        <KitHeading
          eyebrow={demoSection.eyebrow}
          title={demoSection.title}
          subtitle={demoSection.subtitle}
          center
        />

        {/* Desktop : le téléphone posé en scène, à la table 12 */}
        <div className="g-glass g-glass-hero mt-12 hidden overflow-hidden lg:mt-16 lg:block">
          <div className="kit-grid absolute inset-0" aria-hidden />

          <div className="relative flex flex-col items-center gap-6 px-10 py-14">
            <span className="g-glass g-glass-pill px-4 py-1.5 kit-display text-sm font-semibold">
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
                {/* La carte continue sous le bord : un fondu plutôt qu'une coupe nette. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background to-transparent"
                />
              </IphoneFrame>
            </div>

            <p className="max-w-md text-center text-sm text-muted">
              {demoSection.sceneCaption} {demoSection.scrollHint}
            </p>
          </div>
        </div>

        {/* Mobile : la vraie carte, dans un téléphone, puis la démo plein écran. */}
        <div className="mt-10 flex flex-col items-center gap-5 text-center lg:hidden">
          <div className="g-glass kit-phone w-full max-w-[18rem] p-g-pad">
            <div className="g-plate relative overflow-hidden">
              <iframe
                src={`${demoCta.href}?embed=1`}
                title={demoSection.iframeTitle}
                loading="lazy"
                className="h-[30rem] w-full"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-background to-transparent"
              />
            </div>
          </div>
          <Link
            href={demoCta.href}
            className="g-btn g-btn-primary g-press"
          >
            {demoSection.fullscreenLabel}
          </Link>
          <span className="text-xs text-muted">{demoSection.mobileHint}</span>
        </div>

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
