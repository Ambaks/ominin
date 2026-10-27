import type { Saison, SaisonSpot, SaisonSpots } from "@/lib/menu/saison";
import "./saison.css";

/*
 * L'habillage de saison du menu QR, posé par l'admin (jamais le gérant) :
 * « automne » fait tomber les feuilles et réchauffe les lanternes,
 * « halloween » y ajoute la nuit, la lune, les chauves-souris, les toiles, une
 * araignée, un fantôme et un chat noir. Trois calques : SaisonPoster sur
 * l'affiche (aux repères mesurés de l'établissement, Restaurant.saisonSpots),
 * SaisonFrame sur le cadre du hero (coins, sol), SaisonAmbient fixé à l'écran
 * pendant toute la carte. Tout est en SVG et en CSS (transform, opacity) :
 * rien n'intercepte le doigt, rien ne décale la mise en page, et sans
 * mouvement (prefers-reduced-motion) le décor reste posé, immobile
 * (saison.css).
 */

/* Les chauves-souris quittent la lune : trois points de vol en % de
   l'affiche, comptés depuis la lune, une taille, une durée et un départ
   propres. */
const BATS = [
  { from: [-2, 2.5], via: [-20, -1.5], to: [-64, -16.5], size: 9, dur: 9, delay: 0 },
  { from: [1, 4.5], via: [11, -3.5], to: [32, -12.5], size: 7, dur: 9, delay: 0.5 },
  { from: [-3, 6.5], via: [-28, 7.5], to: [-80, 15.5], size: 11, dur: 10, delay: 1.1 },
  { from: [4, 5.5], via: [-10, 15.5], to: [-42, 33.5], size: 6, dur: 11, delay: 1.6 },
  { from: [0, 1.5], via: [-11, -6.5], to: [-32, -18.5], size: 5.5, dur: 8, delay: 2.4 },
];
/** La sorcière traverse toute l'affiche, un peu au-dessus de la lune puis en dessous. */
const BROOM_RISE = [-3.5, 7.5];

/* Les feuilles : position de départ (vw), taille (px), chute (s), départ (s,
   négatif : déjà en l'air à l'ouverture), teinte. */
const LEAVES = [
  { x: 6, size: 30, fall: 14, delay: -2, tint: 0 },
  { x: 18, size: 24, fall: 17, delay: -11, tint: 2 },
  { x: 31, size: 36, fall: 12, delay: -6, tint: 1 },
  { x: 44, size: 26, fall: 16, delay: -14, tint: 3 },
  { x: 57, size: 34, fall: 13, delay: -4, tint: 4 },
  { x: 69, size: 22, fall: 18, delay: -9, tint: 0 },
  { x: 80, size: 38, fall: 15, delay: -1, tint: 2 },
  { x: 91, size: 27, fall: 14, delay: -12, tint: 1 },
  { x: 12, size: 28, fall: 19, delay: -16, tint: 4 },
  { x: 38, size: 22, fall: 15, delay: -8, tint: 3 },
  { x: 64, size: 30, fall: 17, delay: -3, tint: 1 },
  { x: 86, size: 24, fall: 13, delay: -7, tint: 0 },
  { x: 25, size: 32, fall: 16, delay: -13, tint: 2 },
  { x: 50, size: 24, fall: 14, delay: -10, tint: 4 },
];
const LEAF_TINTS = ["#b8482a", "#d9922f", "#e0702a", "#8f2f22", "#a98a33"];
/** Halloween garde moins de feuilles : la scène a d'autres personnages. */
const HALLOWEEN_LEAVES = 8;

