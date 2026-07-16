"use client";

import Link from "next/link";
import { useState } from "react";
import { BrowserFrame } from "@/components/landing/browser-frame";
import { IphoneFrame } from "@/components/landing/iphone-frame";
import { SectionHeading } from "@/components/landing/section-heading";
import { demoSection } from "@/lib/clip-landing-data";

/*
 * Vitrine de la démo : l'espace clipper vivant dans un navigateur macOS et
 * un iPhone, en iframes sur /demo (les vraies pages, données fictives).
 * Chaque iframe est rendue à taille réelle — 1280 px pour obtenir le layout
 * sidebar du shell, 384 px pour la barre d'onglets mobile — puis réduite par
 * transform pour tenir en scène. Les iframes sont inertes tant que le
 * visiteur n'a pas cliqué : le scroll de la landing n'est jamais capturé.
 */

const DESKTOP_VIEWPORT = { width: 1280, height: 800 };
/** Barre du navigateur (h-10) + bordures du cadre. */
const BROWSER_CHROME_HEIGHT = 42;
const DESKTOP_SCALE = 0.66;

/** Largeur du cadre IphoneFrame (w-96) et hauteur totale châssis compris. */
const PHONE_SIZE = { width: 384, height: 834 };
const PHONE_SCALE = 0.62;

/** Boîte de layout aux dimensions réduites, contenu rendu à l'échelle. */
function ScaledBlock({
  scale,
  width,
  height,
  children,
}: {
  scale: number;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative"
      style={{ width: width * scale, height: height * scale }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `scale(${scale})`, width }}
      >
        {children}
      </div>
    </div>
  );
}

function FrameStage({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <div className="relative">
      <div className={active ? "" : "pointer-events-none"}>{children}</div>
      {!active && (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="absolute inset-0 z-10 flex items-end justify-center rounded-3xl pb-8"
        >
          <span className="rounded-full border border-hairline bg-background/70 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm">
            {demoSection.overlayLabel}
          </span>
        </button>
      )}
    </div>
  );
}

export function ClipDemoShowcase() {
  return (
    <section
      id={demoSection.id}
      className="scroll-mt-20 border-t border-hairline"
    >
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <SectionHeading
          eyebrow={demoSection.eyebrow}
          title={demoSection.title}
          subtitle={demoSection.subtitle}
          center
        />

        {/* Desktop : navigateur + iPhone posés en scène */}
        <div className="mt-12 hidden lg:mt-16 lg:block">
          <FrameStage>
            <div className="relative overflow-hidden rounded-3xl border border-hairline">
              <div
                className="clip-timeline-motif absolute inset-0 [mask-image:radial-gradient(ellipse_80%_90%_at_50%_0%,black,transparent)]"
                aria-hidden
              />
              <div className="ember-glow absolute inset-0" aria-hidden />

              <div className="relative px-8 py-12">
                <ScaledBlock
                  scale={DESKTOP_SCALE}
                  width={DESKTOP_VIEWPORT.width}
                  height={DESKTOP_VIEWPORT.height + BROWSER_CHROME_HEIGHT}
                >
                  <BrowserFrame url={demoSection.urlLabel}>
                    <iframe
                      src={demoSection.href}
                      title={demoSection.desktopIframeTitle}
                      loading="lazy"
                      className="block"
                      style={{
                        width: DESKTOP_VIEWPORT.width,
                        height: DESKTOP_VIEWPORT.height,
                      }}
                    />
                  </BrowserFrame>
                </ScaledBlock>

                <div className="absolute bottom-12 right-8">
                  <ScaledBlock
                    scale={PHONE_SCALE}
                    width={PHONE_SIZE.width}
                    height={PHONE_SIZE.height}
                  >
                    <IphoneFrame>
                      <iframe
                        src={demoSection.href}
                        title={demoSection.phoneIframeTitle}
                        loading="lazy"
                        className="h-204 w-full"
                      />
                    </IphoneFrame>
                  </ScaledBlock>
                </div>
              </div>
            </div>
          </FrameStage>

          <p className="mt-6 text-center">
            <Link
              href={demoSection.href}
              className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {demoSection.fullscreenLabel}
            </Link>
          </p>
        </div>

        {/* Mobile : carte tappable vers la démo plein écran */}
        <Link
          href={demoSection.href}
          className="relative mt-10 flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-hairline p-8 text-center transition-colors hover:border-ember-2/40 lg:hidden"
        >
          <div
            className="clip-timeline-motif absolute inset-0 [mask-image:radial-gradient(ellipse_90%_100%_at_50%_0%,black,transparent)]"
            aria-hidden
          />
          <div className="ember-glow absolute inset-0" aria-hidden />
          <span className="relative rounded-full border border-hairline bg-background/60 px-4 py-1.5 font-display text-sm font-semibold backdrop-blur-sm">
            {demoSection.mobileTitle}
          </span>
          <span className="relative text-sm font-semibold">
            {demoSection.fullscreenLabel}
          </span>
          <span className="relative text-xs text-muted">
            {demoSection.mobileHint}
          </span>
        </Link>
      </div>
    </section>
  );
}
