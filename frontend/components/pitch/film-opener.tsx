"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Sans image dans ce délai (réseau, fichier introuvable), la page reprend la main. */
const START_TIMEOUT_MS = 8000;
/** Le fondu vers la page ; pitch.css le réduit sous prefers-reduced-motion. */
const FADE_MS = 600;

/*
 * Avant la première peinture, sur un chargement complet : premier passage,
 * html[data-pitch-film="intro"] — pitch.css affiche alors le film par-dessus la
 * page et bloque le défilement, sans attendre React. Stockage indisponible :
 * le film aussi. Ailleurs dans le cycle de vie, l'attribut vaut « sortie »
 * (le fondu) puis « fin ».
 */
const decide = (seenKey: string) =>
  `try{if(!localStorage.getItem(${JSON.stringify(seenKey)}))document.documentElement.dataset.pitchFilm="intro"}catch(e){document.documentElement.dataset.pitchFilm="intro"}`;

type Phase = "attente" | "lecture" | "sortie" | "fin";

type Copy = { label: string; skip: string; soundOn: string; soundOff: string; play: string };

/**
 * Le film d'ouverture, au premier passage : plein écran, avant tout le reste,
 * pour que le siège ait le contexte avant de lire. Lecture muette (seule
 * permise sans geste), un bouton bien visible pour le son ; « Passer » et
 * Échap pour sortir. La page dessous est inerte et ne défile pas. Toutes les
 * sorties — fin du film, Passer, Échap, échec de chargement, délai dépassé —
 * passent par le même finish(), qui ne joue qu'une fois.
 */