function spotStyle({ x, y, size, delay }: SaisonSpot) {
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${size}%`,
    animationDelay: delay ? `${delay}s` : undefined,
  } as React.CSSProperties;
}

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
          <circle key={i} cx={x} cy={y} r="1.3" className="saison-dew" style={{ animationDelay: `${i * 1.3}s` }} />
        ))}
      </g>
    </svg>
  );
}

const BAT_WING =
  "M29 13C22 6 12 4 2 9C6 10 8 13 8 16.5C11 14.5 14 15.5 15 18.5C18 15.5 22 16.5 23 19.5C25 17.5 27 18 29 20Z";

function Bat() {
  return (
    <svg viewBox="0 0 64 32" aria-hidden>
      <g className="saison-wing">
        <path d={BAT_WING} />
      </g>
      <g transform="matrix(-1 0 0 1 64 0)">
        <g className="saison-wing">
          <path d={BAT_WING} />
        </g>
      </g>
      <ellipse cx="32" cy="17" rx="4.2" ry="6.2" />
      <circle cx="32" cy="10.6" r="3.7" />
      <path d="M29.3 9.2 28.6 3.8l2.9 3.6ZM34.7 9.2l.7-5.4-2.9 3.6Z" />
      <circle cx="30.6" cy="10.8" r=".7" className="saison-bat-eye" />
      <circle cx="33.4" cy="10.8" r=".7" className="saison-bat-eye" />
    </svg>
  );
}

/** La sorcière sur son balai, de profil vers la gauche : une silhouette qui passe devant la lune. */
function Witch() {
  return (
    <svg viewBox="0 -14 140 84" aria-hidden>
      <path d="M8 36 118 47" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M114 45c10 0 18-4 26-6-6 8-4 14-2 22-8-6-16-8-26-9Z" />
      <path d="M68 33c8-4 20-4 30-12-4 9-10 15-22 19Z" />
      <path d="M58 42c-4-8-6-16-6-22 0-5 4-8 9-6 7 3 10 13 11 27Z" />
      <path d="m59 40-8 9h-7l-1 2h10l9-8Z" />
      <path d="M57 24 45 35l-2 3 3 1 13-10Z" />
      <circle cx="52" cy="11" r="5" />
      <path d="M40 8.5 66 5l.3 2.4L40.6 11Z" />
      <path d="M45 8c1-6 4-10 9-13 4-2 8-2 12-6-1 5-5 8-9 10-2 2-3 5-3 8Z" />
      <path d="M56 12c5 1 9 6 15 6-5 2-10 0-14-3Z" />
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
function LanternFace() {
  return (
    <svg viewBox="0 0 60 44" aria-hidden>
      <path d="M8 14 19 4l5 14ZM52 14 41 4l-5 14Z" />
      <path d="m30 15 4 5-4 5-4-5Z" />
      <path d="M4 26c6 9 15 14 26 14s20-5 26-14l-6 2-3 5-5-4-4 5-4-4-4 4-4-5-4 4-5-5-3-5Z" />
    </svg>
  );
}

function Pumpkin({ side, glow }: { side: "left" | "right"; glow?: number }) {
  return (
    <div className={`saison-pumpkin saison-pumpkin--${side}`} aria-hidden>
      <span className="saison-pumpkin-glow" style={glow ? { animationDelay: `${glow}s` } : undefined} />
      <svg viewBox="0 0 64 58">
        <defs>
          <radialGradient id={`saison-pumpkin-${side}`} cx="45%" cy="40%" r="70%">
            <stop offset="0" stopColor="#f59a3c" />
            <stop offset=".6" stopColor="#d9641f" />
            <stop offset="1" stopColor="#8f3410" />
          </radialGradient>
        </defs>
        <g fill={`url(#saison-pumpkin-${side})`} stroke="#7a2c0e" strokeWidth=".8">
          <ellipse cx="16" cy="35" rx="13" ry="19" />
          <ellipse cx="48" cy="35" rx="13" ry="19" />
          <ellipse cx="24" cy="35" rx="13" ry="21" />
          <ellipse cx="40" cy="35" rx="13" ry="21" />
          <ellipse cx="32" cy="35" rx="12" ry="22" />
        </g>
        <path d="M30 14c0-6 3-9 7-10l1.4 2.6c-3 1.2-4.4 4-4.4 7.4Z" fill="#5e4a22" />
        <g className="saison-pumpkin-face" transform="translate(13 22) scale(.64)">
          <LanternFace />
        </g>
      </svg>
    </div>
  );
}

