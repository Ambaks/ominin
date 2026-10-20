"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useCart } from "@/lib/menu/cart";
import {
  LOYALTY_GREETING_MS,
  nextReward,
  type GarlandMotif,
  type LoyaltyProgram,
} from "@/lib/menu/loyalty";
import { greetedKey, useLoyaltyMember } from "@/lib/menu/loyalty-member";
import { reducedMotion, useCountUp } from "./loyalty-card";
import { LoyaltyCardSheet } from "./loyalty-card-sheet";

/*
 * Accueil d'un téléphone reconnu. Au premier affichage de la carte dans
 * l'onglet, une carte de bienvenue descend du haut de l'écran — sceau du
 * restaurant qui se dessine, points qui défilent, palier suivant — puis se
 * replie en pastille de points dans le coin. La pastille reste : elle ouvre
 * « Ma carte » (loyalty-card-sheet). Un rechargement pendant le repas ne
 * rejoue pas l'accueil (sessionStorage), la pastille suffit.
 */

type Phase = "greeting" | "folding" | "pill";

/*
 * L'accueil a déjà eu lieu dans l'onglet (sessionStorage) ? Lu comme une
 * source externe : côté serveur, rien à saluer.
 */
const subscribeNothing = () => () => {};
function useGreeted(key: string): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => {
      try {
        return sessionStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => true
  );
}

function Seal({
  logo,
  icon,
  size,
  drawn,
}: {
  logo?: string;
  /** L'icône carrée de l'enseigne, posée pleine dans le sceau à la place du logo. */
  icon?: string;
  size: "lg" | "sm";
  /** Le cercle se trace et le logo s'ouvre : l'accueil seulement. */
  drawn?: boolean;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full bg-radial-[at_50%_65%] from-ember-2 to-ember-3 text-foreground ${size === "lg" ? "size-12 shadow-[0_0_24px_var(--glow-inner)]" : "size-6"}`}
    >
      {size === "lg" && (
        <svg viewBox="0 0 48 48" aria-hidden="true" className={`${drawn ? "loyalty-ring " : ""}absolute inset-0 size-full -rotate-90`}>
          <circle cx="24" cy="24" r="22.5" pathLength="1" fill="none" stroke="var(--ember-1)" strokeWidth="1.5" />
        </svg>
      )}
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- icône du dossier public
        <img
          src={icon}
          alt=""
          className={`${drawn ? "loyalty-seal-logo " : ""}absolute rounded-full object-cover ${size === "lg" ? "inset-[3px] size-[calc(100%-6px)]" : "inset-0 size-full"}`}
        />
      ) : (
        logo && (
          // eslint-disable-next-line @next/next/no-img-element -- logo SVG du dossier public, sans optimisation à faire
          <img
            src={logo}
            alt=""
            className={size === "lg" ? `${drawn ? "loyalty-seal-logo " : ""}size-7` : "size-3.5"}
          />
        )
      )}
    </span>
  );
}

function Progress({ program, points }: { program: LoyaltyProgram; points: number }) {
  const next = nextReward(program, points);
  if (!next) {
    return <span className="text-ember-1">Toutes les récompenses sont à portée</span>;
  }
  const missing = next.points - points;
  return (
    <span className="text-ember-1">
      Plus que {missing} {missing === 1 ? "point" : "points"} · {next.label}
    </span>
  );
}

export function LoyaltyWelcome({
  brand,
  logo,
  icon,
  wordmark,
  motif,
}: {
  brand: string;
  logo?: string;
  icon?: string;
  wordmark?: boolean;
  motif?: GarlandMotif;
}) {
  const { slug, loyalty } = useCart();
  const { member } = useLoyaltyMember();
  const points = member?.points ?? null;
  const known = loyalty != null && points !== null;

  const [progress, setProgress] = useState<"folding" | "pill" | null>(null);
  const [open, setOpen] = useState(false);
  const greetingRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const sessionKey = greetedKey(slug);
  const greeted = useGreeted(sessionKey);
  const phase: Phase | null = !known
    ? null
    : greeted || progress === "pill"
      ? "pill"
      : (progress ?? "greeting");
  const counted = useCountUp(points ?? 0, phase === "greeting");
  const fold = () => setProgress(reducedMotion() ? "pill" : "folding");
  // La barre des catégories collée en haut : la pastille s'y range, le rail
  // lui laisse la place (globals.css).
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    if (!known) return;
    const nav = document.querySelector("[data-category-nav]");
    if (!nav) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setDocked(nav.getBoundingClientRect().top <= 0)
      );
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [known]);

  useEffect(() => {
    if (phase !== "greeting") return;
    const timer = setTimeout(fold, LOYALTY_GREETING_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "pill") return;
    try {
      sessionStorage.setItem(sessionKey, "1");
    } catch {}
  }, [phase, sessionKey]);

  // La carte se replie vers la pastille : le trajet se mesure à l'écran.
  useLayoutEffect(() => {
    const greeting = greetingRef.current;
    const pill = pillRef.current;
    if (phase !== "folding" || !greeting || !pill) return;
    const from = greeting.getBoundingClientRect();
    const to = pill.getBoundingClientRect();
    greeting.style.setProperty("--fold-x", `${to.left + to.width / 2 - (from.left + from.width / 2)}px`);
    greeting.style.setProperty("--fold-y", `${to.top + to.height / 2 - (from.top + from.height / 2)}px`);
  }, [phase]);

  if (!loyalty || !member || points === null || phase === null) return null;
  const name = member.firstName;

  return (
    <>
      {(phase === "greeting" || phase === "folding") && (
        <button
          ref={greetingRef}
          type="button"
          data-phase={phase}
          onClick={() => {
            fold();
            setOpen(true);
          }}
          onAnimationEnd={(event) => {
            if (event.animationName === "loyalty-fold") setProgress("pill");
          }}
          className="loyalty-greeting fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-3xl border border-hairline bg-surface/85 py-3 pl-3 pr-4 text-left text-foreground shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <Seal logo={logo} icon={icon} size="lg" drawn />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-display text-lg leading-tight">
              {name ? `Bon retour, ${name}` : "Bon retour parmi nous"}
            </span>
            <span className="text-[13px] text-muted">
              <span className="font-semibold tabular-nums text-foreground">{counted}</span>{" "}
              {points === 1 ? "point" : "points"}
            </span>
            <span className="text-xs leading-snug">
              <Progress program={loyalty} points={points} />
            </span>
          </span>
          <svg viewBox="0 0 10 16" aria-hidden="true" className="h-4 w-2.5 shrink-0 text-faint">
            <path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {(phase === "folding" || phase === "pill") && (
        <button
          ref={pillRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={`Ma carte de fidélité : ${points} ${points === 1 ? "point" : "points"}`}
          onClick={() => setOpen(true)}
          data-docked={docked || undefined}
          className="loyalty-pill loyalty-pill-enter fixed right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-40 flex items-center gap-1.5 rounded-full border border-ember-1/45 bg-surface/85 py-1 pl-1 pr-3 text-sm font-semibold tabular-nums text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-lg data-docked:bg-background data-docked:shadow-none"
        >
          <Seal logo={logo} icon={icon} size="sm" />
          {points}
        </button>
      )}

      {open && (
        <LoyaltyCardSheet
          brand={brand}
          logo={logo}
          wordmark={wordmark}
          motif={motif}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
