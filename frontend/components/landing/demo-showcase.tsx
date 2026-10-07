import Link from "next/link";
import { demoSection, demoCta } from "@/lib/landing-data";
import { IphoneFrame } from "./iphone-frame";
import { QrCorners } from "./qr-corners";
import { KitHeading } from "@/components/landing-kit/heading";

export function DemoShowcase() {
  return (
    <section id="demo" className="scroll-mt-20 border-y border-hairline bg-surface/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-24">
        <KitHeading
          eyebrow={demoSection.eyebrow}
          title={demoSection.title}
          subtitle={demoSection.subtitle}
          center
        />

        {/* Desktop : le téléphone posé en scène, à la table 12 */}
        <div className="relative mt-12 hidden overflow-hidden rounded-3xl border border-hairline lg:mt-16 lg:block">
          <div className="kit-grid absolute inset-0" aria-hidden />
          <div className="kit-aura absolute inset-0" aria-hidden />

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
          <div className="w-full max-w-[18rem] rounded-[2.4rem] border border-ember-2/25 bg-surface p-2.5 shadow-[0_30px_80px_-30px_var(--ember-2)] ring-1 ring-foreground/10">
            <div className="relative overflow-hidden rounded-[1.9rem] bg-background">
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
            className="ember-gradient rounded-full px-6 py-3 text-sm font-bold text-background"
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
