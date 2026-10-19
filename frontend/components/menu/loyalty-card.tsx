"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import type { GarlandMotif, LoyaltyProgram } from "@/lib/menu/loyalty";

/*
 * La carte de fidélité dessinée (« Ma carte ») : la carte elle-même aux
 * couleurs du restaurant, la guirlande qui mène aux récompenses, et le dessin
 * de chaque récompense. Tout se joue à l'ouverture — motif du logo tracé,
 * reflet qui passe, points qui défilent, ampoules allumées une à une par
 * l'étincelle — puis tient en place. Mouvement réduit : l'état final, d'emblée.
 */

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Le solde qui défile jusqu'à sa valeur, après `delay` ms. */
export function useCountUp(target: number, run: boolean, delay = 500): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const k = reducedMotion() ? 1 : Math.min(1, Math.max(0, (now - start) / 1100));
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, run, delay]);
  return run ? shown : target;
}

/**
 * Le logo en grand, en filigrane : un SVG est inséré tel quel pour que ses
 * traits se dessinent ; une image (webp, png) s'ouvre seulement en fondu.
 * Le fichier vient du dossier public du restaurant, jamais d'un tiers.
 */
function LogoLattice({ logo }: { logo: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = logo.endsWith(".svg");
  useEffect(() => {
    const box = ref.current;
    if (!svg || !box) return;
    let cancelled = false;
    fetch(logo)
      .then((response) => response.text())
      .then((text) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const root = doc.documentElement;
        if (root.nodeName !== "svg") return;
        root.querySelectorAll("script, foreignObject").forEach((el) => el.remove());
        root.setAttribute("width", "100%");
        root.setAttribute("height", "100%");
        box.replaceChildren(document.importNode(root, true));
        if (reducedMotion()) return;
        box.querySelectorAll<SVGGeometryElement>("path, line, rect, circle, polyline, polygon, ellipse").forEach((el, i) => {
          const length = el.getTotalLength();
          el.animate(
            [{ strokeDasharray: `${length}`, strokeDashoffset: `${length}` }, { strokeDasharray: `${length}`, strokeDashoffset: "0" }],
            { duration: 1100, delay: 450 + i * 60, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "backwards" }
          );
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [logo, svg]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute -right-14 top-1/2 size-68 -translate-y-1/2 opacity-[0.16]"
    >
      {!svg && (
        // eslint-disable-next-line @next/next/no-img-element -- logo du dossier public
        <img src={logo} alt="" className="loyalty-card-logo size-full object-contain" />
      )}
    </div>
  );
}

export function LoyaltyCard({
  brand,
  logo,
  wordmark,
  name,
  since,
  points,
}: {
  brand: string;
  logo?: string;
  /** Le logo écrit déjà le nom : il tient lieu de nom, et ne sert pas de filigrane (il y serait coupé). */
  wordmark?: boolean;
  name: string | null;
  since: string | null;
  points: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [sheen, setSheen] = useState(0);
  const counted = useCountUp(points, true, 700);
  const sinceLabel = since
    ? new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(new Date(since))
    : null;

  // Le reflet suit le doigt ou la souris ; la carte s'incline avec.
  const tilt = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = ref.current;
    if (!card || event.pointerType === "touch" || reducedMotion()) return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    card.style.transform = `perspective(700px) rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 16).toFixed(2)}deg)`;
    card.style.setProperty("--sheen-x", `${(x * 90).toFixed(1)}%`);
  };
  const settle = () => {
    const card = ref.current;
    if (!card) return;
    card.style.transform = "";
    card.style.removeProperty("--sheen-x");
  };

  return (
    <div
      ref={ref}
      onPointerMove={tilt}
      onPointerLeave={settle}
      // Toucher la carte rejoue le reflet.
      onClick={() => setSheen((n) => n + 1)}
      className="loyalty-card relative aspect-[1.586] w-full overflow-hidden rounded-[20px] text-white"
    >
      <div className="loyalty-card-bg absolute inset-0" />
      <div className="loyalty-card-grain absolute inset-0" />
      {logo && !wordmark && <LogoLattice logo={logo} />}
      <div key={sheen} className="loyalty-card-sheen pointer-events-none absolute -inset-[40%]" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-center gap-2.5">
          {logo && wordmark ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo du dossier public
            <img src={logo} alt={brand} className="h-6 w-auto max-w-[60%] object-contain object-left" />
          ) : (
            <>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element -- logo du dossier public
                <img src={logo} alt="" className="size-6.5 object-contain" />
              )}
              <span className="font-display text-[22px] uppercase leading-none tracking-[0.14em]">
                {brand}
              </span>
            </>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-[0.2em] opacity-75">
            Carte fidélité
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-xl italic">{name ?? "Membre"}</p>
            {sinceLabel && (
              <p className="text-[11px] tracking-wide opacity-75">Membre depuis {sinceLabel}</p>
            )}
          </div>
          <p className="text-right leading-none">
            <span className="block font-display text-[46px] tabular-nums tracking-tight">{counted}</span>
            <span className="text-[11px] uppercase tracking-[0.18em] opacity-75">
              {points === 1 ? "point" : "points"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * La guirlande : un fil tendu entre deux poteaux, une lanterne de rotin à
 * chaque récompense, des ampoules entre elles — ou, en fanions, celle d'une
 * terrasse italienne : un grand fanion à chaque récompense, des petits entre
 * eux. Ce que le solde atteint s'allume, l'étincelle courant le long du fil
 * à l'ouverture.
 */

const GARLAND_BULBS = 20;
const LIGHT_START_MS = 600;
const LIGHT_RUN_MS = 1500;

/** Le fil : une parabole dont l'abscisse avance d'un pas régulier. */
const along = (t: number) => ({
  x: 3 + 340 * t,
  y: 6 * (1 - t) ** 2 + 184 * (1 - t) * t + 6 * t * t,
});

export function Garland({
  program,
  points,
  motif = "lanternes",
}: {
  program: LoyaltyProgram;
  points: number;
  motif?: GarlandMotif;
}) {
  const id = useId();
  const sparkRef = useRef<SVGCircleElement>(null);
  const max = program.rewards.at(-1)?.points ?? 0;
  const tAt = (value: number) => 0.025 + (0.95 * Math.min(value, max)) / max;
  const lightDelay = (value: number) =>
    LIGHT_START_MS + (LIGHT_RUN_MS * Math.min(value, points)) / Math.max(points, 1);

  useEffect(() => {
    const spark = sparkRef.current;
    if (!spark || !max || points <= 0 || reducedMotion()) return;
    let frame = 0;
    const start = performance.now() + LIGHT_START_MS;
    const end = tAt(points);
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - start) / LIGHT_RUN_MS));
      const p = along(tAt(0) + (end - tAt(0)) * k);
      spark.setAttribute("cx", p.x.toFixed(1));
      spark.setAttribute("cy", p.y.toFixed(1));
      spark.style.opacity = k > 0 && k < 1 ? "1" : "0";
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // tAt ne dépend que de max.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, max]);

  if (!max) return null;
  const lanterns = program.rewards.map((reward) => reward.points);
  const bulbs = Array.from({ length: GARLAND_BULBS }, (_, i) => (max * (i + 1)) / GARLAND_BULBS).filter(
    (value) => !lanterns.some((at) => Math.abs(at - value) < max / (GARLAND_BULBS * 2))
  );

  return (
    <svg
      viewBox="0 0 346 124"
      role="img"
      aria-label={`${points} points sur le chemin des récompenses : ${lanterns.join(", ")} points`}
      data-motif={motif}
      className="loyalty-garland block h-auto w-full overflow-visible"
    >
      <defs>
        <filter id={`${id}-glow`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-halo`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <path className="wire" d="M3 6 Q173 92 343 6" />
      {bulbs.map((value) => {
        const p = along(tAt(value));
        const on = value <= points;
        return (
          <g
            key={`b${value}`}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
            className={on ? "bulb on" : "bulb"}
            style={{ "--d": `${lightDelay(value)}ms` } as CSSProperties}
          >
            {motif === "fanions" ? (
              <path className="glass" d="M-4.5 0H4.5L0 10Z" />
            ) : (
              <>
                <line y2="5" />
                <circle className="glass" cy="9.5" r="3.8" filter={on ? `url(#${id}-glow)` : undefined} />
              </>
            )}
          </g>
        );
      })}
      {lanterns.map((value) => {
        const p = along(tAt(value));
        const on = value <= points;
        return (
          <g
            key={`l${value}`}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
            className={on ? "lantern on" : "lantern"}
            style={{ "--d": `${lightDelay(value)}ms` } as CSSProperties}
          >
            <g className="sway">
              {motif === "fanions" ? (
                <>
                  <circle className="halo" cy="14" r="18" filter={`url(#${id}-halo)`} />
                  <path className="shade" d="M-11 0H11L0 30Z" />
                  <path className="weave" d="M-7.5 5H7.5" />
                </>
              ) : (
                <g transform="scale(1.5)">
                  <line y2="9" />
                  <circle className="halo" cy="18" r="15" filter={`url(#${id}-halo)`} />
                  <path className="shade" d="M-8 25Q-8 9 0 9Q8 9 8 25Z" />
                  <path className="weave" d="M-6.6 14H6.6M-7.7 19H7.7M0 9V25M-4 9.9-4.7 25M4 9.9 4.7 25" />
                </g>
              )}
            </g>
            <text y={motif === "fanions" ? 46 : 52}>{value}</text>
          </g>
        );
      })}
      <circle ref={sparkRef} className="spark" r="4.5" cx="-20" cy="-20" filter={`url(#${id}-glow)`} />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Le dessin d'une récompense, choisi d'après son intitulé (le restaurant
 * l'écrit librement) ; un cadeau quand rien ne correspond.
 */

const CHICHA =
  "M23 57c-6 0-8-4-8-9 0-7 6-11 13-13h8c7 2 13 6 13 13 0 5-2 9-8 9z|M29 35V19M35 35V19|M22 19h20|M27 19l2-7h6l2 7|M37 29c9-1 16 1 16 9 0 6-4 9-9 8";
const DRAWINGS: { match: RegExp; lines: string; extra?: "steam" | "bubbles" | "smoke" }[] = [
  { match: /chicha.*(premium|adalya)/i, lines: `${CHICHA}|M32 40l4 4-4 4-4-4z|M19 51h26`, extra: "smoke" },
  { match: /chicha/i, lines: CHICHA, extra: "smoke" },
  // Une burrata sur son assiette, nouée en haut.
  { match: /antipast|burrata|entr[ée]e/i, lines: "M8 46c6 6 15 9 24 9s18-3 24-9|M8 46h48|M18 44c-1-11 5-19 14-19s15 8 14 19|M28 25l4-6 4 6|M26 18c2 1 4 1 6 0s4-1 6 0" },
  // Une part de pizza, croûte en haut, garnie de trois rondelles.
  { match: /pizz|pasta/i, lines: "M12 17c13-5 27-5 40 0|M14 22l18 36 18-36|M14 22c12-4 24-4 36 0|M27 31a3 3 0 1 0 0.1 0|M37 33a2.5 2.5 0 1 0 0.1 0|M31 43a2.5 2.5 0 1 0 0.1 0" },
  // Un cornet de deux boules.
  { match: /dessert|glace|gelat|tiramis/i, lines: "M21 33l11 25 11-25|M24 39h16|M27 46l5 5 5-5|M20 33a12 11 0 0 1 24 0z|M24 21a8 8 0 0 1 16 0" },
  { match: /smoothie|milkshake|cocktail|jus/i, lines: "M19 18h26l-4 37H23z|M20.5 30c4 2 8 2 11.5 0s7.5-2 11.5 0|M35 23l7-17h6|M41 18a7 7 0 0 1 14 0z", extra: "bubbles" },
  { match: /caf[ée]|th[ée]|soft|boisson/i, lines: "M15 29h30v8c0 8-6.5 13-15 13s-15-5-15-13z|M45 32c5 0 7.5 2.5 7.5 6s-3 6.5-8 6.5|M8 55c7 3 14 4 22 4s15-1 22-4", extra: "steam" },
];
const GIFT = "M12 28h40v26H12z|M8 20h48v8H8z|M32 20v34|M32 20c-4-8-14-10-14-3s10 3 14 3c4 0 14 4 14-3s-10-5-14 3";

export function RewardDrawing({ label, delay = 0 }: { label: string; delay?: number }) {
  const drawing = DRAWINGS.find((d) => d.match.test(label));
  const lines = (drawing?.lines ?? GIFT).split("|");
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="loyalty-drawing size-full overflow-visible">
      {lines.map((d, i) => (
        <path key={d} className="loyalty-draw" pathLength={1} d={d} style={{ "--d": `${delay + i * 70}ms` } as CSSProperties} />
      ))}
      {drawing?.extra === "steam" && (
        <>
          <path className="loyalty-waft" d="M25 24c-3-3-3-6 0-9s3-6 0-9" />
          <path className="loyalty-waft loyalty-waft-late" d="M34 24c-3-3-3-6 0-9s3-6 0-9" />
        </>
      )}
      {drawing?.extra === "smoke" && <path className="loyalty-waft" d="M32 10c-3-1.5-3-3.5 0-5s3-3.5 0-5" />}
      {drawing?.extra === "bubbles" && (
        <>
          <circle className="loyalty-bubble" cx="28" cy="42" r="1.6" />
          <circle className="loyalty-bubble loyalty-bubble-2" cx="35" cy="47" r="1.2" />
          <circle className="loyalty-bubble loyalty-bubble-3" cx="31" cy="37" r="1" />
        </>
      )}
    </svg>
  );
}
