"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { OmininMark } from "@/components/pitch/brand";

/*
 * La barre de la présentation et son mode « Présenter » : une diapositive
 * remplit l'écran (plein écran quand le navigateur le permet), ← → Espace
 * Page↑ Page↓ Début Fin pour avancer, un clic ou un appui sur la moitié
 * droite ou gauche, un glissé du doigt, Échap pour revenir à la page.
 *
 * Les diapositives restent celles du serveur : ce composant ne fait que
 * poser des attributs (data-mode sur .ckl-deck, data-pos et inert sur chaque
 * .deck-frame) que deck.css met en scène, et rejouer les entrées de la
 * diapositive qui arrive (data-seen retiré puis reposé).
 */

interface Labels {
  title: string;
  present: string;
  pdf: string;
  pdfLabel: string;
  exit: string;
  previous: string;
  next: string;
  hint: string;
  keys: string;
}

const forward = new Set(["ArrowRight", "ArrowDown", "PageDown"]);
const backward = new Set(["ArrowLeft", "ArrowUp", "PageUp"]);

export function Presenter({ ui, pdfHref, swipePx }: { ui: Labels; pdfHref: string; swipePx: number }) {
  const anchor = useRef<HTMLDivElement>(null);
  const presentButton = useRef<HTMLButtonElement>(null);
  const frames = useRef<HTMLElement[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [announce, setAnnounce] = useState("");
  const present = current !== null;

  const root = () => anchor.current?.closest<HTMLElement>(".ckl-deck") ?? null;

  function show(next: number) {
    const all = frames.current;
    const index = Math.max(0, Math.min(all.length - 1, next));
    // Au bout de la présentation, avancer encore ne rejoue rien.
    if (index === current) return;
    all.forEach((frame, i) => {
      frame.dataset.pos = i < index ? "before" : i > index ? "after" : "current";
      frame.inert = i !== index;
    });
    // Rejouer les entrées : sans data-seen, l'animation tombe ; reposé après un calcul de style, elle repart.
    const frame = all[index];
    if (root()?.hasAttribute("data-motion")) {
      frame.removeAttribute("data-seen");
      void frame.offsetWidth;
    }
    frame.setAttribute("data-seen", "");
    setCurrent(index);
    setAnnounce(frame.getAttribute("aria-label") ?? "");
  }

  function enter() {
    const deck = root();
    if (!deck) return;
    const all = [...deck.querySelectorAll<HTMLElement>(".deck-frame")];
    // On présente à partir de la diapositive la plus proche du centre de l'écran.
    const middle = window.innerHeight / 2;
    const distance = (frame: HTMLElement) => {
      const { top, bottom } = frame.getBoundingClientRect();
      return Math.abs((top + bottom) / 2 - middle);
    };
    const start = all.reduce((best, frame, i) => (distance(frame) < distance(all[best]) ? i : best), 0);
    frames.current = all;
    setTotal(all.length);
    deck.dataset.mode = "present";
    show(start);
    // Safari sur iPhone n'a pas de plein écran pour la page : la présentation remplit alors la fenêtre.
    document.documentElement.requestFullscreen?.()?.catch(() => undefined);
  }

  function exit() {
    const deck = root();
    if (!deck || current === null) return;
    deck.dataset.mode = "scroll";
    for (const frame of frames.current) {
      delete frame.dataset.pos;
      frame.inert = false;
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    frames.current[current].scrollIntoView({ block: "center" });
    setCurrent(null);
    setAnnounce("");
    presentButton.current?.focus();
  }

  // Les gestes du mode présentation, sur l'état du rendu en cours.
  const step = useEffectEvent((delta: number) => show((current ?? 0) + delta));
  const jump = useEffectEvent((index: number) => show(index));
  const leave = useEffectEvent(() => exit());

  useEffect(() => {
    if (!present) return;
    const deck = root();
    if (!deck) return;

    // L'échelle : la diapositive entière, la plus grande possible dans l'écran.
    const slide = frames.current[0].querySelector<HTMLElement>(".deck-slide")!;
    const fit = () => deck.style.setProperty("--ckl-present-scale", String(Math.min(window.innerWidth / slide.offsetWidth, window.innerHeight / slide.offsetHeight)));
    fit();

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") leave();
      else if (forward.has(event.key) || (event.key === " " && !event.shiftKey)) step(1);
      else if (backward.has(event.key) || (event.key === " " && event.shiftKey)) step(-1);
      else if (event.key === "Home") jump(0);
      else if (event.key === "End") jump(frames.current.length - 1);
      else return;
      event.preventDefault();
    };

    // Un glissé du doigt change de diapositive ; le clic qui le suit ne compte pas.
    let swipe: { x: number; y: number } | null = null;
    let swiped = false;
    const onPointerDown = (event: PointerEvent) => {
      swiped = false;
      swipe = event.pointerType === "mouse" ? null : { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!swipe) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (Math.abs(dx) < swipePx || Math.abs(dx) < Math.abs(dy)) return;
      swiped = true;
      step(dx < 0 ? 1 : -1);
    };
    const onClick = (event: MouseEvent) => {
      if (swiped || (event.target as Element).closest("a, button")) return;
      step(event.clientX < window.innerWidth / 2 ? -1 : 1);
    };
    // Sortir du plein écran (Échap, que le navigateur garde pour lui) quitte aussi la présentation.
    const onFullscreen = () => {
      if (!document.fullscreenElement) leave();
    };

    window.addEventListener("resize", fit);
    window.addEventListener("keydown", onKey);
    deck.addEventListener("pointerdown", onPointerDown);
    deck.addEventListener("pointerup", onPointerUp);
    deck.addEventListener("click", onClick);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", onKey);
      deck.removeEventListener("pointerdown", onPointerDown);
      deck.removeEventListener("pointerup", onPointerUp);
      deck.removeEventListener("click", onClick);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [present, swipePx]);

  return (
    <div ref={anchor} className="contents">
      <header className="ckl-bar">
        <div className="ckl-bar-title">
          <OmininMark className="text-[20px]" />
          <span>{ui.title}</span>
        </div>
        <div className="ckl-bar-actions">
          <a href={pdfHref} download className="ckl-button" aria-label={ui.pdfLabel}>
            {ui.pdf}
          </a>
          <button ref={presentButton} type="button" onClick={enter} className="ckl-button ckl-button-primary" aria-describedby="ckl-keys">
            <svg viewBox="0 0 12 12" aria-hidden className="size-[11px]">
              <path d="M2 1l9 5-9 5z" fill="currentColor" />
            </svg>
            {ui.present}
          </button>
          <span id="ckl-keys" hidden>
            {ui.keys}
          </span>
        </div>
      </header>
      <p className="ckl-hint">{ui.hint}</p>
      {present && (
        <>
          <div aria-hidden className="ckl-progress" style={{ scale: `${(current + 1) / total} 1` }} />
          <div className="ckl-controls" role="toolbar" aria-label={ui.title}>
            <button type="button" onClick={() => show(current - 1)} disabled={current === 0} aria-label={ui.previous}>
              <Chevron />
            </button>
            <p aria-hidden>
              {current + 1} / {total}
            </p>
            <button type="button" onClick={() => show(current + 1)} disabled={current === total - 1} aria-label={ui.next}>
              <Chevron flip />
            </button>
            <button type="button" onClick={exit} aria-label={ui.exit}>
              <svg viewBox="0 0 16 16" aria-hidden className="size-[14px]">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </>
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-[16px] ${flip ? "rotate-180" : ""}`}>
      <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
