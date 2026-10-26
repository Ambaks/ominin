import type { Saison, SaisonSpot, SaisonSpots } from "@/lib/menu/saison";
import "./saison.css";

/*
 * L'habillage de saison du menu QR, posé par l'admin (jamais le gérant) :
 * « automne » fait tomber les feuilles et réchauffe les lanternes,
 * « halloween » y ajoute la nuit, la lune, les chauves-souris, les toiles, une
 * araignée, des fantômes et un chat noir. Quatre calques : SaisonPoster sur
 * l'affiche (aux repères mesurés de l'établissement, Restaurant.saisonSpots),
 * SaisonFrame sur le cadre du hero (coins, sol, ses propres feuilles), et
 * SaisonAmbient fixé à l'écran : les feuilles derrière la carte, les
 * personnages devant. Tout est en SVG et en CSS (transform, opacity) : rien
 * n'intercepte le doigt, rien ne décale la mise en page, et sans mouvement
 * (prefers-reduced-motion) le décor reste posé, immobile (saison.css).
 */

/* Les chauves-souris quittent la lune : trois points de vol en % de
   l'affiche, comptés depuis la lune, une taille, une durée et un départ
   propres ; `still` : l'instant (s) où elles restent posées sans mouvement. */
const BATS: { from: number[]; via: number[]; to: number[]; size: number; dur: number; delay: number; still?: number }[] = [
  { from: [-2, 2.5], via: [-20, -1.5], to: [-64, -16.5], size: 12, dur: 9, delay: 0, still: 3.6 },
  { from: [1, 4.5], via: [11, -3.5], to: [32, -12.5], size: 9, dur: 10.4, delay: 0.5 },
  { from: [-3, 6.5], via: [-28, 7.5], to: [-80, 15.5], size: 14, dur: 10, delay: 1.1, still: 2.2 },
  { from: [4, 5.5], via: [-10, 15.5], to: [-42, 33.5], size: 8, dur: 11.5, delay: 1.6 },
  { from: [0, 1.5], via: [-11, -6.5], to: [-32, -18.5], size: 7, dur: 8.2, delay: 2.4 },
];

/** La sorcière entre plus bas que la lune, passe devant elle, ressort plus bas encore. */
const BROOM = { rise: 3, top: -1, fall: 12 };

/* Les feuilles : position (% de la colonne ou du cadre), taille (px), chute,
   balancement et culbute (s), départ (s, négatif : déjà en l'air à
   l'ouverture), forme, teinte. Trois vitesses de chute, trois balancements. */
const LEAVES = [
  { x: 4, size: 30, fall: 15, sway: 4.4, tumble: 6, delay: -3, shape: 0, tint: 0 },
  { x: 92, size: 26, fall: 19, sway: 5.6, tumble: 8, delay: -11, shape: 1, tint: 4 },
  { x: 47, size: 22, fall: 11, sway: 3.2, tumble: 4.5, delay: -7, shape: 2, tint: 7 },
  { x: 24, size: 34, fall: 19, sway: 5.6, tumble: 7, delay: -15, shape: 0, tint: 2 },
  { x: 72, size: 28, fall: 15, sway: 4.4, tumble: 5.5, delay: -1, shape: 1, tint: 5 },
  { x: 13, size: 24, fall: 11, sway: 3.2, tumble: 5, delay: -9, shape: 2, tint: 6 },
  { x: 60, size: 32, fall: 19, sway: 5.6, tumble: 9, delay: -5, shape: 0, tint: 3 },
  { x: 84, size: 22, fall: 15, sway: 3.2, tumble: 4, delay: -13, shape: 2, tint: 1 },
  { x: 36, size: 26, fall: 11, sway: 4.4, tumble: 6.5, delay: -2, shape: 1, tint: 0 },
];
const FRAME_LEAVES = [
  { x: 14, size: 26, fall: 12, sway: 4.4, tumble: 5, delay: -4, shape: 0, tint: 2 },
  { x: 80, size: 30, fall: 16, sway: 5.6, tumble: 7, delay: -10, shape: 1, tint: 5 },
  { x: 56, size: 22, fall: 10, sway: 3.2, tumble: 4.5, delay: -1, shape: 2, tint: 7 },
  { x: 33, size: 28, fall: 14, sway: 4.4, tumble: 6, delay: -8, shape: 0, tint: 0 },
];
/** Halloween : moins de feuilles, la scène a d'autres personnages. */
const HALLOWEEN_LEAVES = 5;
const HALLOWEEN_FRAME_LEAVES = 3;

