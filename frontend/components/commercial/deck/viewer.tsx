"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/*
 * Le deck à l'écran du commercial : une diapositive par écran, qu'on fait
 * défiler au doigt (défilement horizontal aimanté, sans script : la page
 * mise en cache hors ligne se feuillette même avant l'hydratation), ← → au
 * clavier, et le plein écran quand le navigateur le permet (pas Safari sur
 * iPhone : le deck y remplit déjà la fenêtre).
 */

const onFullscreenChange = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const noSubscription = () => () => undefined;

export function DeckViewer({ title, backHref, slides }: { title: string; backHref: string; slides: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const canFullscreen = useSyncExternalStore(noSubscription, () => document.fullscreenEnabled, () => false);
  const fullscreen = useSyncExternalStore(onFullscreenChange, () => document.fullscreenElement !== null, () => false);

  const go = (index: number) => {
    const node = track.current;
    if (!node) return;
    const target = Math.max(0, Math.min(slides.length - 1, index));
    node.scrollTo({ left: target * node.clientWidth, behavior: "smooth" });
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") go(current + 1);
    else if (event.key === "ArrowLeft" || event.key === "PageUp") go(current - 1);
    else return;
    event.preventDefault();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const iconButton =
    "flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-foreground disabled:opacity-30";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <a href={backHref} className={iconButton} aria-label="Fermer le deck">
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </a>
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider text-faint">
          {title} · <span className="tabular-nums">{current + 1} / {slides.length}</span>
        </p>
        {canFullscreen ? (
          <button type="button" onClick={toggleFullscreen} className={iconButton} aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}>
            <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {fullscreen ? <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" /> : <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />}
            </svg>
          </button>
        ) : (
          <span aria-hidden className="size-11" />
        )}
      </header>

      <div
        ref={track}
        onScroll={(event) => {
          const node = event.currentTarget;
          setCurrent(Math.round(node.scrollLeft / node.clientWidth));
        }}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
      >
        {slides.map((slide, i) => (
          <section
            key={i}
            aria-label={`Diapositive ${i + 1} sur ${slides.length}`}
            className="flex w-full shrink-0 snap-start snap-always overflow-y-auto"
          >
            <div className="m-auto w-full max-w-5xl px-5 py-4">{slide}</div>
          </section>
        ))}
      </div>

      <footer className="flex items-center gap-3 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => go(current - 1)} disabled={current === 0} className={iconButton} aria-label="Diapositive précédente">
          <Chevron />
        </button>
        <div aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
          <div className="ember-gradient h-full origin-left transition-transform" style={{ transform: `scaleX(${(current + 1) / slides.length})` }} />
        </div>
        <button type="button" onClick={() => go(current + 1)} disabled={current === slides.length - 1} className={iconButton} aria-label="Diapositive suivante">
          <Chevron flip />
        </button>
      </footer>
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-4 ${flip ? "rotate-180" : ""}`}>
      <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
