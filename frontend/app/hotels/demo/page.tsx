import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Accent, Photo } from "@/components/hotels/ui";
import { QrCode } from "@/components/pitch/qr-code";
import { chooser, demoSeo, hotel, qrPoints, spaces } from "@/lib/hotels-demo-data";
import { hotelsPrefix, hotelsSiteUrl } from "@/lib/site";

/*
 * L'entrée de la démo : les QR codes du Grand Large, comme posés dans
 * l'hôtel. En rendez-vous, l'hôtelier scanne celui de son choix avec son
 * propre téléphone ; au téléphone, on le touche.
 */

export const metadata: Metadata = {
  title: demoSeo.title,
  description: demoSeo.description,
  robots: { index: false, follow: false },
};

export default function HotelsDemo() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      <Link href={hotelsPrefix || "/"} className="text-xs font-semibold uppercase tracking-[0.24em] text-muted hover:text-foreground">
        ← {chooser.back}
      </Link>
      <header className="mt-14 max-w-2xl">
        <p className="kit-rise text-[11px] font-semibold uppercase tracking-[0.32em] text-ember-1">{chooser.eyebrow} · {hotel.name}</p>
        <h1 className="kit-display kit-rise mt-5 text-5xl sm:text-7xl" style={{ "--rise-delay": "90ms" } as CSSProperties}>
          <Accent text={chooser.title} />
        </h1>
        <p className="kit-rise mt-6 text-pretty leading-relaxed text-foreground/80" style={{ "--rise-delay": "180ms" } as CSSProperties}>
          {chooser.subtitle}
        </p>
        <p className="kit-rise mt-4 flex items-center gap-3 text-sm font-semibold text-ember-1" style={{ "--rise-delay": "240ms" } as CSSProperties}>
          <span aria-hidden className="h-px w-6 bg-ember-1" />
          {chooser.hint}
        </p>
        <p className="kit-rise mt-6" style={{ "--rise-delay": "300ms" } as CSSProperties}>
          <Link href={`${hotelsPrefix}/demo/gestion`} className="g-btn g-btn-secondary g-press">
            <span className="text-muted">{chooser.staff.eyebrow}</span>
            {chooser.staff.cta} →
          </Link>
        </p>
      </header>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {qrPoints.map((point, i) => (
          <li
            key={point.id}
            className={`hotels-tile ${i === 0 ? "sm:col-span-2 lg:col-span-1 lg:row-span-2" : ""}`}
            style={{ "--tile-i": i } as CSSProperties}
          >
            <Link
              href={`${hotelsPrefix}/demo/${point.id}`}
              className={`hotels-night hotels-zoom relative flex h-full flex-col justify-end overflow-hidden rounded-[2rem] p-3 ${i === 0 ? "min-h-[26rem] lg:min-h-full" : "min-h-[20rem]"}`}
            >
              <span className="absolute inset-0 -z-10" aria-hidden>
                <Photo name={point.kind === "room" ? point.photo : spaces[point.space].photo} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                <span className="hotels-scrim-card absolute inset-0" />
              </span>
              <span className="g-glass block p-g-pad">
                <span className="g-plate flex items-center gap-4 p-3">
                  <span className="shrink-0 rounded-xl bg-[#f6f1e8] p-2 text-[#131729]">
                    <QrCode value={`${hotelsSiteUrl}/demo/${point.id}`} label={chooser.qrLabel(point.label)} className="block size-20" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{point.where}</span>
                    <span className="kit-display mt-1 block text-[1.75rem]">{point.label}</span>
                    <span className="mt-1 block text-xs font-semibold text-ember-1">{chooser.open} →</span>
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
        <li className="hotels-tile lg:col-span-2" style={{ "--tile-i": qrPoints.length } as CSSProperties}>
          <Link
            href={`${hotelsPrefix}/demo/gestion`}
            className="hotels-night hotels-zoom relative flex h-full min-h-[20rem] flex-col justify-end overflow-hidden rounded-[2rem] p-3"
          >
            <span className="absolute inset-0 -z-10" aria-hidden>
              <Photo name={chooser.staff.photo} sizes="(min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw" />
              <span className="hotels-scrim-card absolute inset-0" />
            </span>
            <span className="g-glass block p-g-pad lg:max-w-lg">
              <span className="g-plate block p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{chooser.staff.eyebrow}</span>
                <span className="kit-display mt-1 block text-[1.75rem]">
                  <Accent text={chooser.staff.title} />
                </span>
                <span className="mt-1.5 block text-xs leading-relaxed text-foreground/80">{chooser.staff.text}</span>
                <span className="mt-2 block text-xs font-semibold text-ember-1">{chooser.staff.cta} →</span>
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </main>
  );
}
