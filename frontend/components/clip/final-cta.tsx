import Link from "next/link";
import { contactEmail } from "@/lib/landing-data";
import { finalCta, signupCta } from "@/lib/clip-landing-data";

export function ClipFinalCta() {
  return (
    <section
      id={finalCta.id}
      className="relative scroll-mt-20 border-t border-hairline"
    >
      {/* Trame timeline en filigrane, fondue sur les bords */}
      <div
        className="clip-timeline-motif absolute inset-0 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black,transparent)]"
        aria-hidden
      />
      <div className="ember-glow relative mx-auto w-full max-w-2xl px-5 py-20 text-center lg:max-w-5xl lg:px-10 lg:py-32">
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl lg:text-4xl">
          {finalCta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted lg:text-base">
          {finalCta.subtitle}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href={signupCta.href}
            className="ember-gradient rounded-full px-6 py-3 text-sm font-semibold text-background lg:px-8 lg:py-3.5 lg:text-base"
          >
            {signupCta.label}
          </Link>
          <a
            href={`mailto:${contactEmail}`}
            className="rounded-full border border-hairline px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-ember-2/40 lg:px-8 lg:py-3.5 lg:text-base"
          >
            {finalCta.contactLabel}
          </a>
        </div>

        <div className="mt-6 flex justify-center gap-4 text-xs text-faint">
          {finalCta.microcopy.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
