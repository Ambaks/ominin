"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useCart } from "@/lib/menu/cart";
import { nextReward, type GarlandMotif } from "@/lib/menu/loyalty";
import { useLoyaltyMember } from "@/lib/menu/loyalty-member";
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
 * qui fait revenir : la série, la roue dorée au bout, le compte à rebours.
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
 * Le cycle de la série — des fanions sur leur fil quand c'est le motif de la
 * maison : les jours joués, aujourd'hui (à jouer, ou joué et demain qui
 * attend), la roue dorée au bout.
 */
function StreakTrack({
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
        const day = i + 1;
        const golden = day === every;
        return (
          <li
            key={day}
            data-done={day <= played || undefined}
            data-today={(!won && day === played + 1) || undefined}
            data-next={(won && day === played + 1) || undefined}
            data-golden={golden || undefined}
            className="wheel-streak-day relative grid size-8 place-items-center rounded-full text-[11px] font-bold tabular-nums"
          >
            {golden ? `×${multiplier}` : day <= played ? "✓" : `J${day}`}
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
  detail,
  slow,
}: {
  gained: number;
  before: number;
  label: string;
  detail: string;
  /** Le gros lot défile plus longtemps. */
  slow: boolean;
}) {
  const counted = useCountUp(gained, true, 450, slow ? 1400 : 900);
  return (
    <div className="flex flex-col items-center gap-1">
      <p
        className="wheel-won-amount text-5xl font-extrabold leading-none tabular-nums"
        data-done={counted === gained || undefined}
      >
        +{counted}
      </p>
      <p className="wheel-kicker text-[11px] font-bold uppercase tracking-[0.3em]">{label}</p>
      <p className="wheel-won-line wheel-muted mt-1 text-sm">
        Solde&nbsp;: {before} → <span className="wheel-strong font-semibold tabular-nums">{before + counted}</span> points
        <br />
        <span className="wheel-strong font-semibold">{detail}</span>
      </p>
    </div>
  );
}

export function LoyaltyWheel({
  icon,
  logo,
  motif,
  onClose,
  onShowCard,
}: {
  icon?: string;
  logo?: string;
  motif?: GarlandMotif;
  onClose: () => void;
  /** « Ma carte », après la fermeture de la roue. */
  onShowCard: () => void;
}) {
  const { loyalty } = useCart();
  const { member, wheel } = useLoyaltyMember();
  const titleId = useId();
  const sound = useWheelSound();
  // Solde et série au lancer : le contexte les change dès le tirage.
  const [launch, setLaunch] = useState<{ points: number; streak: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [won, setWon] = useState<{ index: number; points: number } | null>(null);
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

  if (!loyalty || !wheel || !member) return null;
  const { slices, golden } = wheel;
  const before = launch?.points ?? member.points ?? 0;
  const streakBefore = launch?.streak ?? wheel.streak;
  const gained = won?.points ?? 0;
  const step = 360 / slices.length;
  const ranked = [...new Set(slices.map((slice) => slice.points))].sort((a, b) => a - b);
  const top = ranked.at(-1)!;
  const tierOf = (points: number): WinTier =>
    points === top ? "jackpot" : ranked.indexOf(points) < ranked.length / 2 ? "small" : "mid";
  // Le jour que ce tour compte dans la série, et s'il est doré.
  const day = streakBefore + 1;
  const every = golden?.every ?? 0;
  const multiplier = golden && day % golden.every === 0 ? golden.multiplier : 1;
  const goldenToday = multiplier > 1;
  const tier = won ? tierOf(slices[won.index].points) : null;
  const jackpot = tier === "jackpot";
  // Prochaine roue dorée, en jours depuis aujourd'hui (une fois celle du jour jouée, la suivante).
  const toGolden = every === 0 ? 0 : goldenToday && won ? every : Math.ceil(day / every) * every - day;
  const name = member.firstName;
  const shown = (points: number) => points * multiplier;
  const later = (callback: () => void, ms: number) => {
    timers.current.push(setTimeout(callback, ms));
  };

  const kicker = goldenToday
    ? `★ Roue dorée · points ×${multiplier} ★`
    : won
      ? "★ Tour du jour gagné ★"
      : "★ La roue du jour ★";
  const title = !won
    ? name
      ? `À vous, ${name}`
      : "À vous de jouer"
    : jackpot
      ? `Jackpot${name ? `, ${name}` : ""} !`
      : `Bravo${name ? `, ${name}` : ""} !`;

  /*
   * L'aiguille suit les taquets — un par demi-part, au passage d'un multiple
   * du pas sous elle ; l'angle se calcule depuis le temps de l'animation et
   * ses courbes. Vite, elle claque (moins fort à pleine vitesse, maintenue
   * contre les taquets) ; au ralenti, le taquet qui arrive la pousse, puis
   * la lâche.
   */
  const followTicks = (animation: Animation, duration: number, angleAt: (progress: number) => number, sway: number) => {
    const pointer = pointerRef.current;
    const pitch = step / 2;
    let previous = angleAt(0) + sway;
    let previousTime = 0;
    let edge = Math.floor(previous / pitch);
    let speed = 0;
    let kick: Animation | null = null;
    let lastBuzz = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, Number(animation.currentTime ?? 0) / duration);
      const angle = angleAt(progress) + sway;
      if (previousTime) speed = speed * 0.7 + (Math.abs(angle - previous) / (time - previousTime)) * 0.3;
      previous = angle;
      previousTime = time;
      const crossed = Math.floor(angle / pitch);
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
        sound.tick(time, speed);
        if (time - lastBuzz > 70) {
          navigator.vibrate?.(6);
          lastBuzz = time;
        }
      } else if (pointer && speed < 0.12 && kick?.playState !== "running") {
        const approach = (((angle % pitch) + pitch) % pitch) / pitch;
        pointer.style.transform = `rotate(${(-22 * Math.max(0, (approach - 0.55) / 0.45)).toFixed(2)}deg)`;
      }
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else pointer?.style.removeProperty("transform");
    };
    frame.current = requestAnimationFrame(tick);
  };

  const land = (result: { index: number; points: number }) => {
    cancelAnimationFrame(frame.current);
    setWon(result);
    setSpins((count) => count + 1);
    setPhase("won");
    if (reducedMotion()) return;
    const winTier = tierOf(slices[result.index].points);
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
    setLaunch({ points: member.points ?? 0, streak: wheel.streak });
    setPhase("spinning");
    const still = reducedMotion();
    // Le recul part dès le toucher : le tirage peut prendre son temps.
    const windup = still
      ? null
      : dial.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-24deg)" }], {
          duration: 640,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "forwards",
        });
    let result: { index: number; points: number };
    try {
      result = await wheel.spin();
    } catch {
      windup?.cancel();
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
    // Pas pile au milieu de la part : une roue qui tombe toujours au centre sonne faux.
    const target = 360 * 6 - result.index * step + (Math.random() - 0.5) * step * 0.76 - sway;
    if (still) {
      dial.style.transform = `rotate(${target}deg)`;
      land(result);
      return;
    }
    await windup?.finished.catch(() => {});
    if (!dialRef.current) return;
    // Un tour sur six et demi environ dépasse franchement dans la part voisine, et y hésite.
    const { keyframes, angleAt } = spinPath(-24, target, step, Math.random() < 0.15);
    const duration = 5800;
    const animation = dial.animate(keyframes, { duration, fill: "forwards" });
    windup?.cancel();
    followTicks(animation, duration, angleAt, sway);
    // Un souffle, la roue arrêtée, avant que le gain ne s'allume.
    animation.finished.then(
      () => later(() => land(result), 140),
      () => {}
    );
  };

  // Aperçu : le tour du jour s'annule (avec goldenDay, la série d'avant passe
  // au jour qui précède la roue dorée, pour la montrer) et la roue se repose.
  const replay = (goldenDay?: boolean) => {
    wheel.replay?.(goldenDay);
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

  return (
    <Sheet onClosed={onClose} backdropCloses={phase !== "spinning"} labelledBy={titleId}>
      {(close) => (
        <div
          className="wheel-stage relative flex min-h-(--sheet-max) shrink-0 flex-col gap-3.5 overflow-hidden px-5 pb-6 pt-5"
          data-phase={phase}
          data-tier={tier ?? undefined}
          data-jackpot={jackpot || undefined}
          data-golden={goldenToday || undefined}
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
                {won || streakBefore > 0 ? (
                  <span className="wheel-flame inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold tabular-nums">
                    <Flame className="size-3.5" />
                    {won ? day : streakBefore} {(won ? day : streakBefore) === 1 ? "jour" : "jours"} d’affilée
                  </span>
                ) : (
                  <span className="wheel-muted font-semibold">Votre série commence aujourd’hui</span>
                )}
                <span className="wheel-gold-chip rounded-full px-2.5 py-1 font-bold">
                  {goldenToday
                    ? won
                      ? "Roue dorée jouée"
                      : `Aujourd’hui : roue dorée ×${multiplier}`
                    : `×${golden.multiplier} · roue dorée ${toGolden === 1 ? "demain" : `dans ${toGolden} j`}`}
                </span>
              </p>
              <StreakTrack
                every={every}
                played={won ? ((day - 1) % every) + 1 : streakBefore % every}
                won={won !== null}
                multiplier={golden.multiplier}
                motif={motif}
              />
            </div>
          )}

          <div
            className="grid min-h-0 flex-1 touch-none place-items-center pt-4"
            onPointerDown={(event) => {
              swipeFrom.current = { x: event.clientX, y: event.clientY };
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
                    aria-label={`Roue : ${slices.map((slice) => `+${shown(slice.points)}`).join(", ")} points`}
                    className="size-full overflow-visible"
                  >
                    <defs>
                      <radialGradient id={`${titleId}-gold`} cx="50%" cy="15%" r="95%">
                        <stop offset="0" stopColor="#fff6cf" />
                        <stop offset="0.45" stopColor="#ecc867" />
                        <stop offset="1" stopColor="#b8862b" />
                      </radialGradient>
                    </defs>
                    {slices.map((slice, i) => {
                      const big = slice.points === top;
                      const gilded = big || (goldenToday && i % 2 === 1);
                      return (
                        <g
                          key={i}
                          data-lit={won?.index === i || undefined}
                          className={`wheel-slice ${gilded ? "wheel-slice-gold" : `wheel-slice-${i % 2 ? "b" : "a"}`}`}
                        >
                          <path d={slicePath(i, step)} fill={gilded ? `url(#${titleId}-gold)` : undefined} />
                          <g transform={`rotate(${i * step})`}>
                            {big && (
                              <text y="-79" textAnchor="middle" className="text-[8px] font-bold uppercase tracking-[0.2em]">
                                Jackpot
                              </text>
                            )}
                            <text y="-50" textAnchor="middle" className="text-[28px] font-bold">
                              +{shown(slice.points)}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                    {won && <path d={slicePath(won.index, step)} className="wheel-won-outline" />}
                    {Array.from({ length: slices.length * 2 }, (_, i) => {
                      const [x, y] = polar(i * (step / 2) + step / 2, 95).split(" ");
                      return <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 2.4} className="wheel-peg" />;
                    })}
                  </svg>
                </div>
                <span aria-hidden="true" className="wheel-wash absolute inset-[4%] rounded-full" />
              </div>
              <svg viewBox="-110 -110 220 220" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <circle r="105" className="wheel-rim" />
                <circle r="102" pathLength="96" className="wheel-checker" />
                <circle r="109.5" className="wheel-rim-edge" />
                <circle r="100.5" className="wheel-rim-edge" />
                {Array.from({ length: 24 }, (_, i) => {
                  const [x, y] = polar(i * 15, 106).split(" ");
                  return <circle key={i} cx={x} cy={y} r="2.9" className="wheel-bulb" style={{ "--i": i } as CSSProperties} />;
                })}
              </svg>
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
              {jackpot && <span aria-hidden="true" className="wheel-ring absolute inset-0 rounded-full" />}
              {jackpot && (
                <p className="wheel-jackpot pointer-events-none absolute inset-x-[-8%] bottom-[10%] py-1.5 text-center font-display text-3xl font-semibold uppercase italic">
                  Jackpot&nbsp;!
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
            {won
              ? `${gained} points gagnés. Votre solde : ${after} points.${unlocked.length > 0 ? ` Débloqué : ${unlocked.at(-1)!.label}.` : ""} Prochain tour demain.`
              : phase === "spinning"
                ? "La roue tourne…"
                : ""}
          </p>

          {/* Le bouton se replie, le résultat se déplie : la roue recule d'autant, sans saut. */}
          <div className="wheel-fold" data-open={won === null || undefined} inert={won !== null}>
            <div>
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
                <p className="wheel-muted text-xs">
                  Vos points&nbsp;: <span className="wheel-strong font-semibold tabular-nums">{before}</span>
                  {goal && (
                    <>
                      {" · "}
                      {goal.label} à <span className="wheel-strong font-semibold">{goal.points}</span>
                    </>
                  )}
                  <br />
                  Un tour offert chaque jour · jusqu’à <span className="wheel-strong font-semibold">+{shown(top)}</span>
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
          </div>
          <div className="wheel-fold" data-open={won !== null || undefined}>
            <div>
              {won && (
                <div className="wheel-result flex w-full flex-col items-center gap-2 text-center">
                  <Gain
                    key={spins}
                    gained={gained}
                    before={before}
                    slow={jackpot}
                    label={
                      goldenToday
                        ? `points · roue dorée ×${multiplier}`
                        : jackpot
                          ? "points · gros lot"
                          : golden
                            ? `points · série de ${day} jours`
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
                  <div className="wheel-won-line wheel-tomorrow flex w-full flex-col items-center gap-1 rounded-2xl px-4 py-2.5" aria-hidden="true">
                    <p className="wheel-kicker text-[10px] font-bold uppercase tracking-[0.24em]">
                      Prochain tour{golden ? ` · jour ${day + 1}` : ""} · jusqu’à +
                      {golden && toGolden === 1 ? top * golden.multiplier : top}
                    </p>
                    <UntilTomorrow className="wheel-countdown text-3xl font-extrabold leading-none tabular-nums" />
                    {golden && (
                      <>
                        <span className="wheel-gold-chip mt-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                          {toGolden === 1 ? "Demain" : `Dans ${toGolden} jours`} : roue dorée, jusqu’à +
                          {top * golden.multiplier}
                        </span>
                        <p className="wheel-soft text-[11px]">Un jour manqué, et la série repart à zéro.</p>
                      </>
                    )}
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
                      {golden && !goldenToday && (
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
        </div>
      )}
    </Sheet>
  );
}