/* Le limbe, sa moitié à l'ombre de la nervure. */
const LEAF_TINTS = [
  ["#a63d1e", "#7f2c15"],
  ["#c47a2a", "#97591b"],
  ["#c9601f", "#9a4415"],
  ["#7c2a1a", "#5a1d12"],
  ["#9b7b2b", "#73591c"],
  ["#b0672b", "#86491c"],
  ["#8a4a20", "#653515"],
  ["#c4992f", "#97731f"],
];

/* Érable, chêne, bouleau : la nervure au milieu de chaque boîte. */
const LEAF_SHAPES = [
  {
    box: "0 0 48 52",
    blade: "M24 41 20 35 6 37l6-6-9-4 7-3-6-10 10 3 1-8 5 5 4-10 4 10 5-5 1 8 10-3-6 10 7 3-9 4 6 6-14-2Z",
    veins: "M24 50V8M24 34 9 26M24 34l15-8M24 29l-10-13M24 29l10-13",
  },
  {
    box: "0 0 30 56",
    blade:
      "M15 54c-1-4-1-6-2-8-4 1-7-1-6-4-4 0-5-4-2-6-4-1-4-6 0-7-3-3-2-7 2-7-2-4 0-8 3-7-1-5 2-9 5-12 3 3 6 7 5 12 3-1 5 3 3 7 4 0 5 4 2 7 4 1 4 6 0 7 3 2 2 6-2 6 1 3-2 5-6 4-1 2-1 4-2 8Z",
    veins: "M15 54V5M15 40 7 36M15 40l8-4M15 30 7 26M15 30l8-4M15 21l-5-4M15 21l5-4",
  },
  {
    box: "0 0 36 46",
    blade: "M18 44c0-3 0-5-1-6C9 37 3 30 3 22 3 13 9 5 18 2c9 3 15 11 15 20 0 8-6 15-14 16-1 1-1 3-1 6Z",
    veins: "M18 44V5M18 30 8 24M18 30l10-6M18 22 9 15M18 22l9-7M18 14l-6-5M18 14l6-5",
  },
];

type LeafSpec = (typeof LEAVES)[number];

