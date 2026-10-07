"use client";

import Image from "next/image";
import { revealMargin } from "@/components/portal/reveal";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/*
 * Le défilé des partenaires de la section Installation : « Ominin ×
 * <partenaire> » en tête du panneau caisse, le nom changeant lettre à lettre
 * toutes les intervalMs, et avec lui l'écran de la caisse et le point braise
 * qui lui porte la commande. Le défilé ne court que panneau caisse en vue
 * (PartnerZone), et s'arrête onglet caché, sous la souris, au bouton pause,
 * ou d'emblée si le visiteur a demandé moins d'animations ; un lecteur
 * d'écran lit la liste entière, une fois. Les données arrivent en props des
 * composants serveur : ce fichier n'en importe aucune, le bundle client reste
 * léger.
 */

interface Cycle {
  active: number;
  previous: number | null;
  running: boolean;
  /** Mis en pause par le visiteur, au bouton. */
  paused: boolean;
  setPaused: (paused: boolean) => void;
  lessMotion: boolean;
  /** Clé des animations d'arrivée : -1 tant que la section n'a pas été vue. */
  arrival: number;
  intervalMs: number;
  /** La zone observée et survolée : le panneau caisse. */
  watch: (zone: HTMLElement | null) => void;
  setHovered: (hovered: boolean) => void;
}

const PartnerCycleContext = createContext<Cycle | null>(null);

function usePartnerCycle(): Cycle {
  const cycle = useContext(PartnerCycleContext);
  if (!cycle) throw new Error("Hors de PartnerCycle.");
  return cycle;
}

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

let reducedMotion: MediaQueryList | undefined;
const reducedMotionQuery = () =>
  (reducedMotion ??= matchMedia("(prefers-reduced-motion: reduce)"));
const subscribeReducedMotion = (onChange: () => void) => {
  reducedMotionQuery().addEventListener("change", onChange);
  return () => reducedMotionQuery().removeEventListener("change", onChange);
};

export function PartnerCycle({
  count,
  intervalMs,
  children,
}: {
  count: number;
  intervalMs: number;
  children: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  // La première arrivée se rejoue quand la section paraît : jouée au
  // chargement, hors de l'écran, personne ne l'aurait vue.
  const [seen, setSeen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const tabHidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false
  );
  const lessMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => reducedMotionQuery().matches,
    () => false
  );
  const [zone, watch] = useState<HTMLElement | null>(null);
  // Ce qu'il reste du partenaire en cours : une pause le garde, la reprise
  // repart de là — le trait sous le nom, figé pendant la pause, reste juste.
  const remaining = useRef(intervalMs);
  const running =
    onScreen && !tabHidden && !hovered && !paused && !lessMotion;

  // La marge de Reveal : le défilé démarre quand le panneau paraît.
  useEffect(() => {
    if (!zone) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.at(-1)!.isIntersecting;
        setOnScreen(visible);
        if (visible) setSeen(true);
      },
      { rootMargin: revealMargin }
    );
    observer.observe(zone);
    return () => observer.disconnect();
  }, [zone]);

  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    let elapsed = false;
    const timer = setTimeout(() => {
      elapsed = true;
      remaining.current = intervalMs;
      setPrevious(active);
      setActive((active + 1) % count);
    }, remaining.current);
    return () => {
      clearTimeout(timer);
      // Un minuteur retardé (onglet chargé) peut dépasser son échéance.
      if (!elapsed) {
        remaining.current = Math.max(
          0,
          remaining.current - (performance.now() - started)
        );
      }
    };
  }, [running, active, count, intervalMs]);

  return (
    <PartnerCycleContext
      value={{
        active,
        previous,
        running,
        paused,
        setPaused,
        lessMotion,
        arrival: seen ? active : -1,
        intervalMs,
        watch,
        setHovered,
      }}
    >
      {children}
    </PartnerCycleContext>
  );
}

