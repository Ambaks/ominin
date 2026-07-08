import Image from "next/image";
import Link from "next/link";
import { qrShowcase } from "@/lib/landing-data";
import { QrLive } from "./qr-live";

export function QrShowcase() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 lg:max-w-5xl lg:px-10 lg:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-surface">
          <div className="ember-glow pointer-events-none absolute inset-0" aria-hidden />

          <div className="relative grid lg:grid-cols-2">
            <div className="flex flex-col justify-center gap-6 p-7 sm:p-10 lg:p-14">
              <p className="ember-text text-[11px] font-semibold uppercase tracking-[0.28em]">
                {qrShowcase.label}
              </p>
              <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
                {qrShowcase.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted lg:text-[15px]">
                {qrShowcase.lead}
              </p>

              <ul className="flex flex-col gap-4">
                {qrShowcase.points.map((point) => (
                  <li key={point.title} className="flex gap-3.5">
                    <span
                      className="ember-gradient mt-1.5 size-1.5 shrink-0 rounded-[1px]"
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium">{point.title}</p>
                      <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                        {point.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="hidden text-sm leading-relaxed text-muted lg:block">
                <span className="ember-text font-semibold">
                  {qrShowcase.scanHintStrong}
                </span>{" "}
                {qrShowcase.scanHint}
              </p>
              <Link
                href={qrShowcase.mobileCta.href}
                className="ember-gradient rounded-full px-5 py-2.5 text-center text-sm font-semibold text-background lg:hidden"
              >
                {qrShowcase.mobileCta.label}
              </Link>
            </div>

            <div className="relative min-h-[24rem] lg:min-h-0">
              <Image
                src={qrShowcase.photo.src}
                alt={qrShowcase.photo.alt}
                fill
                sizes="(min-width: 1024px) 32rem, 100vw"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-linear-to-b from-surface/70 via-transparent to-background/40 lg:bg-linear-to-r lg:from-surface lg:via-surface/15 lg:to-transparent"
                aria-hidden
              />

              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative w-52 rotate-2 rounded-2xl border border-hairline bg-surface-raised p-5 text-center shadow-2xl shadow-black/30 transition-transform duration-300 hover:rotate-0 sm:w-56">
                  <span className="ember-gradient absolute -right-3 -top-3 rotate-6 rounded-full px-3 py-1 text-[11px] font-bold text-background shadow-lg">
                    {qrShowcase.badge}
                  </span>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {qrShowcase.sticker.restaurant}
                  </p>
                  <div className="mx-auto mt-3 w-fit rounded-xl bg-white p-2">
                    <QrLive
                      path={qrShowcase.qrPath}
                      alt={qrShowcase.qrAlt}
                      className="size-32 rounded-lg sm:size-36"
                    />
                  </div>
                  <p className="mt-3 font-display text-xl font-semibold text-foreground">
                    {qrShowcase.sticker.table}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {qrShowcase.sticker.caption}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
