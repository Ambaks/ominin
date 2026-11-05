"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { XIcon } from "@/components/gestion/icons";
import { Chip, GlassButton, Shimmer } from "@/components/gestion/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { demoFooter, gestion, hotel, type GestionNavItem } from "@/lib/hotels-demo-data";
import { hotelsPrefix } from "@/lib/site";
import { useDemo } from "../store";
import { Icon } from "../ui";
import { gestionBase, isDone, useRooms } from "./kit";

/*
 * La coquille de la gestion de l'hôtel, sur celle de la gestion des
 * restaurants : rail de verre dès 1024 px, barre haute, barre d'onglets
 * flottante et sa feuille « Plus » au téléphone.
 */

const { primary, more } = gestion.nav;
const all: GestionNavItem[] = [...primary, ...more];
const hrefOf = (item: GestionNavItem) => `${gestionBase}${item.path}`;
const contentId = "contenu";

function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href={gestionBase} className={`g-brand ${small ? "g-brand-sm" : ""}`}>
      <span className="ember-text font-display font-semibold">Ominin</span>
      <small className={small ? "max-sm:hidden" : ""}>{gestion.product}</small>
    </Link>
  );
}

interface Badge {
  value: number;
  label: (n: number) => string;
}

function Count({ badge }: { badge?: Badge }) {
  if (!badge || badge.value <= 0) return null;
  return (
    <>
      <span className="g-count" aria-hidden>
        {badge.value}
      </span>{" "}
      <span className="sr-only">{badge.label(badge.value)}</span>
    </>
  );
}

function PlusSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={gestion.more}
      className="g-sheet g-glass"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="g-sheet-body">{children}</div>
    </dialog>
  );
}

export function GestionShell({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/$/, "");
  const { loaded, activity, reset } = useDemo();
  const rooms = useRooms();
  const [moreOpen, setMoreOpen] = useState(false);

  const active = all.find((item) => hrefOf(item) === pathname);
  const activeIndex = active ? all.indexOf(active) : -1;
  const moreActive = activeIndex >= primary.length;
  const badges: Record<string, Badge> = {
    "/service": {
      value: activity.filter((a) => a.kind !== "reservation" && !isDone(a) && a.step === 0).length,
      label: gestion.waiting,
    },
    "/chambres": { value: rooms.toPrepare, label: gestion.toPrepare },
  };
  const pillStyle = {
    "--g-nav-y": `calc(${activeIndex} * (var(--g-nav-h) + var(--g-nav-gap))${
      moreActive ? " + var(--g-nav-group-h) + var(--g-nav-gap)" : ""
    })`,
  } as CSSProperties;

  const railLink = (item: GestionNavItem) => (
    <Link key={item.path} href={hrefOf(item)} aria-current={item === active ? "page" : undefined} className="g-nav-item">
      <Icon name={item.icon} />
      {item.label}
      <Count badge={badges[item.path]} />
    </Link>
  );

  return (
    <div
      className="g-shell"
      style={{ "--gestion-barre-bas": "calc(var(--g-tab-h) + 2 * var(--g-tabbar-pad-y) + var(--g-tabbar-bottom) + var(--g-gap))" } as CSSProperties}
    >
      <a
        href={`#${contentId}`}
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-full focus-visible:bg-surface-raised focus-visible:px-5 focus-visible:py-3 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ember-1"
      >
        {gestion.skip}
      </a>
      <aside className="g-rail g-glass">
        <Brand />
        <nav aria-label={gestion.sections} className="g-nav">
          {activeIndex >= 0 && <span className="g-nav-pill" style={pillStyle} aria-hidden />}
          {primary.map(railLink)}
          <div className="g-nav-group">
            <span className="g-eyebrow">{gestion.more}</span>
          </div>
          {more.map(railLink)}
        </nav>
        <div className="mt-auto grid gap-2 pt-3">
          <p className="px-3 text-xs leading-relaxed text-faint">{demoFooter.note}</p>
          <button type="button" onClick={reset} className="g-nav-item">
            <Icon name="reset" />
            {gestion.reset}
          </button>
        </div>
      </aside>

      <div className="g-col">
        <header className="g-topbar g-glass">
          <div className="g-who">
            <span className="g-venue-logo kit-display" aria-hidden>
              {gestion.initials}
            </span>
            <b className="kit-display truncate text-xl font-medium">{hotel.name}</b>
            <span className="max-sm:hidden">
              <Chip>{gestion.role}</Chip>
            </span>
          </div>
          <ThemeToggle />
          <Link href={`${hotelsPrefix}/demo`} title={gestion.client} aria-label={gestion.client} className="g-btn g-btn-secondary g-btn-collapse g-press">
            <Icon name="qr" />
            <span>{gestion.client}</span>
          </Link>
          <span className="lg:hidden max-sm:hidden">
            <Brand small />
          </span>
        </header>

        <main id={contentId} tabIndex={-1} className="w-full min-w-0 flex-1 outline-none px-[var(--g-topbar-mx-sm)] pb-[var(--gestion-barre-bas)] pt-6 lg:px-[var(--g-topbar-mx)] lg:pb-16">
          {loaded ? children : <Shimmer className="h-96 rounded-g-card" />}
        </main>
      </div>

      <nav aria-label={gestion.sections} className="g-tabbar g-glass" style={{ "--g-tabs": primary.length + 1 } as CSSProperties}>
        {primary.map((item) => (
          <Link key={item.path} href={hrefOf(item)} aria-current={item === active ? "page" : undefined} className="g-tab">
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <Count badge={badges[item.path]} />
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setMoreOpen(true)}
          className="g-tab"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="6" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18" cy="12" r="1.6" />
          </svg>
          <span>{gestion.more}</span>
        </button>
      </nav>

      {moreOpen && (
        <PlusSheet onClose={() => setMoreOpen(false)}>
          <div className="flex items-center justify-between gap-3 pl-2">
            <h2 className="kit-display text-2xl">{gestion.more}</h2>
            <GlassButton variant="icon" aria-label={gestion.close} onClick={() => setMoreOpen(false)}>
              <XIcon />
            </GlassButton>
          </div>
          <div className="g-sheet-grid">
            {more.map((item) => (
              <Link
                key={item.path}
                href={hrefOf(item)}
                aria-current={item === active ? "page" : undefined}
                onClick={() => setMoreOpen(false)}
                className="g-sheet-item"
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="grid">
            <Link href={`${hotelsPrefix}/demo`} onClick={() => setMoreOpen(false)} className="g-sheet-row">
              <Icon name="qr" />
              {gestion.client}
            </Link>
            <button
              type="button"
              className="g-sheet-row"
              onClick={() => {
                reset();
                setMoreOpen(false);
              }}
            >
              <Icon name="reset" />
              {gestion.reset}
            </button>
          </div>
        </PlusSheet>
      )}
    </div>
  );
}
