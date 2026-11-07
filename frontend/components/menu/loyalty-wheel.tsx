"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useCart } from "@/lib/menu/cart";
import { nextReward, type GarlandMotif } from "@/lib/menu/loyalty";
import { useLoyaltyMember, type WheelWin } from "@/lib/menu/loyalty-member";
import type { WheelSlice } from "@/lib/menu/wheel";
import { WHEEL_VOUCHER_DAYS } from "@/lib/menu/wheel-config";
import type { LiquidOrigin } from "./liquid-sheet";
import { reducedMotion, useCountUp } from "./loyalty-card";
import { Sheet } from "./sheet";
import { UntilTomorrow } from "./until-tomorrow";
import { burst, spinPath, type Piece, type WinTier } from "./wheel-motion";
import { useWheelSound } from "./wheel-sound";
import "./loyalty-wheel.css";

/*
 * La roue du jour, sur un tapis de casino (loyalty-welcome l'ouvre). La
 * feuille prend toute sa hauteur : la roue, grande, au milieu ; au gain, elle
 * recule (une échelle, rien à remettre en page) et le résultat se glisse
 * dessous, sans à-coup. Au repos, les
 * ampoules défilent, la roue se balance, l'aiguille frémit, le bouton luit ;
 * un toucher sur le bouton ou un geste sur la roue la lance. Elle recule dès
 * le toucher, pendant que la part se tire — wheel.spin crédite ses points —
 * puis accélère, fait six tours, freine longuement, dépasse — parfois jusque
 * dans la part voisine — et revient. L'aiguille claque sur chaque taquet, au
 * son (plus aigu à pleine vitesse) et sous le doigt ; au ralenti, le dernier
 * taquet la traîne avant de la lâcher. Puis le gain, en temps détachés :
 * éclair, bond et son, la part qui s'allume, la roue qui recule, le chiffre ;
 * pièces et fanions à la mesure du lot, le gros lot a son bandeau. Enfin ce
 * qui fait revenir : les tours joués, la roue dorée au bout, le compte à rebours.
 * Mouvement réduit : la roue posée sur la part, d'emblée, sans son.
 */

type Phase = "ready" | "spinning" | "won";

const RADIUS = 100;

/** Point du cercle de rayon `radius` à `degrees` (sens horaire, depuis le haut). */
function polar(degrees: number, radius = RADIUS): string {
  const t = (degrees * Math.PI) / 180;
  return `${(radius * Math.sin(t)).toFixed(2)} ${(-radius * Math.cos(t)).toFixed(2)}`;
}

function slicePath(index: number, step: number): string {
  const from = index * step - step / 2;
  return `M0 0L${polar(from)}A${RADIUS} ${RADIUS} 0 0 1 ${polar(from + step)}Z`;
}

/** Taille d'un nom couché sur le rayon, pour tenir dans `room` unités. */
function fitText(text: string, room: number): number {
  return Math.min(18, Math.max(9, room / (text.length * 0.62)));
}