/** L'en-tête et la scène du panneau caisse : ce que le défilé anime. */
export function PartnerZone({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { watch, setHovered } = usePartnerCycle();
  return (
    <div
      ref={watch}
      // La souris seule : au doigt, l'entrée émulée d'un toucher ne ressort
      // qu'au toucher suivant, ailleurs — le défilé restait figé. Clavier et
      // toucher ont le bouton pause.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      className={className}
    >
      {children}
    </div>
  );
}

/** « Ominin × <partenaire> », en tête du panneau caisse, et sa pause. */
export function PartnerLockup({
  brand,
  names,
  icons,
  spoken,
  controls,
}: {
  brand: string;
  names: string[];
  /** L'icône officielle de chaque partenaire, dans l'ordre des noms. */
  icons: { src: string; bleed?: boolean }[];
  spoken: string;
  controls: { pause: string; play: string };
}) {
  const { active, previous, running, paused, setPaused, lessMotion, intervalMs } =
    usePartnerCycle();
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <p className="sr-only">{spoken}</p>
      <div
        aria-hidden
        className="flex w-fit items-baseline gap-2 text-lg font-semibold"
      >
        {/* Sur une pastille sombre : la braise du logo disparaissait sur le
            crème du panneau en thème sombre. */}
        <span className="flex size-6 shrink-0 items-center justify-center self-center rounded-md bg-neutral-950 ring-1 ring-white/10">
          <Image src="/logo.png" alt="" width={16} height={16} />
        </span>
        <span className="kit-display">{brand}</span>
        <span className="text-sm text-background/55">×</span>
        {/* Tous les noms empilés dans la même case : sa largeur est celle
            du plus long, rien ne bouge autour quand ils se relaient. */}
        <span className="inline-grid min-w-0">
          {names.map((name, index) => (
            <span
              key={name}
              data-state={
                index === active ? "in" : index === previous ? "out" : "idle"
              }
              className="partner-name tracking-tight"
            >
              {/* L'icône, dans ses couleurs sur une tuile blanche, entre et
                  sort avec les lettres, en tête du cortège. */}
              <span
                className={`partner-letter mr-1.5 inline-flex size-6 items-center justify-center overflow-hidden rounded-md bg-white align-[-0.3em] ring-1 ring-black/10 ${
                  icons[index].bleed ? "" : "p-1"
                }`}
                style={{ "--i": 0 } as React.CSSProperties}
              >
                <Image
                  src={icons[index].src}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="size-full object-contain"
                />
              </span>
              {[...name].map((letter, position) => (
                <span
                  key={position}
                  className="partner-letter"
                  style={{ "--i": position + 1 } as React.CSSProperties}
                >
                  {letter === " " ? "\u00a0" : letter}
                </span>
              ))}
              {index === active && !lessMotion && (
                <span
                  className="partner-progress"
                  style={{
                    animationDuration: `${intervalMs}ms`,
                    animationPlayState: running ? "running" : "paused",
                  }}
                />
              )}
            </span>
          ))}
        </span>
      </div>
      {!lessMotion && (
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? controls.play : controls.pause}
          title={paused ? controls.play : controls.pause}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-background/75 ring-1 ring-background/20 transition-colors hover:bg-background/10 hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
        >
          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5" fill="currentColor">
            {paused ? (
              <path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" />
            ) : (
              <path d="M4.5 3h2.2v10H4.5zM9.3 3h2.2v10H9.3z" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}

/*
 * Le texte du partenaire actif : les valeurs distinctes empilées dans la même
 * case, l'active en fondu enchaîné sur la précédente (.partner-swap).
 */
export function PartnerText({
  values,
  className = "",
}: {
  values: string[];
  className?: string;
}) {
  const current = values[usePartnerCycle().active];
  return (
    <span className={`inline-grid ${className}`}>
      {[...new Set(values)].map((value) => (
        <span
          key={value}
          data-active={value === current || undefined}
          className="partner-swap"
        >
          {value}
        </span>
      ))}
    </span>
  );
}

/** Remonte son contenu à chaque arrivée : ses animations rejouent une fois. */
export function OnPartnerChange({ children }: { children: ReactNode }) {
  return (
    <Fragment key={usePartnerCycle().arrival}>{children}</Fragment>
  );
}