export function FilmOpener({
  wide,
  vertical,
  poster,
  posterVertical,
  seenKey,
  copy,
}: {
  wide: string;
  vertical: string;
  poster: string;
  posterVertical: string;
  /** Posé quand le film s'est terminé ou a été passé : les visites suivantes vont droit à la page. */
  seenKey: string;
  copy: Copy;
}) {
  const [phase, setPhase] = useState<Phase>("attente");
  const [src, setSrc] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [started, setStarted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);
  const finishRef = useRef<(seen: boolean) => void>(() => {});
  const startTimer = useRef<number | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    // Le script en ligne a tranché avant React : visite suivante, navigation
    // côté client ou film déjà joué dans ce document, la page seule.
    if (html.dataset.pitchFilm !== "intro") {
      // Le choix dépend de l'état posé avant l'hydratation : ce rendu de plus est voulu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("fin");
      return;
    }

    // Choisi une fois pour toutes : la coupe 9:16 pour un écran tenu droit.
    setSrc(window.matchMedia("(orientation: portrait)").matches ? vertical : wide);
    setPhase("lecture");

    // La page reste derrière le film mais hors d'atteinte : tout ce qui n'est
    // pas sur le chemin du film devient inerte, le clavier ne trouve que ses boutons.
    const inerted: HTMLElement[] = [];
    for (let node: HTMLElement | null = rootRef.current; node && node !== document.body; node = node.parentElement) {
      for (const sibling of Array.from(node.parentElement?.children ?? [])) {
        if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true;
          inerted.push(sibling);
        }
      }
    }
    const release = () => {
      for (const element of inerted) element.inert = false;
      inerted.length = 0;
    };

    let finished = false;
    let fade: number | null = null;
    const clearStart = () => {
      if (startTimer.current !== null) window.clearTimeout(startTimer.current);
      startTimer.current = null;
    };
    finishRef.current = (seen) => {
      if (finished) return;
      finished = true;
      clearStart();
      if (seen) {
        try {
          localStorage.setItem(seenKey, "1");
        } catch {}
      }
      videoRef.current?.pause();
      release();
      // On arrive sur la page par son haut.
      window.scrollTo(0, 0);
      html.dataset.pitchFilm = "sortie";
      setPhase("sortie");
      fade = window.setTimeout(() => {
        html.dataset.pitchFilm = "fin";
        setPhase("fin");
      }, FADE_MS);
    };

    startTimer.current = window.setTimeout(() => finishRef.current(false), START_TIMEOUT_MS);
    // « Passer » reçoit le focus à l'ouverture, mais son anneau ne s'affiche
    // qu'au clavier : au toucher et à la souris, il ferait un second jaune.
    const onKeydown = (event: KeyboardEvent) => {
      rootRef.current?.setAttribute("data-clavier", "");
      if (event.key === "Escape") finishRef.current(true);
    };
    window.addEventListener("keydown", onKeydown);
    skipRef.current?.focus();

    return () => {
      clearStart();
      if (fade !== null) window.clearTimeout(fade);
      window.removeEventListener("keydown", onKeydown);
      release();
    };
  }, [vertical, wide, seenKey]);

  // Lecture muette, la seule qu'un navigateur lance sans geste. Refusée quand
  // même (mode économie d'énergie sur iPhone) : un bouton la lance au toucher.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.play().catch((error: DOMException) => {
      if (error.name === "NotAllowedError") {
        if (startTimer.current !== null) window.clearTimeout(startTimer.current);
        startTimer.current = null;
        setBlocked(true);
      } else if (error.name !== "AbortError") {
        finishRef.current(false);
      }
    });
  }, [src]);

  // Le son se coupe ou s'active d'un toucher : un geste, donc permis partout,
  // iPhone compris (la vidéo est en playsInline).
  const toggleSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted) video.volume = 1;
    if (video.paused) void video.play().catch(() => finishRef.current(false));
  }, []);

  const playWithSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setBlocked(false);
    void video.play().catch(() => finishRef.current(false));
  }, []);

  if (phase === "fin") return null;

  const pill =
    "flex min-h-12 items-center gap-2.5 rounded-full font-bold transition-colors";

  return (
    <>
      <script
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: decide(seenKey) }}
      />
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={copy.label}
        data-leaving={phase === "sortie" || undefined}
        className="pitch-opener fixed inset-0 z-[70] items-center justify-center bg-(--pitch-film)"
      >
        {src && (
          <video
            ref={videoRef}
            src={src}
            playsInline
            preload="auto"
            aria-hidden
            className={`absolute inset-0 h-full w-full object-contain ${src === wide ? "pitch-opener-wide" : ""}`}
            onPlaying={() => {
              if (startTimer.current !== null) window.clearTimeout(startTimer.current);
              startTimer.current = null;
              setStarted(true);
            }}
            onEnded={() => finishRef.current(true)}
            onError={() => finishRef.current(false)}
            onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
            onTimeUpdate={(event) => {
              // Sans rendu React : la barre et le temps restant suivent le film directement.
              const { currentTime, duration } = event.currentTarget;
              if (!duration) return;
              if (progressRef.current) progressRef.current.style.transform = `scaleX(${currentTime / duration})`;
              if (remainingRef.current) {
                const left = Math.max(0, Math.ceil(duration - currentTime));
                remainingRef.current.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
              }
            }}
          />
        )}
        {/* L'affiche le temps du chargement, cadrée comme le film qui la suit ; elle
            s'efface d'un coup à la première image, le film s'ouvrant sur le noir. */}
        <picture className={`pointer-events-none absolute inset-0 ${started ? "invisible" : ""}`}>
          <source media="(orientation: portrait)" srcSet={posterVertical} />
          <img src={poster} alt="" className="pitch-opener-wide h-full w-full object-contain" />
        </picture>
        <div aria-hidden className="contents">
          <span className="pitch-opener-feather" />
          <span className="pitch-opener-feather" />
        </div>

        <button
          ref={skipRef}
          type="button"
          onClick={() => finishRef.current(true)}
          className={`${pill} absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] border border-white/30 bg-black/45 px-5 text-sm text-white backdrop-blur-sm hover:border-white/60 hover:bg-black/65 active:bg-black/80 md:right-8 md:top-8`}
        >
          {copy.skip}
          <span ref={remainingRef} aria-hidden className="tabular-nums font-medium text-white/60" />
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
            <path d="M5 5.5v13l9-6.5zM15.5 5.5h2.5v13h-2.5z" />
          </svg>
        </button>

        {blocked ? (
          <button
            type="button"
            onClick={playWithSound}
            className={`${pill} relative bg-(--pitch-accent) py-3 pl-3 pr-7 text-lg text-(--pitch-on-accent) shadow-[0_0_60px_color-mix(in_srgb,var(--pitch-accent)_25%,transparent)] hover:bg-(--pitch-accent-light) active:scale-[0.98]`}
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-(--pitch-on-accent) text-(--pitch-accent)">
              <svg viewBox="0 0 24 24" aria-hidden className="ml-0.5 size-5 fill-current">
                <path d="M7 4.5v15l12.5-7.5z" />
              </svg>
            </span>
            {copy.play}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={!muted}
            className={`${pill} absolute bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] left-1/2 -translate-x-1/2 whitespace-nowrap active:scale-[0.98] md:bottom-12 ${
              muted
                ? "bg-(--pitch-accent) py-3 pl-3 pr-6 text-base text-(--pitch-on-accent) shadow-[0_0_60px_color-mix(in_srgb,var(--pitch-accent)_25%,transparent)] hover:bg-(--pitch-accent-light) md:text-lg"
                : "border border-white/30 bg-black/45 py-2 pl-2 pr-5 text-sm text-white backdrop-blur-sm hover:border-white/60 hover:bg-black/65"
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-full ${
                muted ? "size-10 bg-(--pitch-on-accent) text-(--pitch-accent)" : "size-8 bg-white/10 text-white"
              }`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="fill-current" />
                {muted ? <path d="m16 9.5 5 5m0-5-5 5" /> : <path d="M16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11" />}
              </svg>
            </span>
            {muted ? copy.soundOn : copy.soundOff}
          </button>
        )}

        <div aria-hidden className="absolute inset-x-0 bottom-[env(safe-area-inset-bottom)] h-[3px] bg-white/15">
          <div ref={progressRef} style={{ transform: "scaleX(0)" }} className="h-full origin-left bg-(--pitch-accent)" />
        </div>
      </div>
    </>
  );
}