function Flame({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M8.2 1C9 3.6 12.5 5 12.5 9.2A4.5 4.5 0 0 1 3.5 9.6c0-1.9 1-3.1 2.1-4 .1 1.3.7 2.2 1.6 2.6C6.9 5.6 7.3 3 8.2 1z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Le chemin vers la roue dorée — des fanions sur leur fil quand c'est le
 * motif de la maison : les tours joués, celui-ci (à jouer, ou joué et le
 * suivant qui attend), la roue dorée au bout.
 */
function GoldenTrack({
  every,
  played,
  won,
  multiplier,
  motif,
}: {
  every: number;
  played: number;
  won: boolean;
  multiplier: number;
  motif?: GarlandMotif;
}) {
  return (
    <ol className="wheel-streak flex items-start justify-between gap-1" data-motif={motif} aria-hidden="true">
      {Array.from({ length: every }, (_, i) => {
        const turn = i + 1;
        const golden = turn === every;
        return (
          <li
            key={turn}
            data-done={turn <= played || undefined}
            data-today={(!won && turn === played + 1) || undefined}
            data-next={(won && turn === played + 1) || undefined}
            data-golden={golden || undefined}
            className="wheel-streak-day relative grid size-8 place-items-center rounded-full text-[11px] font-bold tabular-nums"
          >
            {golden ? (
              <span className="flex flex-col items-center leading-none">
                <span className="text-[8px]">{turn}e</span>×{multiplier}
              </span>
            ) : turn <= played ? (
              "✓"
            ) : (
              turn
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Le gain sous la roue, et le solde qui le reçoit. Remonté à chaque tour (key). */
function Gain({
  gained,
  before,
  label,
  near,
  detail,
  jackpot,
}: {
  gained: number;
  before: number;
  label: string;
  /** « Le jackpot était juste à côté » : la part voisine était le gros lot. */
  near: boolean;
  detail: string;
  /** Le gros lot se montre plus longtemps avant le résultat, et défile plus longtemps. */
  jackpot: boolean;
}) {
  // Le compte part avec le bond du chiffre (la scène tenue, 650 ms ; 1,1 s
  // pour le gros lot, voir --reveal), pas avant : il se lit en entier.
  const counted = useCountUp(gained, true, jackpot ? 1250 : 800, jackpot ? 1700 : 1100);
  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className="wheel-won-amount text-5xl font-extrabold leading-none tabular-nums"
        data-done={counted === gained || undefined}
      >
        +{counted}
      </p>
      <p className="wheel-kicker text-[11px] font-bold uppercase tracking-[0.3em]">{label}</p>
      {near && <p className="wheel-won-line wheel-strong text-xs font-semibold">Le jackpot était juste à côté&nbsp;!</p>}
      <p className="wheel-won-line wheel-muted mt-1 text-sm">
        Solde&nbsp;: {before} → <span className="wheel-strong font-semibold tabular-nums">{before + counted}</span> points
        <br />
        <span className="wheel-strong font-semibold">{detail}</span>
      </p>
    </div>
  );
}

const voucherDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** Le lot gagné sous la roue : sa photo, son nom, comment l'avoir, jusqu'à quand. */
function Prize({ label, image, fromMenu, until }: { label: string; image?: string; fromMenu: boolean; until: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- photo du lot, choisie par le gérant
        <img src={image} alt="" className="wheel-prize-photo mb-1 size-14 rounded-full object-cover" />
      )}
      <p className="wheel-won-amount font-display text-4xl font-extrabold leading-none" data-done>
        {label} offert
      </p>
      <p className="wheel-kicker text-[11px] font-bold uppercase tracking-[0.3em]">bon de la roue</p>
      <p className="wheel-won-line wheel-muted mt-1 text-sm">
        {fromMenu ? "À ajouter à votre prochaine commande" : "Remis avec votre prochaine commande"}
        <br />
        <span className="wheel-strong font-semibold">D’ici le {until}</span>
      </p>
    </div>
  );
}

export function LoyaltyWheel({
  brand,
  address,
  icon,
  logo,
  motif,
  origin,
  onClose,
  onShowCard,
}: {
  /** L'organisateur, dans le règlement. */
  brand: string;
  address: string;
  icon?: string;
  logo?: string;
  motif?: GarlandMotif;
  /** La pastille d'où la feuille naît, quand elle l'a ouverte. */
  origin?: LiquidOrigin | null;
  onClose: () => void;
  /** « Ma carte », après la fermeture de la roue. */
  onShowCard: () => void;
}) {
  const { loyalty } = useCart();
  const { member, wheel } = useLoyaltyMember();
  const titleId = useId();
  const sound = useWheelSound();
  // Solde et tours joués au lancer : le contexte les change dès le tirage.
  const [launch, setLaunch] = useState<{ points: number; turns: number } | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const rulesButtonRef = useRef<HTMLButtonElement>(null);
  const rulesCloseRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [won, setWon] = useState<WheelWin | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  // Les tours de l'onglet (rejouer en aperçu) : chacun remonte le gain.
  const [spins, setSpins] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);
  const swayRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<SVGSVGElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Fermée en plein tour : la roue s'arrête là, rien ne sonne plus.
  useEffect(() => {
    const dial = dialRef.current;
    const pending = timers.current;
    return () => {
      cancelAnimationFrame(frame.current);
      pending.forEach(clearTimeout);
      dial?.getAnimations().forEach((animation) => animation.cancel());
    };
  }, []);

  useEffect(() => {
    if (phase === "won") continueRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (rulesOpen) rulesCloseRef.current?.focus({ preventScroll: true });
  }, [rulesOpen]);

  if (!loyalty || !wheel || !member) return null;
  const { slices, golden } = wheel;
  const before = launch?.points ?? member.points ?? 0;
  const turnsBefore = launch?.turns ?? wheel.spins;
  const gained = won?.points ?? 0;
  const step = 360 / slices.length;
  // Les gains en points ; un lot se fête comme le gros lot.
  const ranked = [...new Set(slices.filter((slice) => !slice.prize).map((slice) => slice.points))].sort(
    (a, b) => a - b
  );
  const top = ranked.at(-1)!;
  const tierOf = ({ points, prize }: WheelSlice): WinTier =>
    prize || points === top ? "jackpot" : ranked.indexOf(points) < ranked.length / 2 ? "small" : "mid";
  const prizes = slices.filter((slice) => slice.prize);
  // Ce tour est le combientième de la carte, et s'il est doré.
  const turn = turnsBefore + 1;
  const every = golden?.every ?? 0;
  const multiplier = golden && turn % golden.every === 0 ? golden.multiplier : 1;
  const goldenTurn = multiplier > 1;
  // Sa place sur le chemin de la roue dorée, une fois joué.
  const position = every === 0 ? 0 : ((turn - 1) % every) + 1;
  const tier = won ? tierOf(slices[won.index]) : null;
  const jackpot = tier === "jackpot";
  // Le bon gagné : son lot, et jusqu'à quand.
  const prize = won?.voucher
    ? {
        label: won.voucher.label,
        image: slices[won.index].prize?.image,
        fromMenu: Boolean(slices[won.index].prize?.itemId),
        until: voucherDay.format(new Date(won.voucher.expiresAt)),
      }
    : null;
  // Prochaine roue dorée, en tours depuis celui-ci (une fois la dorée jouée, la suivante).
  const toGolden = every === 0 ? 0 : goldenTurn && won ? every : Math.ceil(turn / every) * every - turn;
  const name = member.firstName;
  const shown = (points: number) => points * multiplier;
  const minOrder = `${wheel.minOrder.toLocaleString("fr-FR")} €`;
  // Des points sur plusieurs cases : leur chance est la somme de leurs poids.
  const totalWeight = slices.reduce((sum, slice) => sum + slice.weight, 0);
  const chanceOf = (matches: (slice: WheelSlice) => boolean) =>
    `${((slices.filter(matches).reduce((sum, slice) => sum + slice.weight, 0) / totalWeight) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
  const odds = [
    ...ranked.map((points) => ({
      lot: `+${points} ${points === 1 ? "point" : "points"}`,
      chance: chanceOf((slice) => !slice.prize && slice.points === points),
    })),
    ...prizes.map((slice) => ({ lot: slice.prize!.label, chance: chanceOf((candidate) => candidate === slice) })),
  ];
  const later = (callback: () => void, ms: number) => {
    timers.current.push(setTimeout(callback, ms));
  };

  // Courts : trois boutons partagent la ligne, un kicker plus long y passait à la ligne.
  const kicker = goldenTurn ? `★ Roue dorée ×${multiplier} ★` : won ? "★ Tour gagné ★" : "★ La roue du jour ★";
  const title = !won
    ? name
      ? `À vous, ${name}`
      : "À vous de jouer"
    : jackpot && !prize
      ? `Jackpot${name ? `, ${name}` : ""} !`
      : `Bravo${name ? `, ${name}` : ""} !`;

  /*
   * L'aiguille suit les taquets — un entre deux cases, au passage de chaque
   * bord sous elle ; l'angle se calcule depuis le temps de l'animation et
   * ses courbes. Vite, elle claque (moins fort à pleine vitesse, maintenue
   * contre les taquets) ; au ralenti, le taquet qui arrive la pousse, puis
   * la lâche. Le son ne suit pas les images : chaque claquement des 60 ms à
   * venir se calcule et se programme sur l'horloge audio, régulier même
   * quand une image saute.
   */
  const followTicks = (animation: Animation, duration: number, angleAt: (progress: number) => number, sway: number) => {
    const pointer = pointerRef.current;
    // Les bords des cases tombent à un demi-pas des multiples du pas.
    const pegAt = (angle: number) => Math.floor((angle - step / 2) / step);
    let previous = angleAt(0) + sway;
    let previousTime = 0;
    let edge = pegAt(previous);
    let speed = 0;
    let kick: Animation | null = null;
    let lastBuzz = 0;
    let heard = edge;
    let scanned = 0;
    const tick = (time: number) => {
      const now = Number(animation.currentTime ?? 0);
      for (let at = Math.max(now, scanned); at <= Math.min(duration, now + 60); at += 2) {
        const crossing = pegAt(angleAt(at / duration) + sway);
        if (crossing !== heard) {
          heard = crossing;
          const pace = Math.abs(angleAt(Math.min(1, (at + 8) / duration)) - angleAt(at / duration)) / 8;
          sound.tick(pace, (at - now) / 1000);
        }
        scanned = at + 2;
      }
      const progress = Math.min(1, now / duration);
      const angle = angleAt(progress) + sway;
      if (previousTime) speed = speed * 0.7 + (Math.abs(angle - previous) / (time - previousTime)) * 0.3;
      previous = angle;
      previousTime = time;
      const crossed = pegAt(angle);
      if (crossed !== edge && pointer) {
        edge = crossed;
        const lean = speed > 0.7 ? -12 : speed < 0.3 ? -24 : -24 + ((speed - 0.3) / 0.4) * 12;
        const from = pointer.style.transform || "rotate(0deg)";
        kick?.cancel();
        pointer.style.removeProperty("transform");
        kick = pointer.animate(
          [{ transform: from }, { transform: `rotate(${lean}deg)`, offset: 0.2 }, { transform: "rotate(3deg)", offset: 0.7 }, { transform: "rotate(0deg)" }],
          { duration: speed < 0.12 ? 220 : 140, easing: "ease-out" }
        );
        if (time - lastBuzz > 70) {
          navigator.vibrate?.(6);
          lastBuzz = time;
        }
      } else if (pointer && speed < 0.12 && kick?.playState !== "running") {
        const into = angle - step / 2;
        const approach = (((into % step) + step) % step) / step;
        pointer.style.transform = `rotate(${(-22 * Math.max(0, (approach - 0.55) / 0.45)).toFixed(2)}deg)`;
      }
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else pointer?.style.removeProperty("transform");
    };
    frame.current = requestAnimationFrame(tick);
  };

  const land = (result: WheelWin) => {
    cancelAnimationFrame(frame.current);
    setWon(result);
    setSpins((count) => count + 1);
    setPhase("won");
    if (reducedMotion()) return;
    const winTier = tierOf(slices[result.index]);
    sound.win(winTier);
    navigator.vibrate?.(winTier === "jackpot" ? [30, 50, 30, 50, 80] : winTier === "mid" ? [20, 40, 30] : [15]);
    setPieces(burst(winTier));
    // Retombées, les pièces s'en vont : plus rien à animer.
    later(() => setPieces([]), 3200);
  };

  const spin = async () => {
    const dial = dialRef.current;
    if (!dial || phase !== "ready") return;
    sound.whoosh();
    setLaunch({ points: member.points ?? 0, turns: wheel.spins });
    setPhase("spinning");
    const still = reducedMotion();
    // Le recul part dès le toucher — l'aiguille se tend avec — : le tirage
    // peut prendre son temps.
    const windup = still
      ? null
      : dial.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-24deg)" }], {
          duration: 640,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        });
    const tension = still
      ? null
      : pointerRef.current?.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-12deg)" }], {
          duration: 640,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        });
    let result: WheelWin;
    try {
      result = await wheel.spin();
    } catch {
      windup?.cancel();
      tension?.cancel();
      setLaunch(null);
      setPhase("ready");
      return;
    }
    // Le balancement se fige où il en est : la roue le compense pour finir sous l'aiguille.
    const sway = swayRef.current
      ? (() => {
          const { a, b } = new DOMMatrixReadOnly(getComputedStyle(swayRef.current).transform);
          return (Math.atan2(b, a) * 180) / Math.PI;
        })()
      : 0;
    // Un tour sur six et demi environ frôle la part voisine — d'un côté ou de
    // l'autre — et y hésite : l'arrêt se place assez près du bord pour que le
    // dépassement la franchisse vraiment.
    const tease = Math.random() < 0.15;
    const side = Math.random() < 0.5 ? 1 : -1;
    // Pas pile au milieu de la part : une roue qui tombe toujours au centre sonne faux.
    const offset = tease ? side * (0.1 + Math.random() * 0.28) : (Math.random() - 0.5) * 0.76;
    const target = 360 * 6 - result.index * step + offset * step - sway;
    if (still) {
      dial.style.transform = `rotate(${target}deg)`;
      land(result);
      return;
    }
    await windup?.finished.catch(() => {});
    if (!dialRef.current) return;
    const { keyframes, angleAt } = spinPath(-24, target, step, tease ? side : 0);
    const duration = 5800;
    const animation = dial.animate(keyframes, { duration, fill: "forwards" });
    windup?.cancel();
    tension?.cancel();
    followTicks(animation, duration, angleAt, sway);
    // Un souffle, la roue arrêtée, avant que le gain ne s'allume.
    animation.finished.then(
      () => later(() => land(result), 140),
      () => {}
    );
  };

  // Aperçu : le tour du jour s'annule (avec goldenTurn, les tours d'avant
  // mènent à la roue dorée, pour la montrer) et la roue se repose.
  const replay = (goldenTurn?: boolean) => {
    wheel.replay?.(goldenTurn);
    dialRef.current?.getAnimations().forEach((animation) => animation.cancel());
    dialRef.current?.style.removeProperty("transform");
    setLaunch(null);
    setWon(null);
    setPieces([]);
    setPhase("ready");
  };

  const after = before + gained;
  const unlocked = loyalty.rewards.filter((reward) => reward.points > before && reward.points <= after);
  const next = nextReward(loyalty, after);
  const goal = nextReward(loyalty, before);
  // La part voisine de la gagnante était le gros lot : ça se dit.
  const near =
    won !== null &&
    !jackpot &&
    [-1, 1].some((side) => {
      const neighbour = slices[(won.index + side + slices.length) % slices.length];
      return !neighbour.prize && neighbour.points === top;
    });

  // Le gain le long du rayon, du centre vers le bord, comme sur une roue de
  // casino : une case étroite ne tient pas un chiffre posé à plat. Un lot en
  // photo la porte ronde au bord, sans son nom, debout quand sa case passe
  // sous l'aiguille ; sans photo, son nom, à la taille de la case.
  const renderSlice = (i: number) => {
    const { points, prize } = slices[i];
    const gilded = !prize && (points === top || (goldenTurn && i % 2 === 1));
    const tone = prize ? "wheel-slice-voucher" : gilded ? "wheel-slice-gold" : `wheel-slice-${i % 2 ? "b" : "a"}`;
    const label = prize ? prize.label : `+${shown(points)}`;
    return (
      <g key={i} data-slice={i} data-tone={i % 6} className={`wheel-slice ${tone}`}>
        <path d={slicePath(i, step)} fill={gilded ? `url(#${titleId}-gold)` : undefined} />
        <g transform={`rotate(${i * step - 90})`}>
          {prize?.image ? (
            <g transform="translate(79 0) rotate(90)">
              <image
                href={prize.image}
                x="-11"
                y="-11"
                width="22"
                height="22"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${titleId}-photo)`}
              />
              <circle r="11.6" className="wheel-photo-ring" />
            </g>
          ) : (
            <text
              x="86"
              textAnchor="end"
              dominantBaseline="central"
              fontSize={fitText(label, 58)}
              className="font-extrabold"
            >
              {label}
            </text>
          )}
        </g>
      </g>
    );
  };

  return (
    <Sheet onClosed={onClose} backdropCloses={phase !== "spinning"} labelledBy={titleId} origin={origin}>
      {(close) => (
        <div
          className="wheel-stage relative flex min-h-(--sheet-max) shrink-0 flex-col gap-3.5 overflow-hidden px-5 pb-6 pt-5"
          data-phase={phase}
          data-tier={tier ?? undefined}
          data-jackpot={jackpot || undefined}
          data-golden={goldenTurn || undefined}
        >
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="wheel-kicker text-[11px] font-bold uppercase tracking-[0.26em]">{kicker}</p>
              <h3 id={titleId} className="truncate font-display text-2xl font-medium leading-tight">
                {title}
              </h3>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                ref={rulesButtonRef}
                type="button"
                onClick={() => setRulesOpen(true)}
                aria-label="Règlement et chances"
                aria-expanded={rulesOpen}
                className="wheel-icon-button grid size-9 place-items-center rounded-full"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                  <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                onClick={sound.toggle}
                aria-pressed={sound.on}
                aria-label="Son"
                className="wheel-icon-button grid size-9 place-items-center rounded-full"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
                  <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
                  {sound.on ? (
                    <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.8a6 6 0 0 1 0 8.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  ) : (
                    <path d="M10.5 6l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  )}
                </svg>
              </button>
              <button
                type="button"
                onClick={close}
                aria-label="Fermer"
                className="wheel-icon-button grid size-9 place-items-center rounded-full text-lg"
              >
                ×
              </button>
            </div>
          </div>

          {golden && (
            <div className="relative z-10 flex flex-col gap-2">
              <p className="flex items-center justify-between gap-3 text-xs">
                {won || turnsBefore % every > 0 ? (
                  <span className="wheel-flame inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold tabular-nums">
                    <Flame className="size-3.5" />
                    {won ? position : turnsBefore % every} {(won ? position : turnsBefore % every) === 1 ? "tour" : "tours"} sur {every}
                  </span>
                ) : (
                  <span className="wheel-muted font-semibold">Roue dorée au {every}e tour</span>
                )}
                {goldenTurn && (
                  <span className="wheel-gold-chip rounded-full px-2.5 py-1 font-bold">
                    {won ? "Roue dorée jouée" : `Ce tour : roue dorée ×${multiplier}`}
                  </span>
                )}
              </p>
              <GoldenTrack
                every={every}
                played={won ? position : turnsBefore % every}
                won={won !== null}
                multiplier={golden.multiplier}
                motif={motif}
              />
            </div>
          )}

          <div
            className="grid min-h-[12.5rem] flex-1 touch-none place-items-center pt-4"
            onPointerDown={(event) => {
              swipeFrom.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerCancel={() => {
              swipeFrom.current = null;
            }}
            onPointerUp={(event) => {
              // Un geste sur la roue la lance, comme on la pousserait de la main.
              const from = swipeFrom.current;
              swipeFrom.current = null;
              if (from && Math.hypot(event.clientX - from.x, event.clientY - from.y) > 24) void spin();
            }}
          >
            <div className="loyalty-wheel relative aspect-square w-[min(46vw,11.5rem)]" data-motif={motif}>
              {jackpot && <span aria-hidden="true" className="wheel-rays absolute inset-[-28%] rounded-full" />}
              <span aria-hidden="true" className="wheel-shadow absolute inset-[3%] rounded-full" />
              <div ref={swayRef} className="wheel-sway absolute inset-0">
                <div ref={dialRef} className="absolute inset-0">
                  <svg
                    viewBox="-110 -110 220 220"
                    role="img"
                    aria-label={`Roue de ${slices.length} cases : ${ranked.map((points) => `+${shown(points)}`).join(", ")} points${prizes.map((slice) => `, ${slice.prize!.label.toLowerCase()} offert`).join("")}`}
                    className="size-full overflow-visible"
                  >
                    <defs>
                      <radialGradient id={`${titleId}-gold`} cx="50%" cy="15%" r="95%">
                        <stop offset="0" stopColor="#fff6cf" />
                        <stop offset="0.45" stopColor="#ecc867" />
                        <stop offset="1" stopColor="#b8862b" />
                      </radialGradient>
                      <clipPath id={`${titleId}-photo`} clipPathUnits="objectBoundingBox">
                        <circle cx="0.5" cy="0.5" r="0.5" />
                      </clipPath>
                    </defs>
                    {slices.map((_, i) => renderSlice(i))}
                    {slices.map((_, i) => {
                      const [x, y] = polar(i * step + step / 2, 95).split(" ");
                      return <circle key={i} cx={x} cy={y} r={2.2} className="wheel-peg" />;
                    })}
                  </svg>
                  {/*
                    Au gain, un voile sur toute la roue et, par-dessus, la part
                    gagnante redessinée seule : elle grossit, son cercle d'or
                    pulse — opacités et transformations, la roue ne se repeint pas.
                  */}
                  {won && (
                    <>
                      <span aria-hidden="true" className="wheel-dim absolute inset-[4.5%] rounded-full" />
                      <span aria-hidden="true" className="wheel-lit absolute inset-0">
                        <svg viewBox="-110 -110 220 220" className="size-full overflow-visible">
                          {renderSlice(won.index)}
                        </svg>
                      </span>
                      <span aria-hidden="true" className="wheel-lit-outline absolute inset-0">
                        <svg viewBox="-110 -110 220 220" className="size-full overflow-visible">
                          <path d={slicePath(won.index, step)} className="wheel-won-outline" />
                        </svg>
                      </span>
                    </>
                  )}
                </div>
                <span aria-hidden="true" className="wheel-wash absolute inset-[4%] rounded-full" />
              </div>
              <svg viewBox="-110 -110 220 220" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <circle r="105" className="wheel-rim" />
                <circle r="102" pathLength="96" className="wheel-checker" />
                <circle r="109.5" className="wheel-rim-edge" />
                <circle r="100.5" className="wheel-rim-edge" />
              </svg>
              {/* Les ampoules en éléments à part : leur lumière est une opacité, composée sans repeindre la roue. */}
              <span aria-hidden="true" className="wheel-bulbs pointer-events-none absolute inset-0">
                {Array.from({ length: 24 }, (_, i) => (
                  <i key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </span>
              <span className="wheel-hub absolute left-1/2 top-1/2 grid size-[23%] -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element -- icône du dossier public
                  <img src={icon} alt="" className="size-full rounded-full object-cover" />
                ) : (
                  logo && (
                    // eslint-disable-next-line @next/next/no-img-element -- logo du dossier public
                    <img src={logo} alt="" className="size-3/5 object-contain" />
                  )
                )}
              </span>
              <svg
                ref={pointerRef}
                viewBox="0 0 24 34"
                aria-hidden="true"
                className="wheel-pointer absolute left-1/2 top-[-9%] w-[12%] -translate-x-1/2 overflow-visible"
              >
                <path d="M12 33L2.5 12.5a10 10 0 1 1 19 0z" className="wheel-pointer-shadow" />
                <path d="M12 31L2.5 10.5a10 10 0 1 1 19 0z" />
                <circle cx="12" cy="9.5" r="3.6" />
              </svg>
              {won && <span key={spins} aria-hidden="true" className="wheel-ring absolute inset-0 rounded-full" />}
              {jackpot && (
                <p className="wheel-jackpot pointer-events-none absolute inset-x-[-8%] bottom-[10%] py-1.5 text-center font-display text-3xl font-semibold uppercase italic">
                  {prize ? `${prize.label} offert` : "Jackpot"}&nbsp;!
                </p>
              )}
              {pieces.map((piece, i) => (
                <i
                  key={i}
                  aria-hidden="true"
                  className={`wheel-piece wheel-piece-${piece.kind}`}
                  style={
                    {
                      "--x": `${piece.x}px`,
                      "--rise": `${piece.rise}px`,
                      "--turn": `${piece.turn}deg`,
                      "--d": `${piece.delay}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          </div>
          {won && <span key={spins} aria-hidden="true" className="wheel-flash pointer-events-none absolute inset-0" />}

          <p role="status" className="sr-only">
            {prize
              ? `${prize.label} offert : un bon à utiliser avec une commande d’ici le ${prize.until}. Prochain tour dès demain, avec une commande.`
              : won
              ? `${gained} points gagnés. Votre solde : ${after} points.${unlocked.length > 0 ? ` Débloqué : ${unlocked.at(-1)!.label}.` : ""} Prochain tour dès demain, avec une commande.`
              : phase === "spinning"
                ? "La roue tourne…"
                : ""}
          </p>

          {/*
            La place du résultat est tenue dès l'ouverture : avant le tour, la
            roue grandie y descend et le bouton en occupe le bas ; au gain, la
            roue remonte à sa taille et le résultat glisse à sa place. Rien que
            des transformations, rien à remettre en page.
          */}
          <div className="wheel-zone relative h-[20rem] shrink-0">
            <div className="wheel-launch-pane absolute inset-x-0 bottom-0" inert={won !== null}>
              <div className="flex flex-col items-center gap-2.5 pb-2 text-center">
                <span className="wheel-launch-glow relative rounded-full">
                  <button
                    type="button"
                    onClick={() => void spin()}
                    aria-disabled={phase !== "ready"}
                    className="wheel-launch relative min-h-14 overflow-hidden rounded-full px-10 text-base font-bold uppercase tracking-[0.14em] aria-disabled:cursor-default"
                  >
                    {phase === "spinning" ? "Bonne chance…" : "Lancer la roue"}
                  </button>
                </span>
                <p className="wheel-soft text-[12.5px] leading-relaxed">
                  Vos points&nbsp;: <span className="wheel-strong font-semibold tabular-nums">{before}</span>
                  {goal && (
                    <>
                      {" · "}
                      {goal.label} à <span className="wheel-strong font-semibold">{goal.points}</span>
                    </>
                  )}
                  <br />
                  Offert par votre commande · jusqu’à <span className="wheel-strong font-semibold">+{shown(top)}</span>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      onShowCard();
                      close();
                    }}
                    className="underline underline-offset-4"
                  >
                    Ma carte
                  </button>
                </p>
              </div>
            </div>
            <div className="wheel-result-pane absolute inset-x-0 top-0" inert={won === null}>
              {won && (
                <div className="wheel-result flex w-full flex-col items-center gap-2 text-center">
                  {prize ? (
                    <Prize key={spins} label={prize.label} image={prize.image} fromMenu={prize.fromMenu} until={prize.until} />
                  ) : (
                  <Gain
                    key={spins}
                    gained={gained}
                    before={before}
                    near={near}
                    jackpot={jackpot}
                    label={
                      goldenTurn
                        ? `points · roue dorée ×${multiplier}`
                        : jackpot
                          ? "points · gros lot"
                          : golden
                            ? `points · tour ${position} sur ${every}`
                            : "points gagnés"
                    }
                    detail={
                      unlocked.length > 0
                        ? `Débloqué : ${unlocked.at(-1)!.label}`
                        : next
                          ? `Encore ${next.points - after} ${next.points - after === 1 ? "point" : "points"} : ${next.label}`
                          : "Toutes les récompenses sont à portée"
                    }
                  />
                  )}
                  <div className="wheel-won-line wheel-tomorrow flex w-full flex-col items-center gap-1 rounded-2xl px-4 py-2.5" aria-hidden="true">
                    <p className="wheel-kicker text-[10px] font-bold uppercase tracking-[0.24em]">
                      Prochain tour dès demain · jusqu’à +
                      {golden && toGolden === 1 ? top * golden.multiplier : top}
                    </p>
                    <UntilTomorrow className="wheel-countdown text-3xl font-extrabold leading-none tabular-nums" />
                    {golden && (
                      <span className="wheel-gold-chip mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                        {toGolden === 1 ? "Au prochain tour" : `Dans ${toGolden} tours`} : roue dorée, jusqu’à +
                        {top * golden.multiplier}
                      </span>
                    )}
                    <p className="wheel-soft text-[11px]">Un tour par jour, avec une commande dès {minOrder}.</p>
                  </div>
                  <button
                    ref={continueRef}
                    type="button"
                    onClick={close}
                    className="wheel-won-line wheel-continue min-h-12 rounded-full px-10 text-sm font-bold uppercase tracking-[0.12em]"
                  >
                    Voir le menu
                  </button>
                  {wheel.replay && (
                    <p className="wheel-muted flex gap-3 text-[11px]">
                      <span>Aperçu&nbsp;:</span>
                      <button type="button" onClick={() => replay()} className="underline underline-offset-4">
                        rejouer
                      </button>
                      {golden && !goldenTurn && (
                        <button type="button" onClick={() => replay(true)} className="underline underline-offset-4">
                          voir la roue dorée
                        </button>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {rulesOpen && (
            <section
              aria-labelledby={`${titleId}-rules`}
              className="wheel-rules absolute inset-0 z-30 flex flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 text-sm leading-relaxed"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 id={`${titleId}-rules`} className="font-display text-2xl font-medium leading-tight">
                  Règlement et chances
                </h4>
                <button
                  ref={rulesCloseRef}
                  type="button"
                  onClick={() => {
                    setRulesOpen(false);
                    rulesButtonRef.current?.focus({ preventScroll: true });
                  }}
                  aria-label="Retour à la roue"
                  className="wheel-icon-button grid size-9 shrink-0 place-items-center rounded-full text-lg"
                >
                  ×
                </button>
              </div>
              <div>
                <p className="wheel-soft">
                  Chaque tour tire une case au hasard. Des points présents sur plusieurs cases les réunissent toutes
                  dans leur chance&nbsp;:
                </p>
                <table className="mt-2 w-full tabular-nums">
                  <caption className="sr-only">Les lots de la roue et leurs chances</caption>
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Lot</th>
                      <th scope="col">Chance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {odds.map(({ lot, chance }, i) => (
                      <tr key={i} className="wheel-rules-row">
                        <th scope="row" className="py-1 text-left font-semibold">
                          {lot}
                        </th>
                        <td className="wheel-strong py-1 text-right font-semibold">{chance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prizes.length > 0 && (
                  <p className="wheel-soft mt-2">
                    Un lot gagné donne un bon valable {WHEEL_VOUCHER_DAYS}&nbsp;jours, à utiliser avec une commande qui
                    compte un article à régler&nbsp;: l’article de la carte s’y ajoute offert, un autre lot est remis
                    par l’équipe avec la commande.
                  </p>
                )}
                {golden && (
                  <p className="wheel-soft mt-2">
                    Le {golden.every}e tour de votre carte, puis tous les {golden.every}, est la roue dorée&nbsp;: ses
                    points sont multipliés par {golden.multiplier}, un bon reste un bon.
                  </p>
                )}
              </div>
              <ul className="wheel-soft flex list-disc flex-col gap-2 pl-5">
                <li>
                  Organisateur&nbsp;: {brand}, {address}.
                </li>
                <li>
                  Qui joue&nbsp;: les membres de la carte de fidélité de {brand}, depuis le téléphone que leur carte
                  reconnaît.
                </li>
                <li>
                  Un tour par jour et par carte, ouvert par une commande réglée le jour même d’au moins {minOrder}, hors
                  pourboire et articles offerts. Une commande annulée reprend son tour et ses points.
                </li>
                <li>
                  Les points gagnés vont sur la carte dès l’arrêt de la roue, et s’échangent contre ses
                  récompenses&nbsp;:{" "}
                  {loyalty.rewards.map((reward) => `${reward.label} (${reward.points} points)`).join(", ")}. Ils
                  n’ont pas de valeur en argent et ne se remboursent pas.
                </li>
                <li>Le tirage se fait au lancer, sur le serveur de la carte&nbsp;; la roue montre ensuite la part tirée.</li>
                <li>Ce règlement est remis gratuitement à qui le demande à {brand}.</li>
              </ul>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
