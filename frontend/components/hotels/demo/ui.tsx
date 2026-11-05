"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { GlassButton, Sheet } from "@/components/gestion/ui";
import { Accent, LiveDot, Photo } from "@/components/hotels/ui";
import type { HotelPhoto } from "@/lib/hotels-landing-data";
import { demoFooter, demoNotFound, folio, folioSent, guest, guestText, hotel, room, tracking, type FolioLine } from "@/lib/hotels-demo-data";
import { formatPrice } from "@/lib/menu/format";
import { hotelsPrefix } from "@/lib/site";
import { gestionBase } from "./gestion/kit";
import { isDone, useDemo } from "./store";

/* Pièces communes de la démo client : icônes, haut de page, suivi, note de chambre, pied, 404. */

const paths = {
  towel: "M6 4h12v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V4ZM6 9h12M10 14h4",
  pillow: "M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8ZM8 9c1.5 1 6.5 1 8 0M8 15c1.5-1 6.5-1 8 0",
  broom: "M14 3 10 12M6 12h8l1.5 9h-11L6 12ZM9 16v5M12 16v5",
  iron: "M4 17h16l-1.2-4.2A5 5 0 0 0 14 9H9M9 9V6h6M7 20h10",
  kit: "M4 8h16v11H4V8ZM9 8V5h6v3M12 11v5M9.5 13.5h5",
  clock: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18ZM12 7v5l3 2",
  car: "M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M4 11h16v6H4v-6ZM7 17v2M17 17v2M7.5 14h.01M16.5 14h.01",
  alarm: "M12 6a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM12 10v3l2 1.5M4 5l3-2M20 5l-3-2",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6M9 16h3",
  wifi: "M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  copy: "M9 9h11v11H9V9ZM5 15H4V4h11v1",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  check: "M5 12.5 10 17l9-10",
  chevron: "M9 6l6 6-6 6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  qr: "M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6ZM14 14h2v2h-2v-2ZM18 18h2v2h-2v-2ZM14 18h2M18 14h2",
  home: "M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5",
  bed: "M3 19V6M3 14h18M21 19v-6a3 3 0 0 0-3-3h-8v4M6.5 11.5a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5Z",
  wave: "M3 10c2 0 2.5-1.5 4.5-1.5S10 10 12 10s2.5-1.5 4.5-1.5S19 10 21 10M3 15c2 0 2.5-1.5 4.5-1.5S10 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15",
  calendar: "M5 6h14v14H5V6ZM5 10h14M9 4v4M15 4v4",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a5.5 5.5 0 0 1 3 5",
  chart: "M4 20h16M7 16v-5M12 16V7M17 16v-8",
  thermo: "M10 14.5V5a2 2 0 1 1 4 0v9.5a3.5 3.5 0 1 1-4 0ZM12 9v7",
  reset: "M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

export const label = "text-[11px] font-semibold uppercase tracking-[0.2em] text-muted";

/** Titre de section : surtitre en capitales de laiton, titre Cormorant à mot italique. */
export function SectionTitle({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <header className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">{eyebrow}</p>
      <h2 className="kit-display mt-2 text-[2.1rem]">
        <Accent text={title} />
      </h2>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </header>
  );
}

/** Pastille de choix : filet au repos, laiton une fois choisie. */
export function Choice({
  on,
  disabled,
  onClick,
  children,
  className = "",
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={`hd-chip g-press ${className}`}>
      {children}
    </button>
  );
}

/**
 * Le haut de chaque QR : la photo de l'espace jusque sous la barre, la marque
 * de l'hôtel, la note de chambre à portée, puis le titre et ses gestes.
 */
export function Hero({
  photo,
  title,
  subtitle,
  children,
}: {
  photo: HotelPhoto;
  title: ReactNode;
  subtitle: string;
  children?: ReactNode;
}) {
  const { total } = useDemo();
  const [folioOpen, setFolioOpen] = useState(false);
  return (
    <section className="hotels-night relative -mx-4 px-4">
      <div className="hotels-fade-b absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden" aria-hidden>
        <Photo name={photo} sizes="(min-width: 640px) 32rem, 100vw" priority />
        <div className="hotels-scrim-card absolute inset-0" />
      </div>
      <div className="flex items-center justify-between gap-3 pt-5">
        <p className="flex min-w-0 flex-col">
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.32em]">{hotel.name}</span>
          <span className="text-[10px] uppercase tracking-[0.24em] text-foreground/60">{hotel.kind}</span>
        </p>
        <button type="button" onClick={() => setFolioOpen(true)} className="g-glass g-glass-pill g-press flex h-11 shrink-0 items-center gap-2 pl-3.5 pr-4 text-sm font-semibold">
          <Icon name="receipt" className="size-4 text-ember-1" />
          {room.folioPill}
          <span className="tabular-nums text-foreground/75">{formatPrice(total)}</span>
        </button>
      </div>
      <div className="pb-12 pt-36">
        <span className="hotels-sun mx-0" aria-hidden />
        <h1 className="kit-display mt-5 text-[3.1rem]">{title}</h1>
        <p className="mt-3 text-pretty text-sm text-foreground/80">{subtitle}</p>
        {children}
      </div>
      {folioOpen && <FolioSheet onClose={() => setFolioOpen(false)} />}
    </section>
  );
}