function Leaf({ leaf, id, reverse }: { leaf: LeafSpec; id: string; reverse: boolean }) {
  const { x, size, fall, sway, tumble, delay, shape, tint } = leaf;
  const { box, blade, veins } = LEAF_SHAPES[shape];
  const [face, shade] = LEAF_TINTS[tint];
  return (
    <div
      className="saison-leaf"
      style={{
        left: `${x}%`,
        width: size,
        animationDuration: `${fall}s, ${sway}s`,
        animationDelay: `${delay}s, ${delay / 2}s`,
      }}
    >
      <svg
        viewBox={box}
        className="saison-leaf-tumble"
        style={{ animationDuration: `${tumble}s`, animationDirection: reverse ? "reverse" : undefined }}
        aria-hidden
      >
        <defs>
          <linearGradient id={id}>
            <stop offset=".46" stopColor={face} />
            <stop offset=".54" stopColor={shade} />
          </linearGradient>
        </defs>
        <path d={blade} fill={`url(#${id})`} />
        <path d={veins} fill="none" stroke="#3a170c" strokeOpacity=".5" strokeWidth=".9" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function spotStyle({ x, y, size, delay }: SaisonSpot, period?: number) {
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}%`,
    animationDuration: period ? `${period}s` : undefined,
    animationDelay: delay ? `${-delay}s` : undefined,
  } as React.CSSProperties;
}

/* Chaque lumière vacille à son rythme : jamais deux lampes ensemble. */
const FLICKER = [1.9, 2.3, 2.7, 3.1];
const flicker = (i: number) => FLICKER[i % FLICKER.length];

/* Pseudo-aléatoire déterministe : la même toile au serveur et au client. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Une toile d'angle : des rayons partis du coin, des fils qui les relient en
 * pendant légèrement vers le centre, quelques gouttes de rosée.
 */
function web(size: number, seed: number) {
  const next = random(seed);
  const spokes = 8;
  const rings = 6;
  const angles = Array.from({ length: spokes }, (_, i) => {
    const edge = i === 0 || i === spokes - 1;
    return (i / (spokes - 1)) * (Math.PI / 2) + (edge ? 0 : (next() - 0.5) * 0.14);
  });
  const lengths = angles.map((_, i) =>
    size * (i === 0 || i === spokes - 1 ? 1 : 0.8 + next() * 0.18)
  );
  const radii = Array.from({ length: rings }, (_, k) =>
    angles.map((_, i) => Math.min(size * (0.15 + k * 0.135) * (0.95 + next() * 0.1), lengths[i]))
  );
  const at = (angle: number, distance: number) =>
    `${(Math.cos(angle) * distance).toFixed(1)} ${(Math.sin(angle) * distance).toFixed(1)}`;

  const spokePath = angles.map((a, i) => `M0 0L${at(a, lengths[i])}`).join("");
  const ringPath = radii
    .map((ring) =>
      ring
        .slice(0, -1)
        .map((d, i) => {
          const mid = (angles[i] + angles[i + 1]) / 2;
          const sag = ((d + ring[i + 1]) / 2) * (0.84 + next() * 0.05);
          return `${i === 0 ? `M${at(angles[i], d)}` : ""}Q${at(mid, sag)} ${at(angles[i + 1], ring[i + 1])}`;
        })
        .join("")
    )
    .join("");
  const drops = [
    [2, 3],
    [4, 5],
    [3, 2],
    [5, 4],
  ].map(([k, i]) => at(angles[i], radii[k][i]).split(" ").map(Number));
  return { spokePath, ringPath, drops };
}

/** `mirror` : la toile part du coin droit. */
function CornerWeb({ size, seed, mirror, className }: { size: number; seed: number; mirror?: boolean; className: string }) {
  const { spokePath, ringPath, drops } = web(size, seed);
  return (
    <svg className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <g transform={mirror ? `matrix(-1 0 0 1 ${size} 0)` : undefined}>
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <path d={spokePath} strokeWidth="0.9" />
          <path d={ringPath} strokeWidth="0.6" />
        </g>
        {drops.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" className="saison-dew" style={{ animationDelay: `${i * -1.3}s` }} />
        ))}
      </g>
    </svg>
  );
}

const BAT_WING =
  "M29 13C22 6 12 4 2 9C6 10 8 13 8 16.5C11 14.5 14 15.5 15 18.5C18 15.5 22 16.5 23 19.5C25 17.5 27 18 29 20Z";

/* Les silhouettes sur le ciel ont un liseré froid : le même tracé, peint en
   trait clair sous l'aplat, sans filtre ni ligne aux recouvrements. */
const BAT_BODY =
  "M27.8 17a4.2 6.2 0 1 0 8.4 0 4.2 6.2 0 1 0-8.4 0ZM28.3 10.6a3.7 3.7 0 1 0 7.4 0 3.7 3.7 0 1 0-7.4 0ZM29.3 9.2 28.6 3.8l2.9 3.6ZM34.7 9.2l.7-5.4-2.9 3.6Z";

function BatShape() {
  return (
    <>
      <path className="saison-wing" d={BAT_WING} />
      <g transform="matrix(-1 0 0 1 64 0)">
        <path className="saison-wing" d={BAT_WING} />
      </g>
      <path d={BAT_BODY} />
    </>
  );
}

function Bat() {
  return (
    <svg viewBox="0 0 64 32" aria-hidden>
      <g className="saison-rim" strokeWidth="2">
        <BatShape />
      </g>
      <BatShape />
      <circle cx="30.6" cy="10.8" r=".8" className="saison-bat-eye" />
      <circle cx="33.4" cy="10.8" r=".8" className="saison-bat-eye" />
    </svg>
  );
}

const BROOMSTICK = "M8 36 118 47";
const WITCH =
  "M114 45c10 0 18-4 26-6-6 8-4 14-2 22-8-6-16-8-26-9ZM68 33c8-4 20-4 30-12-4 9-10 15-22 19ZM58 42c-4-8-6-16-6-22 0-5 4-8 9-6 7 3 10 13 11 27Zm1-2-8 9h-7l-1 2h10l9-8ZM57 24 45 35l-2 3 3 1 13-10ZM47 11a5 5 0 1 0 10 0 5 5 0 1 0-10 0ZM40 8.5 66 5l.3 2.4L40.6 11ZM45 8c1-6 4-10 9-13 4-2 8-2 12-6-1 5-5 8-9 10-2 2-3 5-3 8Zm11 4c5 1 9 6 15 6-5 2-10 0-14-3Z";

/** La sorcière sur son balai, de profil vers la gauche : une silhouette qui passe devant la lune. */
function Witch() {
  return (
    <svg viewBox="0 -14 140 84" aria-hidden>
      <g className="saison-rim" strokeWidth="2.2">
        <path d={BROOMSTICK} strokeWidth="5" strokeLinecap="round" />
        <path d={WITCH} />
      </g>
      <path d={BROOMSTICK} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d={WITCH} />
    </svg>
  );
}

function Moon({ spot }: { spot: SaisonSpot }) {
  return (
    <div className="saison-moon" style={spotStyle(spot)} aria-hidden>
      <svg viewBox="0 0 100 100">
        <defs>
          <radialGradient id="saison-moon-face" cx="42%" cy="38%" r="62%">
            <stop offset="0" stopColor="#fffaf0" />
            <stop offset=".65" stopColor="#f6e4bd" />
            <stop offset="1" stopColor="#e7c58c" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#saison-moon-face)" />
        <g fill="#c9a46c" opacity=".35">
          <circle cx="36" cy="40" r="9" />
          <circle cx="62" cy="30" r="5" />
          <circle cx="60" cy="62" r="11" />
          <circle cx="34" cy="68" r="5" />
          <circle cx="74" cy="48" r="3.5" />
        </g>
      </svg>
      <span className="saison-moon-cloud" />
      <span className="saison-moon-cloud saison-moon-cloud--late" />
    </div>
  );
}

/** Le visage d'une citrouille, découpé : le nez est le losange du BOHO. */
const LANTERN_FACE =
  "M8 14 19 4l5 14ZM52 14 41 4l-5 14ZM30 15l4 5-4 5-4-5ZM4 26c6 9 15 14 26 14s20-5 26-14l-6 2-3 5-5-4-4 5-4-4-4 4-4-5-4 4-5-5-3-5Z";

function LanternFace() {
  return (
    <svg viewBox="0 0 60 44" aria-hidden>
      <path d={LANTERN_FACE} />
    </svg>
  );
}

/* Cinq côtes, des extérieures aux centrales : chacune recouvre la précédente. */
const PUMPKIN_RIBS = [
  [16, 13, 18],
  [48, 13, 18],
  [24, 13, 20],
  [40, 13, 20],
  [32, 12, 21],
];

function Pumpkin({ side, glow }: { side: "left" | "right"; glow?: number }) {
  const id = `saison-pumpkin-${side}`;
  return (
    <div className={`saison-pumpkin saison-pumpkin--${side}`} aria-hidden>
      <span className="saison-pumpkin-glow" style={glow ? { animationDelay: `${-glow}s` } : undefined} />
      <svg viewBox="0 0 64 62">
        <defs>
          <radialGradient id={id} cx="42%" cy="38%" r="72%">
            <stop offset="0" stopColor="#d98a48" />
            <stop offset=".55" stopColor="#b6612c" />
            <stop offset="1" stopColor="#6e3418" />
          </radialGradient>
          <radialGradient id={`${id}-ground`}>
            <stop offset="0" stopColor="#0d0609" stopOpacity=".7" />
            <stop offset="1" stopColor="#0d0609" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="57" rx="31" ry="4.5" fill={`url(#${id}-ground)`} />
        <g fill={`url(#${id})`} stroke="#5a2a12" strokeWidth=".9">
          {PUMPKIN_RIBS.map(([cx, rx, ry]) => (
            <ellipse key={cx} cx={cx} cy={36} rx={rx} ry={ry} />
          ))}
        </g>
        <g fill="none" stroke="#f0b27a" strokeOpacity=".22" strokeWidth="1.1" strokeLinecap="round">
          <path d="M27 19c-3 6-3 26 0 34M37 19c3 6 3 26 0 34" />
        </g>
        <path d="M30 17c0-6 2-10 6-12l2 2.4c-3 1.6-4 4.6-4 9.6Z" fill="#4b3a1c" />
        <path d="M36 6c4-3 9-2 10 2" fill="none" stroke="#5b6b2a" strokeWidth="1.2" strokeLinecap="round" />
        <g transform="translate(13.4 24.6) scale(.62)">
          <path d={LANTERN_FACE} fill="#3a1407" />
        </g>
        <g transform="translate(13 24) scale(.62)">
          <path d={LANTERN_FACE} fill="#ffc463" />
        </g>
      </svg>
    </div>
  );
}

function Spider({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden>
      <div className="saison-spider-line">
        <span className="saison-thread" />
        <svg viewBox="0 0 40 40" className="saison-spider-body">
          <g className="saison-spider-legs" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M16 16 8 9 4 14M16 19 6 16 2 22M16 22 7 24 4 31M17 25l-6 6-1 7" />
            <path d="m24 16 8-7 4 5M24 19l10-3 4 6M24 22l9 2 3 7M23 25l6 6 1 7" />
          </g>
          <g fill="currentColor" stroke="#e5b072" strokeOpacity=".5" strokeWidth=".8">
            <ellipse cx="20" cy="27" rx="6.5" ry="7.5" />
            <circle cx="20" cy="17" r="4.6" />
          </g>
          <circle cx="18.4" cy="16.4" r=".9" className="saison-spider-eye" />
          <circle cx="21.6" cy="16.4" r=".9" className="saison-spider-eye" />
          </svg>
      </div>
    </div>
  );
}

/* Un drap qui flotte : la tête, le corps qui s'effile en une traîne
   recourbée, deux manches de brume. */
const GHOST_SHEET =
  "M40 6C26 6 17 17 17 33c0 15 2 27 7 39 5 12 14 20 22 27 4 3 10 7 16 6-6-3-9-8-9-14 4 3 9 3 12 0-6-4-7-11-5-21 2-12 3-24 3-37C63 17 54 6 40 6Z";
const GHOST_SLEEVES =
  "M19 42c-7 2-11 8-13 14 5-3 10-4 15-4ZM61 42c7 1 11 6 13 11-5-2-9-3-14-2Z";

function Ghost({ side }: { side: "left" | "right" }) {
  const id = `saison-ghost-${side}`;
  return (
    <div className={`saison-ghost saison-ghost--${side}`} aria-hidden>
      <div className="saison-ghost-drift">
        <svg viewBox="0 0 80 112">
          <defs>
            <radialGradient id={`${id}-halo`}>
              <stop offset="0" stopColor="#efe6ff" stopOpacity=".35" />
              <stop offset="1" stopColor="#efe6ff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fbf7f1" stopOpacity=".96" />
              <stop offset=".45" stopColor="#ece4f2" stopOpacity=".9" />
              <stop offset="1" stopColor="#cfc2e4" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={`${id}-shade`} cx="70%" cy="40%" r="60%">
              <stop offset="0" stopColor="#8f7aa8" stopOpacity="0" />
              <stop offset="1" stopColor="#8f7aa8" stopOpacity=".28" />
            </radialGradient>
          </defs>
          <ellipse cx="40" cy="44" rx="40" ry="44" fill={`url(#${id}-halo)`} />
          <path d={GHOST_SLEEVES} fill={`url(#${id})`} />
          <path d={GHOST_SHEET} fill={`url(#${id})`} />
          <path d={GHOST_SHEET} fill={`url(#${id}-shade)`} />
          <g className="saison-ghost-eyes" fill="#2a1d33" fillOpacity=".78">
            <path d="M29 30c3-1 5 2 5 6s-2 7-4 7-4-3-4-7c0-3 1-5 3-6Z" />
            <path d="M51 30c-3-1-5 2-5 6s2 7 4 7 4-3 4-7c0-3-1-5-3-6Z" />
          </g>
          </svg>
      </div>
    </div>
  );
}

/* Le liseré de lanterne du chat, sur l'aubergine : le tracé en trait orange
   sous l'aplat. */
const CAT_TAIL = "M62 104c20 2 28-14 21-28-4-8 0-16 6-18";
const CAT_BODY =
  "M30 110c-12 0-16-14-12-28 4-16 12-24 16-30h22c4 8 14 16 16 32 2 14-4 26-16 26ZM34 108c0-5 3-7 7-7s6 3 6 7Zm15 0c0-5 3-7 6-7 4 0 7 2 7 7Z";
const CAT_HEAD = "m60 33 1.4-21L49 25ZM28 41c0-12 6-18 17-18s17 6 17 18c0 10-7 16-17 16s-17-6-17-16Z";
const CAT_EAR = "M30 33 28.6 12 41 25Z";

function Cat() {
  return (
    <div className="saison-cat" aria-hidden>
      <div className="saison-cat-body">
        <svg viewBox="0 0 96 112">
          <g className="saison-cat-tail" fill="none" strokeLinecap="round">
            <path d={CAT_TAIL} className="saison-rim saison-rim--lantern" strokeWidth="9.6" />
            <path d={CAT_TAIL} stroke="currentColor" strokeWidth="7" />
          </g>
          <path d={CAT_BODY} className="saison-rim saison-rim--lantern" strokeWidth="2.6" />
          <path d={CAT_BODY} fill="currentColor" />
          <g className="saison-cat-head">
            <g className="saison-rim saison-rim--lantern" strokeWidth="2.6">
              <path d={CAT_EAR} className="saison-cat-ear" />
              <path d={CAT_HEAD} />
            </g>
            <g fill="currentColor">
              <path d={CAT_EAR} className="saison-cat-ear" />
              <path d={CAT_HEAD} />
            </g>
            <g className="saison-cat-eyes">
              <path d="M35.5 38q3.5-3.6 7 0-3.5 3.6-7 0ZM47.5 38q3.5-3.6 7 0-3.5 3.6-7 0Z" fill="#ffb93f" />
              <ellipse cx="39" cy="38" rx=".9" ry="2.5" fill="#1a1014" />
              <ellipse cx="51" cy="38" rx=".9" ry="2.5" fill="#1a1014" />
            </g>
            <path d="m43.6 44.5 1.4 1.3 1.4-1.3Z" fill="#7b5560" />
            <g stroke="#8d7173" strokeWidth=".6" opacity=".7">
              <path d="M36 46.5 22 44.5M36 48 23 50M54 46.5l14-2M54 48l13 2" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

/**
 * La teinte de la saison, en fondu sur ce qu'elle recouvre : posée hors de
 * tout contexte d'empilement, elle assombrit l'image (multiply) sans voiler
 * les lumières, peintes après elle. Le hero en met une sur l'affiche floutée
 * des marges (grand écran), SaisonPoster la sienne sur l'affiche.
 */
export function SaisonSky({ saison }: { saison: Saison }) {
  return <div className="saison-sky" data-saison={saison} aria-hidden />;
}

/** L'inclinaison d'une chauve-souris sur un tronçon : elle penche du côté où elle monte ou plonge. */
function roll([x0, y0]: number[], [x1, y1]: number[]) {
  const deg = (Math.atan((y1 - y0) / (x1 - x0)) * 180) / Math.PI / 2;
  return Math.max(-12, Math.min(12, deg));
}

/** Sur l'affiche : nuit, lune, lanternes, guirlande, bougies, regards, chauves-souris, sorcière. */
export function SaisonPoster({ saison, spots }: { saison: Saison; spots: SaisonSpots }) {
  const halloween = saison === "halloween";
  const { moon } = spots;
  return (
    <>
      <SaisonSky saison={saison} />
      <div className="saison-poster" aria-hidden>
        {spots.lamps.map((spot, i) => (
          <span key={i} className="saison-lamp" style={spotStyle(spot, flicker(i))} />
        ))}
        {spots.bulbs.map((spot, i) => (
          <span key={i} className="saison-bulb" style={spotStyle(spot, 2 + flicker(i))} />
        ))}
        {spots.candles.map((spot, i) => (
          <span key={i} className="saison-candle" style={spotStyle(spot, flicker(i + 1) / 2)} />
        ))}
        {halloween && (
          <>
            {spots.lanternFaces.map((spot, i) => (
              <div key={i} className="saison-lantern-face" style={spotStyle(spot, flicker(i + 2))}>
                <LanternFace />
              </div>
            ))}
            {spots.eyes.map((spot, i) => (
              <span key={i} className="saison-eyes" style={spotStyle(spot)} />
            ))}
            <Moon spot={moon} />
            {/* Conteneur de requête (cqw, cqh) : il isole, d'où son calque à part. */}
            <div className="saison-flight">
              <div
                className="saison-witch"
                style={
                  {
                    "--x1": `${moon.x}cqw`,
                    "--y0": `${moon.y + BROOM.rise}cqh`,
                    "--y1": `${moon.y + BROOM.top}cqh`,
                    "--y2": `${moon.y + BROOM.fall}cqh`,
                  } as React.CSSProperties
                }
              >
                <Witch />
              </div>
              {BATS.map(({ from, via, to, size, dur, delay, still }, i) => (
                <div
                  key={i}
                  className={still ? "saison-bat saison-bat--still" : "saison-bat"}
                  style={
                    {
                      width: `${size}%`,
                      "--x0": `${moon.x + from[0]}cqw`,
                      "--y0": `${moon.y + from[1]}cqh`,
                      "--x1": `${moon.x + via[0]}cqw`,
                      "--y1": `${moon.y + via[1]}cqh`,
                      "--x2": `${moon.x + to[0]}cqw`,
                      "--y2": `${moon.y + to[1]}cqh`,
                      "--r0": `${roll(from, via)}deg`,
                      "--r1": `${(roll(from, via) + roll(via, to)) / 2}deg`,
                      "--r2": `${roll(via, to)}deg`,
                      "--still": still && `${-still}s`,
                      "--flap": `${0.3 * (0.85 + (i % 3) * 0.15)}s`,
                      "--flap-delay": `${-0.07 * i}s`,
                      animationDuration: `${dur}s`,
                      animationDelay: `${delay}s`,
                    } as React.CSSProperties
                  }
                >
                  <Bat />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Sur le cadre du hero : ses feuilles ; à Halloween, les toiles d'angle, l'araignée, la brume, les citrouilles. */
export function SaisonFrame({ saison }: { saison: Saison }) {
  const halloween = saison === "halloween";
  const leaves = halloween ? FRAME_LEAVES.slice(0, HALLOWEEN_FRAME_LEAVES) : FRAME_LEAVES;
  return (
    <div className="saison-frame" aria-hidden>
      {halloween && (
        <div className="saison-fog">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="saison-fall saison-fall--frame">
        {leaves.map((leaf, i) => (
          <Leaf key={i} leaf={leaf} id={`saison-leaf-f${i}`} reverse={i % 2 === 1} />
        ))}
      </div>
      {halloween && (
        <>
          <CornerWeb size={168} seed={7} className="saison-web saison-web--left" />
          <CornerWeb size={132} seed={19} mirror className="saison-web saison-web--right" />
          <Spider className="saison-spider saison-spider--web" />
          <Pumpkin side="left" />
          <Pumpkin side="right" glow={0.8} />
        </>
      )}
    </div>
  );
}

/**
 * Fixé à l'écran, sur la colonne de la carte : les feuilles tombent derrière
 * les fiches (calque sous le contenu, la racine isolée) ; à Halloween,
 * l'araignée et les fantômes passent devant, chacun son tour, et le chat
 * n'apparaît que pour s'asseoir sur la barre du panier ou une pastille d'offre.
 */
export function SaisonAmbient({ saison }: { saison: Saison }) {
  const halloween = saison === "halloween";
  const leaves = halloween ? LEAVES.slice(0, HALLOWEEN_LEAVES) : LEAVES;
  return (
    <>
      <div className="saison-leaves" aria-hidden>
        <div className="saison-column saison-fall">
          {leaves.map((leaf, i) => (
            <Leaf key={i} leaf={leaf} id={`saison-leaf-a${i}`} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
      {halloween && (
        <div className="saison-ambient" aria-hidden>
          <div className="saison-column">
            <Spider className="saison-spider saison-spider--drop" />
            <Ghost side="left" />
            <Ghost side="right" />
          </div>
          <Cat />
        </div>
      )}
    </>
  );
}