function Spider({ className }: { className: string }) {
  return (
    <div className={className} aria-hidden>
      <span className="saison-thread" />
      <svg viewBox="0 0 40 40" className="saison-spider-body">
        <g className="saison-spider-legs" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M16 16 8 9 4 14M16 19 6 16 2 22M16 22 7 24 4 31M17 25l-6 6-1 7" />
          <path d="m24 16 8-7 4 5M24 19l10-3 4 6M24 22l9 2 3 7M23 25l6 6 1 7" />
        </g>
        <ellipse cx="20" cy="27" rx="6.5" ry="7.5" fill="currentColor" />
        <circle cx="20" cy="17" r="4.6" fill="currentColor" />
        <circle cx="18.4" cy="16.4" r=".9" className="saison-spider-eye" />
        <circle cx="21.6" cy="16.4" r=".9" className="saison-spider-eye" />
      </svg>
    </div>
  );
}

const GHOST_BODY =
  "M40 4C18 4 8 22 8 44v34c4 9 10 10 14 3 4-7 8-7 12 1 4 8 8 8 12 0 4-8 8-8 12 0 4 7 10 6 14-3V44C72 22 62 4 40 4Z";

function Ghost({ side }: { side: "left" | "right" }) {
  return (
    <div className={`saison-ghost saison-ghost--${side}`} aria-hidden>
      <div className="saison-ghost-bob">
        <svg viewBox="0 0 80 96">
          <defs>
            <radialGradient id={`saison-ghost-${side}`} cx="45%" cy="30%" r="75%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".7" stopColor="#f3ebf3" />
              <stop offset="1" stopColor="#d9cde0" />
            </radialGradient>
          </defs>
          <path d="M10 46C2 41 0 33 5 31c4-1 7 5 8 10Z" fill={`url(#saison-ghost-${side})`} />
          <path d="M70 52c8-2 10-8 7-11-3-2-7 2-9 6Z" fill={`url(#saison-ghost-${side})`} />
          <path className="saison-ghost-hem" d={GHOST_BODY} fill={`url(#saison-ghost-${side})`} />
          <g className="saison-ghost-eyes" fill="#2b1d27">
            <ellipse cx="30" cy="38" rx="4.6" ry="6.6" />
            <ellipse cx="50" cy="38" rx="4.6" ry="6.6" />
          </g>
          <circle cx="31.6" cy="35.4" r="1.4" fill="#fff" />
          <circle cx="51.6" cy="35.4" r="1.4" fill="#fff" />
          <ellipse cx="40" cy="54" rx="3.4" ry="4.4" fill="#2b1d27" />
          <circle cx="23" cy="48" r="4" fill="#f2a3a3" opacity=".4" />
          <circle cx="57" cy="48" r="4" fill="#f2a3a3" opacity=".4" />
        </svg>
      </div>
    </div>
  );
}

function Cat() {
  return (
    <div className="saison-cat" aria-hidden>
      <svg viewBox="0 0 96 112">
        <g className="saison-cat-tail">
          <path d="M62 104c20 2 28-14 21-28-4-8 0-16 6-18" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </g>
        <path
          className="saison-cat-silhouette"
          d="M30 110c-12 0-16-14-12-28 4-16 12-24 16-30h22c4 8 14 16 16 32 2 14-4 26-16 26Z"
        />
        <g className="saison-cat-head">
          <path className="saison-cat-silhouette" d="M28 41c0-12 6-18 17-18s17 6 17 18c0 10-7 16-17 16s-17-6-17-16Z" />
          <path className="saison-cat-silhouette saison-cat-ear" d="M30 33 28.6 12 41 25Z" />
          <path className="saison-cat-silhouette" d="m60 33 1.4-21L49 25Z" />
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
        <path className="saison-cat-silhouette" d="M34 108c0-5 3-7 7-7s6 3 6 7ZM49 108c0-5 3-7 6-7 4 0 7 2 7 7Z" />
      </svg>
    </div>
  );
}