export function FolioSheet({ onClose }: { onClose: () => void }) {
  const { folio: lines, total, sent } = useDemo();
  return (
    <Sheet title={folio.title} description={folio.subtitle} onClose={onClose}>
      {sent.includes(guest.room) && (
        <p className="hd-row mb-5 flex items-center gap-2 p-4 text-sm font-semibold">
          <Icon name="check" className="size-4 text-ember-1" />
          {folioSent}
        </p>
      )}
      <FolioLines lines={lines} total={total} />
      <h3 className={`${label} mt-8`}>{folio.stay.title}</h3>
      <Facts items={folio.stay.items} />
    </Sheet>
  );
}

/** Les lignes d'une note de chambre et son total. */
export function FolioLines({ lines, total }: { lines: readonly FolioLine[]; total: number }) {
  return (
    <>
      {lines.length === 0 ? (
        <p className="text-sm text-muted">{folio.empty}</p>
      ) : (
        <ul className="flex flex-col">
          {lines.map((line, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto] gap-x-3 border-t border-hairline py-3 text-sm first:border-t-0 first:pt-0">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ember-1">
                {line.space} <span className="text-faint">· {line.when}</span>
              </span>
              <span className="row-span-2 self-center tabular-nums">{formatPrice(line.amount)}</span>
              <span className="text-foreground/80">{line.item}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex items-baseline justify-between border-t border-hairline pt-4">
        <span className="text-sm font-semibold">{folio.total}</span>
        <span className="kit-display ember-text text-3xl tabular-nums">{formatPrice(total)}</span>
      </div>
    </>
  );
}

/** Des repères en tuiles de deux colonnes ; un nombre impair laisse la dernière en pleine largeur. */
export function Facts({ items }: { items: readonly { label: string; value: string }[] }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <div key={item.label} className={`hd-row px-3.5 py-3 ${i === items.length - 1 && items.length % 2 ? "col-span-2" : ""}`}>
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Ce qui est en cours : chaque commande, demande ou appel, son étape et sa barre ; `origin` : celles d'un seul QR.
 * La région annoncée reste montée même vide, pour que la première demande soit lue.
 */
export function Tracking({ origin }: { origin?: string }) {
  const { activity, advance, dismiss } = useDemo();
  const shown = activity.filter((a) => !a.hidden && !a.seed && (!origin || a.origin === origin));
  return (
    <>
      <div aria-live="polite" className="sr-only">
        {shown.map((a) => (
          <p key={a.id}>{guestText.status(a.title, a.steps[a.step])}</p>
        ))}
      </div>
      {shown.length > 0 && (
        <section className="g-glass p-g-pad">
          <div className="g-plate flex flex-col gap-4 p-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
              <LiveDot />
              {tracking.eyebrow}
            </p>
            {shown.map((a) => {
              const done = isDone(a);
              return (
                <article key={a.id} className="border-t border-hairline pt-4 first-of-type:border-t-0 first-of-type:pt-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="min-w-0 font-semibold leading-snug">{a.title}</h3>
                    <span className="shrink-0 text-xs tabular-nums text-faint">{a.at}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{a.detail}</p>
                  <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${done ? "" : "text-ember-1"}`}>
                    {done && <Icon name="check" className="size-4 text-ember-1" />}
                    {a.steps[a.step]}
                  </p>
                  <div className="mt-2 flex gap-1" aria-hidden>
                    {a.steps.map((step, i) => (
                      <span key={step} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= a.step ? "ember-gradient" : "bg-foreground/10"}`} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => (done ? dismiss(a.id) : advance(a.id))}
                    className="mt-3 text-xs font-semibold text-muted underline decoration-hairline underline-offset-4 hover:text-foreground"
                  >
                    {done ? tracking.dismiss : tracking.advance}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

export function DemoFooter() {
  const { reset } = useDemo();
  return (
    <footer className="mt-16 flex flex-col items-center gap-4 border-t border-hairline pb-12 pt-8 text-center">
      <span className="hotels-sun" aria-hidden />
      <p className="text-xs text-muted">{demoFooter.note}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <GlassButton href={`${hotelsPrefix}/demo`}>
          <Icon name="qr" />
          {demoFooter.others}
        </GlassButton>
        <GlassButton onClick={reset}>{demoFooter.reset}</GlassButton>
      </div>
      <Link href={gestionBase} className="text-xs font-semibold text-muted underline decoration-hairline underline-offset-4 hover:text-foreground">
        {demoFooter.gestion}
      </Link>
    </footer>
  );
}

/** Une adresse inconnue de la démo : le 404 de l'hôtel, vers les QR codes et la gestion. */
export function Lost({ copy, inGestion = false }: { copy: { title: string; text: string }; inGestion?: boolean }) {
  const chooser = (
    <GlassButton key="chooser" variant={inGestion ? "secondary" : "primary"} href={`${hotelsPrefix}/demo`}>
      <Icon name="qr" />
      {demoNotFound.chooser}
    </GlassButton>
  );
  const home = (
    <GlassButton key="home" variant={inGestion ? "primary" : "secondary"} href={gestionBase}>
      <Icon name="home" />
      {inGestion ? demoNotFound.today : demoNotFound.home}
    </GlassButton>
  );
  return (
    <section className="flex flex-col items-start gap-5 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ember-1">
        {guestText.joined([hotel.name, demoNotFound.code])}
      </p>
      <h1 className="kit-display text-[2.5rem] sm:text-5xl">
        <Accent text={copy.title} />
      </h1>
      <p className="max-w-md text-pretty text-sm text-muted">{copy.text}</p>
      <div className="flex flex-wrap gap-2">{inGestion ? [home, chooser] : [chooser, home]}</div>
    </section>
  );
}
