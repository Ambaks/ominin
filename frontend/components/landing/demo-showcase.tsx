import Link from "next/link";
import { demoSection, demoCta } from "@/lib/landing-data";
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

        {/* Desktop: phone-framed iframe */}
        <div className="mx-auto mt-12 hidden max-w-sm lg:mt-16 lg:block">
          <div className="overflow-hidden rounded-[2.5rem] border-2 border-surface-raised bg-surface-raised p-3 shadow-2xl shadow-ember-2/5">
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

        {/* Mobile: tappable card linking to full-screen demo */}
        <Link
          href={demoCta.href}
          className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-hairline bg-surface p-8 text-center transition-colors hover:border-ember-2/40 lg:hidden"
        >
          <span className="ember-text font-display text-5xl font-medium">
            ☞
          </span>
          <span className="text-sm font-semibold text-foreground">
            {demoSection.fullscreenLabel}
          </span>
          <span className="text-xs text-muted">
            Ouvrez le menu exactement comme vos clients le verront.
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