function Leaf({ tint }: { tint: number }) {
  return (
    <svg viewBox="0 0 48 52" aria-hidden>
      <path
        d="M24 41 20 35 6 37l6-6-9-4 7-3-6-10 10 3 1-8 5 5 4-10 4 10 5-5 1 8 10-3-6 10 7 3-9 4 6 6-14-2Z"
        fill={LEAF_TINTS[tint]}
      />
      <path
        d="M24 50V24M24 34 9 26M24 34l15-8M24 30l-10-14M24 30l10-14M24 26V8"
        fill="none"
        stroke="#4a1f12"
        strokeOpacity=".45"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
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

/** Sur l'affiche : nuit, lune, lanternes, guirlande, bougies, regards, chauves-souris, sorcière. */
export function SaisonPoster({ saison, spots }: { saison: Saison; spots: SaisonSpots }) {
  const halloween = saison === "halloween";
  const { moon } = spots;
  return (
    <>
      <SaisonSky saison={saison} />
      <div className="saison-poster" aria-hidden>
        {spots.lamps.map((spot, i) => (
          <span key={i} className="saison-lamp" style={spotStyle(spot)} />
        ))}
        {spots.bulbs.map((spot, i) => (
          <span key={i} className="saison-bulb" style={spotStyle(spot)} />
        ))}
        {spots.candles.map((spot, i) => (
          <span key={i} className="saison-candle" style={spotStyle(spot)} />
        ))}
        {halloween && (
          <>
            {spots.lanternFaces.map((spot, i) => (
              <div key={i} className="saison-lantern-face" style={spotStyle(spot)}>
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
                    "--y0": `${moon.y + BROOM_RISE[0]}cqh`,
                    "--y1": `${moon.y + BROOM_RISE[1]}cqh`,
                  } as React.CSSProperties
                }
              >
                <Witch />
              </div>
              {BATS.map(({ from, via, to, size, dur, delay }, i) => (
                <div
                  key={i}
                  className="saison-bat"
                  style={
                    {
                      width: `${size}%`,
                      "--x0": `${moon.x + from[0]}cqw`,
                      "--y0": `${moon.y + from[1]}cqh`,
                      "--x1": `${moon.x + via[0]}cqw`,
                      "--y1": `${moon.y + via[1]}cqh`,
                      "--x2": `${moon.x + to[0]}cqw`,
                      "--y2": `${moon.y + to[1]}cqh`,
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

/** Sur le cadre du hero : la teinte de la nuit, les toiles d'angle, la brume, les citrouilles. */
export function SaisonFrame({ saison }: { saison: Saison }) {
  if (saison !== "halloween") return null;
  return (
    <div className="saison-frame" aria-hidden>
      <CornerWeb size={168} seed={7} className="saison-web saison-web--left" />
      <CornerWeb size={132} seed={19} mirror className="saison-web saison-web--right" />
      <Spider className="saison-spider saison-spider--web" />
      <div className="saison-fog">
        <span />
        <span />
        <span />
      </div>
      <Pumpkin side="left" />
      <Pumpkin side="right" glow={0.8} />
    </div>
  );
}

/** Fixé à l'écran : les feuilles qui tombent ; à Halloween, l'araignée, les fantômes et le chat. */
export function SaisonAmbient({ saison }: { saison: Saison }) {
  const halloween = saison === "halloween";
  const leaves = halloween ? LEAVES.slice(0, HALLOWEEN_LEAVES) : LEAVES;
  return (
    <div className="saison-ambient" aria-hidden>
      {leaves.map(({ x, size, fall, delay, tint }, i) => (
        <div
          key={i}
          className="saison-leaf"
          style={{ left: `${x}vw`, width: size, animationDuration: `${fall}s`, animationDelay: `${delay}s` }}
        >
          <div className="saison-leaf-sway" style={{ animationDelay: `${delay / 3}s` }}>
            <div className="saison-leaf-spin" style={{ animationDuration: `${fall / 2.4}s` }}>
              <Leaf tint={tint} />
            </div>
          </div>
        </div>
      ))}
      {halloween && (
        <>
          <Spider className="saison-spider saison-spider--drop" />
          <Ghost side="left" />
          <Ghost side="right" />
          <Cat />
        </>
      )}
    </div>
  );
}
