/*
 * La feuille qui naît de la pastille de fidélité. Touchée, la pastille
 * s'écrase et le liquide sort de dessous : il bombe autour d'elle, coule vers
 * le bas en s'élargissant jusqu'à la forme exacte de la feuille ; un pont
 * d'eau la relie encore à la pastille, s'amincit et lâche. Le contenu perce
 * derrière un front mouillé parti de la pastille, un reflet large balaie la
 * face. Refermée, la feuille se trouble d'abord, puis remonte, se vide dans la
 * pastille et s'y éteint ; la pastille rebondit quand le liquide l'atteint.
 * Chacun des quatre bords est un ressort, lâché à son heure. Le bord
 * d'attaque s'arrondit en goutte à pleine vitesse, le ménisque ondule tant
 * que le liquide court, les reflets glissent avec lui.
 *
 * Rendu par lancer de rayons, pixel par pixel : la surface est un champ de
 * hauteur tiré de la distance signée à la forme (ménisque bombé au bord,
 * vaguelettes parties de la pastille). Le rayon de vue s'y réfléchit vers une
 * boîte à lumière et l'horizon de la pièce (Fresnel de l'eau) ; au bord, trop
 * incliné pour ressortir, il se perd (liseré sombre) ; la tranche mince laisse
 * passer le fond, le cœur épais prend une teinte plus profonde. Les
 * vaguelettes concentrent la lumière en caustiques, le ménisque en trace une
 * ligne au pied du bord, sous une ombre de contact. La vraie feuille est
 * découpée à la même forme (clip-path, même équation ici qu'en GLSL).
 *
 * Chargé à part (loyalty-welcome), compilé au repos (prepareLiquid), jamais
 * au toucher. Sans WebGL accéléré en haute précision, contexte perdu, onglet
 * masqué, écran redimensionné, images trop lentes ou mouvement réduit : la
 * feuille s'ouvre et se ferme sans attendre, jamais un toucher perdu.
 */
import { reducedMotion } from "./loyalty-card";

type Spring = { freq: number; damping: number; delay: number };

/** Réglages : valeurs nommées, à valider avec le propriétaire. */
export const LIQUID = {
  /*
   * Ressorts des bords gauche, haut, droit, bas : pulsation (rad/s),
   * amortissement (1 = sans rebond), départ après le toucher (s).
   */
  open: [
    { freq: 10, damping: 0.8, delay: 0.04 },
    { freq: 11, damping: 0.85, delay: 0.18 },
    { freq: 13, damping: 0.85, delay: 0 },
    { freq: 11, damping: 0.85, delay: 0 },
  ] satisfies Spring[],
  /* À la fermeture, la forme part dès le toucher pendant que le contenu se trouble. */
  close: [
    { freq: 15, damping: 0.9, delay: 0 },
    { freq: 14, damping: 0.88, delay: 0.03 },
    { freq: 15, damping: 0.9, delay: 0 },
    { freq: 13.5, damping: 0.95, delay: 0.05 },
  ] satisfies Spring[],
  /*
   * Le liquide au repos, rentré sous les bords de la pastille (px) ; la
   * goutte d'où il part et où il rentre, sous son centre bas (part de sa
   * largeur, de sa hauteur).
   */
  pillInset: 3,
  seed: [0.5, 0.5],
  /*
   * Pont entre la pastille et la feuille : portée du raccord (px) ; avancement
   * (0 → 1) où il se forme en sortant de la pastille, où il se résorbe en y
   * rentrant, où il lâche. Le liquide sous la pastille suit le pont.
   */
  bridge: { reach: 56, form: [0, 0.08], drain: [0.03, 0.22], release: [0.55, 0.85] },
  /* Vitesse (px/s) à laquelle le bord d'attaque s'arrondit tout à fait en goutte. */
  tipSpeed: 1600,
  /*
   * Ondulation du bord : amplitude par vitesse (px par px/s), plafond (px et
   * part de la demi-largeur), part du mode 5, pulsations des modes 3 et 5
   * (rad/s), réponse (1/s).
   */
  wobble: { gain: 0.0035, max: 6, share: 0.12, second: 0.6, spin: [7, -11], rate: 10 },
  /*
   * Vaguelettes parties de la pastille : pente à l'ouverture et à la
   * fermeture, longueur d'onde (px), vitesse (px/s), durée de vie (s), portée
   * (px) où elles s'éteignent, irrégularité des cercles (px) et sa dérive.
   */
  ripple: { slope: [0.32, 0.03], wavelength: 70, speed: 640, life: 0.7, reach: 420, jitter: 7, wander: 0.5 },
  /* Ménisque : largeur du bord bombé (px), pente au bord. */
  meniscus: { width: 16, slope: 2.8 },
  /*
   * Lumières, en éclat réel (l'eau n'en renvoie que 2 % de face) : boîte à
   * lumière (direction écran, y vers le bas ; cosinus des bords flou et net ;
   * couleur ; glissement avec la vitesse, par px/s, et plafond), contre-jour,
   * horizon et zénith de la pièce.
   */
  key: { dir: [-0.42, -0.62, 0.66], cone: [0.86, 0.975], color: [26, 25, 23], drift: 0.00025, driftMax: 0.35 },
  fill: { dir: [0.55, 0.6, 0.58], cone: [0.9, 0.985], color: [5, 5.6, 6.4] },
  sky: { horizon: 1.6, zenith: 0.05 },
  /*
   * Eau : Fresnel à l'incidence normale ; bord mince éclairci (liquide
   * sombre) ou ombré (liquide clair) ; liseré sombre (force, pentes où il
   * naît et culmine) ; reflets d'un liquide clair, qui sinon brûle au
   * blanc ; tranche allumée ; transparence de la tranche (opacité au bord,
   * largeur px).
   */
  fresnel: 0.02,
  edgeLift: 0.3,
  edgeShade: 0.12,
  rim: { alpha: 0.16, slope: [0.25, 1] },
  lightSpec: 0.35,
  rimLight: 0.28,
  thin: { alpha: 0.55, width: 10 },
  /* Épaisseur : part de teinte profonde au cœur. */
  absorb: 0.35,
  /* Reflet large qui balaie la face à l'ouverture : éclat, largeur (px), direction, durée (s). */
  sheen: { gain: 0.16, width: 90, dir: [0.55, 0.83], seconds: 0.55 },
  /*
   * Caustiques des vaguelettes ; ligne de lumière au pied du bord (éclat,
   * écart au bord px, largeur px) ; ombre de contact (opacité, portée px,
   * raideur, part tournée vers la lampe).
   */
  caustics: 1,
  footLight: { gain: 0.35, offset: 3, width: 4 },
  shadow: { alpha: 0.35, reach: 18, falloff: 3, lit: 0.55 },
  /*
   * Le contenu perce derrière un front mouillé parti de la pastille :
   * avancement où il part, où il a tout découvert ; largeur du front (px) ;
   * éclat et largeur (px) de sa ligne.
   */
  clear: [0.3, 0.88],
  front: { band: 160, gain: 0.18, width: 10 },
  /* Le contenu monte de tant (px) jusqu'à sa place, à mesure qu'il perce. */
  rise: 8,
  /* Fond assombri : fondu d'entrée, de sortie (ms). */
  dim: { open: 460, close: 260 },
  /* Réponse (1/s) du front, du voile qui trouble le contenu à la fermeture, de la brillance, du pont. */
  rates: { reveal: 12, cloud: 40, gloss: 8, bridge: 18 },
  /*
   * Repos : écart (px) et vitesse (px/s) sous lesquels un bord est posé ;
   * vitesse (px/s) sous laquelle la brillance s'éteint, découverte où elle
   * s'éteint ; seuils de brillance, d'ondulation (px), de pont (px) ; part
   * de l'avancement restant quand la feuille est rentrée.
   */
  rest: { distance: 0.5, speed: 8, glossSpeed: 400, glossFrom: 0.85, gloss: 0.02, wobble: 0.15, bridge: 0.5, drained: 0.015 },
  /* Feuille lisible (la garde contre le double-tap se lève) : part du contenu découverte. */
  opened: 0.9,
  /*
   * Pastille : écrasée sous le doigt ; quand le liquide l'atteint
   * (avancement restant), elle s'aplatit puis rebondit (échelles x y), le
   * liquide s'y éteint sur la fin (avancement restant) ; durées (ms).
   */
  squeeze: { scale: ["1", "0.9", "1.05", "1"], ms: 420 },
  bounce: { at: 0.15, scale: ["1", "1.06 0.9", "0.96 1.1", "1.02 0.98", "1"], ms: 520 },
  vanish: 0.03,
  /*
   * Intégration : pas fixe (s), écart maximal entre deux images (s), durée
   * maximale d'un trajet (s). Garde : sans image depuis tant de ms (horloge
   * réelle ; plus longtemps avant la première, le temps du montage), ou tant
   * d'images d'affilée plus lentes que tant de ms, le liquide cède et la
   * feuille finit sans lui.
   */
  step: 1 / 240,
  maxStep: 1 / 20,
  maxSeconds: 2,
  stall: 600,
  firstFrame: 1500,
  slow: { ms: 50, frames: 5 },
  /*
   * Contour de découpe : points par coin, sur les côtés ; pas de marche
   * (part de la distance, minimum px), dichotomies. Le contenu est découpé
   * sous la tranche translucide tant qu'elle brille, sans quoi il s'y voyait.
   */
  outline: { corner: 12, sides: 96, march: 0.8, minStep: 0.5, bisect: 6 },
  /* Compilation au repos : attente maximale (ms), délai sans requestIdleCallback (ms), essais avant d'y renoncer. */
  idle: { timeout: 4000, delay: 1500, tries: 20 },
  /* Définition du canevas : densité maximale, pixels au plus (grands écrans). */
  dprCap: 2,
  maxPixels: 4_000_000,
};

type Rect = [left: number, top: number, right: number, bottom: number];
type Corners = [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number];

/** La forme du liquide à un instant : la feuille en devenir, la pastille, le pont qui les unit. */
interface Shape {
  box: Rect;
  radii: Corners;
  /** Centre et demi-taille du liquide sous la pastille. */
  pill: [x: number, y: number, hx: number, hy: number];
  bridge: number;
  /** Amplitude et phase des modes 3 et 5 du bord. */
  wobble: [number, number, number, number];
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* Distance signée à un rectangle arrondi (centre, demi-taille, rayon). */
function roundBox(qx: number, qy: number, bx: number, by: number, r: number) {
  const ex = Math.abs(qx) - bx + r;
  const ey = Math.abs(qy) - by + r;
  return Math.min(Math.max(ex, ey), 0) + Math.hypot(Math.max(ex, 0), Math.max(ey, 0)) - r;
}

/* Union douce : un pont de liquide entre deux formes à moins de k l'une de l'autre. */
function smin(a: number, b: number, k: number) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** La distance signée au liquide (px, négative dedans) : le pendant exact de shape() en GLSL. */
function field(x: number, y: number, s: Shape) {
  const [l, t, r, b] = s.box;
  const qx = x - (l + r) / 2;
  const qy = y - (t + b) / 2;
  const [tl, tr, br, bl] = s.radii;
  const radius = qx > 0 ? (qy > 0 ? br : tr) : qy > 0 ? bl : tl;
  // Le décalage évite atan(0, 0), indéfini en GLSL.
  const angle = Math.atan2(qy, qx + 1e-4);
  const d =
    roundBox(qx, qy, (r - l) / 2, (b - t) / 2, radius) -
    s.wobble[0] * Math.sin(3 * angle + s.wobble[1]) -
    s.wobble[2] * Math.sin(5 * angle + s.wobble[3]);
  const [px, py, hx, hy] = s.pill;
  return smin(d, roundBox(x - px, y - py, hx, hy, Math.min(hx, hy)), s.bridge);
}

/*
 * Le contour du liquide, en coordonnées du panneau, pour son clip-path. Des
 * rayons partent du centre vers le pourtour du rectangle arrondi — serrés
 * dans les coins, sans quoi la feuille posée s'y voyait taillée en pans —,
 * avancent à pas de distance jusqu'à sortir, puis on resserre par dichotomie.
 */
function outline(s: Shape, ox: number, oy: number, inset: number) {
  const [l, t, r, b] = s.box;
  const [tl, tr, br, bl] = s.radii;
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;
  const sides = [
    [l + tl, t, r - tr, t],
    [r, t + tr, r, b - br],
    [r - br, b, l + bl, b],
    [l, b - bl, l, t + tl],
  ];
  const arcs = [
    [r - tr, t + tr, tr],
    [r - br, b - br, br],
    [l + bl, b - bl, bl],
    [l + tl, t + tl, tl],
  ];
  const lengths = sides.map(([x0, y0, x1, y1]) => Math.hypot(x1 - x0, y1 - y0));
  const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
  const { corner, sides: perSide, march, minStep, bisect } = LIQUID.outline;
  const points: string[] = [];
  const cast = (ax: number, ay: number) => {
    const length = Math.hypot(ax - cx, ay - cy);
    if (length === 0) return;
    const ux = (ax - cx) / length;
    const uy = (ay - cy) / length;
    let inside = 0;
    let outside = 0;
    let d = field(cx, cy, s) + inset;
    if (d >= 0) return;
    while (d < 0) {
      inside = outside;
      outside += Math.max(-d * march, minStep);
      d = field(cx + ux * outside, cy + uy * outside, s) + inset;
    }
    for (let j = 0; j < bisect; j++) {
      const mid = (inside + outside) / 2;
      if (field(cx + ux * mid, cy + uy * mid, s) + inset < 0) inside = mid;
      else outside = mid;
    }
    points.push(`${(cx + ux * outside - ox).toFixed(1)}px ${(cy + uy * outside - oy).toFixed(1)}px`);
  };
  for (let i = 0; i < 4; i++) {
    const [x0, y0, x1, y1] = sides[i];
    const n = Math.max(1, Math.round((perSide * lengths[i]) / total));
    for (let j = 0; j < n; j++) cast(x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n);
    const [ax, ay, radius] = arcs[i];
    // Coin vif (le bas de la feuille au téléphone) : un seul point.
    const steps = radius > minStep ? corner : 1;
    const from = ((i - 1) * Math.PI) / 2;
    for (let j = 0; j < steps; j++) {
      const angle = from + ((Math.PI / 2) * j) / steps;
      cast(ax + radius * Math.cos(angle), ay + radius * Math.sin(angle));
    }
  }
  return points.length ? `polygon(${points.join(",")})` : "inset(50%)";
}

const glsl = (n: number) => n.toFixed(4);
const unit = (v: readonly number[]) => {
  const n = Math.hypot(...v);
  return `vec${v.length}(${v.map((x) => glsl(x / n)).join(", ")})`;
};
const vec = (v: readonly number[]) => `vec${v.length}(${v.map(glsl).join(", ")})`;

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
uniform float uHeight;
uniform float uDpr;
uniform vec4 uBox;
uniform vec4 uRadii;
uniform vec4 uPill;
uniform float uBridge;
uniform vec4 uWobble;
uniform vec4 uPanel;
uniform vec3 uTint;
uniform float uVeil;
uniform vec3 uFront;
uniform float uGloss;
uniform vec4 uRipple;
uniform vec2 uSheen;
uniform vec2 uKeyShift;
uniform float uFade;
float roundBox(vec2 q, vec2 b, float r) {
  vec2 e = abs(q) - b + r;
  return min(max(e.x, e.y), 0.0) + length(max(e, 0.0)) - r;
}
float smin(float a, float b, float k) {
  if (k <= 0.0) return min(a, b);
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
/* Distance signée au liquide (px, y vers le bas) : le pendant exact de field() côté JS. */
float shape(vec2 p) {
  vec2 q = p - 0.5 * (uBox.xy + uBox.zw);
  float radius = q.x > 0.0 ? (q.y > 0.0 ? uRadii.z : uRadii.y) : (q.y > 0.0 ? uRadii.w : uRadii.x);
  float angle = atan(q.y, q.x + 1e-4);
  float d = roundBox(q, 0.5 * (uBox.zw - uBox.xy), radius)
    - uWobble.x * sin(3.0 * angle + uWobble.y)
    - uWobble.z * sin(5.0 * angle + uWobble.w);
  return smin(d, roundBox(p - uPill.xy, uPill.zw, min(uPill.z, uPill.w)), uBridge);
}
/* La pièce vue dans l'eau : horizon clair, zénith sombre, boîte à lumière et contre-jour. */
vec3 room(vec3 r, vec3 key) {
  vec3 light = vec3(mix(SKY_HORIZON, SKY_ZENITH, clamp(r.z, 0.0, 1.0)));
  light += KEY_COLOR * smoothstep(KEY_CONE.x, KEY_CONE.y, dot(r, key));
  light += FILL_COLOR * smoothstep(FILL_CONE.x, FILL_CONE.y, dot(r, FILL_DIR));
  return light;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDpr;
  float d = shape(p);
  if (d > SHADOW_REACH) discard;
  /* Normale du bord : le gradient de la distance, sur la bande du ménisque et de l'ombre. */
  vec2 outward = vec2(0.0);
  if (d > -MENISCUS_WIDTH) {
    float e = 1.0 / uDpr;
    vec2 g = vec2(shape(p + vec2(e, 0.0)) - d, shape(p + vec2(0.0, e)) - d);
    float len = length(g);
    if (len > 0.0) outward = g / len;
  }
  /* La lampe glisse un peu avec le liquide : ses reflets suivent le mouvement. */
  vec3 key = normalize(KEY_DIR + vec3(uKeyShift, 0.0));
  /* Un liquide clair (la crème de la carte) : reflets tenus, bord ombré plutôt qu'éclairci. */
  float lum = dot(uTint, vec3(0.2126, 0.7152, 0.0722));
  float tame = mix(1.0, LIGHT_SPEC, lum);
  float away = max(dot(outward, -normalize(key.xy)), 0.0);

  /* Dehors : ombre de contact, ligne de lumière au pied du bord opposé à la lampe. */
  float shadowA = SHADOW_ALPHA * exp(-max(d, 0.0) / SHADOW_REACH * SHADOW_FALLOFF) * (SHADOW_LIT + (1.0 - SHADOW_LIT) * away);
  float foot = FOOT_GAIN * away * exp(-(d - FOOT_OFFSET) * (d - FOOT_OFFSET) / (FOOT_WIDTH * FOOT_WIDTH));
  vec4 outside = vec4(KEY_TONE * foot, max(shadowA, foot)) * uGloss;

  /* Dedans : la hauteur bombe sur le ménisque (pente nulle au plat), les vaguelettes courent dessus. */
  float s = clamp(-d / MENISCUS_WIDTH, 0.0, 1.0);
  float edge = 1.0 - s;
  vec2 tilt = outward * MENISCUS_SLOPE * edge;
  vec2 fromPill = p - uPill.xy;
  float dist = length(fromPill);
  float bend = RIPPLE_JITTER * sin(3.0 * atan(fromPill.y, fromPill.x + 1e-4) + RIPPLE_WANDER * uRipple.z);
  float wave = uRipple.y * (dist + bend) - uRipple.z;
  float envelope = uRipple.w < 0.0 ? 1.0 : 1.0 - smoothstep(uRipple.w - RIPPLE_WAVELENGTH, uRipple.w, dist);
  float amp = uRipple.x * envelope * exp(-dist / RIPPLE_REACH) * smoothstep(0.0, 1.0, s);
  tilt -= amp * cos(wave) * fromPill / max(dist, 1.0);
  vec3 n = normalize(vec3(tilt, 1.0));
  vec3 r = vec3(2.0 * n.z * n.xy, 2.0 * n.z * n.z - 1.0);
  float c = 1.0 - n.z;
  float c2 = c * c;
  float fresnel = FRESNEL + (1.0 - FRESNEL) * c2 * c2 * c;
  /* Les crêtes concentrent la lumière : le laplacien de la hauteur, là où il creuse. */
  float caustic = CAUSTICS * max(amp * sin(wave), 0.0);
  /* Le reflet large d'une baie, qui traverse la face plate une fois. */
  vec2 center = 0.5 * (uBox.xy + uBox.zw);
  float along = dot(p - center, SHEEN_DIR) - uSheen.x;
  float sheen = uSheen.y * s * exp(-along * along / (SHEEN_WIDTH * SHEEN_WIDTH));

  /* Sur la feuille, le liquide s'éclaircit derrière le front parti de la pastille ; ailleurs il est plein. */
  vec2 inPanel = min(p - uPanel.xy, uPanel.zw - p);
  float panel = clamp(min(inPanel.x, inPanel.y) * uDpr + 0.5, 0.0, 1.0);
  float behind = dist - (uFront.x - 0.5 * uFront.y);
  float wet = uFront.z * panel * s * exp(-behind * behind / (FRONT_WIDTH * FRONT_WIDTH));
  vec3 spec = ((fresnel * room(r, key) + KEY_TONE * (caustic + RIM_LIGHT * edge * edge * edge)) * uGloss
    + KEY_TONE * (sheen + wet)) * tame;
  float dark = RIM_ALPHA * (1.0 + lum) * smoothstep(RIM_SLOPE.x, RIM_SLOPE.y, length(tilt)) * (1.0 - fresnel) * uGloss;

  float cleared = 1.0 - smoothstep(uFront.x - uFront.y, uFront.x, dist);
  float thin = mix(THIN_ALPHA, 1.0, smoothstep(0.0, THIN_WIDTH, -d));
  float bodyA = mix(1.0, max(uVeil, 1.0 - cleared), panel) * thin;
  /* Épaisseur en coussin (sans arête au milieu) : le cœur prend la teinte deux fois traversée. */
  vec2 u = clamp((p - center) / max(0.5 * (uBox.zw - uBox.xy), vec2(1.0)), -1.0, 1.0);
  vec2 u2 = u * u;
  float thick = (1.0 - u2.x * u2.x) * (1.0 - u2.y * u2.y);
  float lift = (EDGE_LIFT * (1.0 - lum) - EDGE_SHADE * lum) * edge;
  vec3 col = uTint * mix(vec3(1.0 + lift), uTint, ABSORB * thick) * bodyA;
  float a = bodyA;
  /* Le liseré sombre est de la couleur du liquide, en plus profond. */
  col = col * (1.0 - dark) + uTint * uTint * dark;
  a += dark * (1.0 - a);
  col += spec;
  a = max(a, min(1.0, max(spec.r, max(spec.g, spec.b))));
  /* Alpha prémultiplié : jamais plus de lumière que de couverture. */
  col = min(col, vec3(a));

  float cover = clamp(0.5 - d * uDpr, 0.0, 1.0);
  gl_FragColor = mix(outside, vec4(col, a), cover) * uFade;
}
`;

function fragment() {
  const defines = {
    MENISCUS_WIDTH: glsl(LIQUID.meniscus.width),
    MENISCUS_SLOPE: glsl(LIQUID.meniscus.slope),
    RIPPLE_WAVELENGTH: glsl(LIQUID.ripple.wavelength),
    RIPPLE_REACH: glsl(LIQUID.ripple.reach),
    RIPPLE_JITTER: glsl(LIQUID.ripple.jitter),
    RIPPLE_WANDER: glsl(LIQUID.ripple.wander),
    KEY_DIR: unit(LIQUID.key.dir),
    KEY_CONE: vec(LIQUID.key.cone),
    KEY_COLOR: vec(LIQUID.key.color),
    KEY_TONE: vec(LIQUID.key.color.map((x) => x / Math.max(...LIQUID.key.color))),
    FILL_DIR: unit(LIQUID.fill.dir),
    FILL_CONE: vec(LIQUID.fill.cone),
    FILL_COLOR: vec(LIQUID.fill.color),
    SKY_HORIZON: glsl(LIQUID.sky.horizon),
    SKY_ZENITH: glsl(LIQUID.sky.zenith),
    FRESNEL: glsl(LIQUID.fresnel),
    EDGE_LIFT: glsl(LIQUID.edgeLift),
    EDGE_SHADE: glsl(LIQUID.edgeShade),
    LIGHT_SPEC: glsl(LIQUID.lightSpec),
    RIM_ALPHA: glsl(LIQUID.rim.alpha),
    RIM_SLOPE: vec(LIQUID.rim.slope),
    RIM_LIGHT: glsl(LIQUID.rimLight),
    THIN_ALPHA: glsl(LIQUID.thin.alpha),
    THIN_WIDTH: glsl(LIQUID.thin.width),
    ABSORB: glsl(LIQUID.absorb),
    SHEEN_WIDTH: glsl(LIQUID.sheen.width),
    SHEEN_DIR: unit(LIQUID.sheen.dir),
    FRONT_WIDTH: glsl(LIQUID.front.width),
    CAUSTICS: glsl(LIQUID.caustics),
    FOOT_GAIN: glsl(LIQUID.footLight.gain),
    FOOT_OFFSET: glsl(LIQUID.footLight.offset),
    FOOT_WIDTH: glsl(LIQUID.footLight.width),
    SHADOW_ALPHA: glsl(LIQUID.shadow.alpha),
    SHADOW_REACH: glsl(LIQUID.shadow.reach),
    SHADOW_FALLOFF: glsl(LIQUID.shadow.falloff),
    SHADOW_LIT: glsl(LIQUID.shadow.lit),
  };
  return Object.entries(defines).map(([name, value]) => `#define ${name} ${value}\n`).join("") + FRAG;
}

const UNIFORMS = [
  "uHeight", "uDpr", "uBox", "uRadii", "uPill", "uBridge", "uWobble", "uPanel", "uTint", "uVeil", "uFront", "uGloss",
  "uRipple", "uSheen", "uKeyShift", "uFade",
] as const;

interface Renderer {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  at: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
}

let renderer: Renderer | null = null;
let status: "idle" | "pending" | "ready" | "off" = "idle";
let current: { finish(): void } | null = null;

const later = (run: () => void) => {
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: LIQUID.idle.timeout });
  else setTimeout(run, LIQUID.idle.delay);
};

/* Compile et lie le shader ; en parallèle quand le navigateur le sait, sans bloquer la page. */
function compile() {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    failIfMajorPerformanceCaveat: true,
  });
  if (!gl) {
    status = "off";
    return;
  }
  const fail = () => {
    status = "off";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  // Le calcul se fait en pixels de l'écran : sans haute précision, il crénelle et déborde.
  if (!gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)?.precision) {
    fail();
    return;
  }
  const program = gl.createProgram();
  const shaders: WebGLShader[] = [];
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, fragment()],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) {
      fail();
      return;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    shaders.push(shader);
  }
  gl.linkProgram(program);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  let tries = 0;
  const link = () => {
    if (gl.isContextLost()) {
      status = "off";
      return;
    }
    if (parallel && !gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) {
      if (++tries > LIQUID.idle.tries) fail();
      else later(link);
      return;
    }
    for (const shader of shaders) gl.deleteShader(shader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail();
      return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    // Perdu, le contexte n'est pas rétabli : la feuille s'ouvre sans liquide.
    canvas.addEventListener("webglcontextlost", () => {
      status = "off";
      current?.finish();
    });
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
    canvas.setAttribute("aria-hidden", "true");
    const at = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)]));
    // Un premier tracé au repos : le pilote finit de préparer le programme ailleurs qu'au toucher.
    canvas.width = 1;
    canvas.height = 1;
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    renderer = { gl, canvas, at: at as Renderer["at"] };
    status = "ready";
  };
  link();
}

/** Compile le shader au repos, une fois : le toucher ne l'attend jamais. */
export function prepareLiquid() {
  if (status !== "idle" || reducedMotion()) return;
  status = "pending";
  later(compile);
}

/** Le liquide est-il prêt à jouer maintenant ? */
export function liquidReady() {
  return status === "ready" && !reducedMotion();
}

/** La pastille cède sous le doigt, dès qu'il se pose (la roue peut tarder à monter). */
export function squeezePill(pill: HTMLElement) {
  pill.animate({ scale: LIQUID.squeeze.scale }, { duration: LIQUID.squeeze.ms, easing: "ease-out" });
}

export interface LiquidSheet {
  /** Vide la feuille dans sa source ; résolue une fois vidée, ou aussitôt si le liquide tombe. */
  close(): Promise<void>;
  dispose(): void;
}

/** D'où naît une feuille (Sheet, origin) : sa source et de quoi la faire naître. */
export interface LiquidOrigin {
  source: HTMLElement;
  grow: typeof growSheet;
}

/* Un pixel de canevas lit toute couleur calculée (rgb, oklch, color-mix…) en sRGB. */
let swatch: CanvasRenderingContext2D | null = null;

/* La teinte du corps : le fond du premier enfant de la feuille s'il en a un (le tapis de la roue), sinon celui de la feuille. */
function tintOf(panel: HTMLElement): [number, number, number] | null {
  swatch ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  for (const el of [panel.firstElementChild, panel]) {
    if (!swatch || !(el instanceof HTMLElement)) continue;
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = "transparent";
    swatch.fillStyle = getComputedStyle(el).backgroundColor;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data;
    if (a === 0) continue;
    return [r / 255, g / 255, b / 255];
  }
  return null;
}

const rectOf = (el: Element): Rect => {
  const box = el.getBoundingClientRect();
  return [box.left, box.top, box.right, box.bottom];
};

/**
 * Fait naître la feuille de sa source, en place. Le premier état est posé
 * tout de suite (à appeler avant la peinture). Null si le liquide n'est pas
 * prêt ou la source introuvable : la feuille s'affiche alors simplement.
 */
export function growSheet({
  panel,
  dim,
  source,
  onOpened,
}: {
  panel: HTMLElement;
  /** Le fond assombri, qui se lève avec le liquide. */
  dim: HTMLElement;
  source: HTMLElement;
  /** La feuille est lisible : la garde contre le double-tap se lève. */
  onOpened: () => void;
}): LiquidSheet | null {
  if (!renderer || !liquidReady()) return null;
  const { gl, canvas, at } = renderer;
  let target: Rect = [0, 0, 0, 0];
  let core: Rect = [0, 0, 0, 0];
  let seed: Rect = [0, 0, 0, 0];
  let width = window.innerWidth;
  let rest: Corners = [0, 0, 0, 0];
  let dpr = 1;
  // La feuille passe-t-elle sous la pastille (écran bas) ? Elle la recouvre alors une fois posée.
  let overlaps = false;

  /* Toutes les mesures, à l'ouverture et à la fermeture (la roue a pu changer de tapis). */
  const measure = () => {
    if (!source.isConnected || !panel.isConnected) return false;
    const pill = rectOf(source);
    const inset = LIQUID.pillInset;
    if (pill[2] - pill[0] <= 2 * inset || pill[3] - pill[1] <= 2 * inset) return false;
    // Teinte illisible (couleur que le navigateur ne sait pas peindre) : pas de liquide.
    const tint = tintOf(panel);
    if (!tint) return false;
    core = [pill[0] + inset, pill[1] + inset, pill[2] - inset, pill[3] - inset];
    const [share, depth] = LIQUID.seed;
    const half = ((core[2] - core[0]) * share) / 2;
    const middle = (core[0] + core[2]) / 2;
    seed = [middle - half, core[3] - (core[3] - core[1]) * depth, middle + half, core[3]];
    target = rectOf(panel);
    overlaps = target[1] < pill[3];
    const style = getComputedStyle(panel);
    rest = [
      style.borderTopLeftRadius,
      style.borderTopRightRadius,
      style.borderBottomRightRadius,
      style.borderBottomLeftRadius,
    ].map(parseFloat) as Corners;
    const view = panel.parentElement!.getBoundingClientRect();
    width = window.innerWidth;
    dpr = Math.min(window.devicePixelRatio || 1, LIQUID.dprCap, Math.sqrt(LIQUID.maxPixels / (view.width * view.height)));
    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(at.uHeight, canvas.height);
    gl.uniform1f(at.uDpr, dpr);
    gl.uniform3f(at.uTint, ...tint);
    return true;
  };
  if (!measure()) return null;
  current?.finish();

  const pos = [...seed];
  const vel = [0, 0, 0, 0];
  let mode: "open" | "close" = "open";
  let since = 0;
  let startedAt = performance.now();
  let last = startedAt;
  let lastWall = Date.now();
  let framed = false;
  let slowFrames = 0;
  let progress = 0;
  let reveal = 0;
  let veil = 0;
  let gloss = 1;
  let bridge = 0;
  let wobble = 0;
  const phase = [0, 0];
  let raf = 0;
  let watchdog = 0;
  let running = false;
  let opened = false;
  let bounced = false;
  let fading: Animation | null = null;
  let resolveClose: (() => void) | null = null;
  let closing: Promise<void> | null = null;

  const shapeNow = (): Shape => {
    const minW = seed[2] - seed[0];
    const minH = seed[3] - seed[1];
    const l = Math.min(pos[0], pos[2] - minW);
    const t = Math.min(pos[1], pos[3] - minH);
    const r = Math.max(pos[2], l + minW);
    const b = Math.max(pos[3], t + minH);
    const half = Math.min(r - l, b - t) / 2;
    // Plus la feuille approche sa taille, plus ses coins deviennent les siens.
    const grown = smoothstep(
      0,
      1,
      Math.min((r - l - minW) / (target[2] - target[0] - minW || 1), (b - t - minH) / (target[3] - target[1] - minH || 1))
    );
    const tip = (v: number) => smoothstep(0, LIQUID.tipSpeed, Math.abs(v));
    const corner = (i: number, a: number, c: number) => {
      const round = half + (rest[i] - half) * grown;
      return Math.min(half, round + (half - round) * Math.max(tip(vel[a]), tip(vel[c])));
    };
    const amp = Math.min(wobble, LIQUID.wobble.max, LIQUID.wobble.share * half);
    // Le liquide sous la pastille gonfle avec le pont et rentre quand il lâche.
    const welled = bridge / LIQUID.bridge.reach;
    return {
      box: [l, t, r, b],
      radii: [corner(0, 0, 1), corner(1, 2, 1), corner(2, 2, 3), corner(3, 0, 3)],
      pill: [(core[0] + core[2]) / 2, (core[1] + core[3]) / 2, ((core[2] - core[0]) / 2) * welled, ((core[3] - core[1]) / 2) * welled],
      bridge,
      wobble: [amp, phase[0], amp * LIQUID.wobble.second, phase[1]],
    };
  };

  const draw = () => {
    const s = shapeNow();
    const { wavelength, speed, life } = LIQUID.ripple;
    const k = (Math.PI * 2) / wavelength;
    const opening = mode === "open";
    const slope = LIQUID.ripple.slope[opening ? 0 : 1];
    // Le front court de la pastille jusqu'au coin le plus lointain de la feuille.
    const [px, py] = s.pill;
    const far = Math.max(
      Math.hypot(target[0] - px, target[1] - py),
      Math.hypot(target[2] - px, target[1] - py),
      Math.hypot(target[0] - px, target[3] - py),
      Math.hypot(target[2] - px, target[3] - py)
    );
    const sweep = Math.min(1, since / LIQUID.sheen.seconds);
    const diagonal = Math.hypot(s.box[2] - s.box[0], s.box[3] - s.box[1]) / 2;
    const { drift, driftMax } = LIQUID.key;
    const shift = (v: number) => Math.max(-driftMax, Math.min(driftMax, v * drift));
    gl.uniform4f(at.uBox, ...s.box);
    gl.uniform4f(at.uRadii, ...s.radii);
    gl.uniform4f(at.uPill, ...s.pill);
    gl.uniform1f(at.uBridge, s.bridge);
    gl.uniform4f(at.uWobble, ...s.wobble);
    gl.uniform4f(at.uPanel, ...target);
    gl.uniform1f(at.uVeil, veil);
    gl.uniform3f(
      at.uFront,
      reveal * (far + LIQUID.front.band),
      LIQUID.front.band,
      opening ? LIQUID.front.gain * Math.sin(Math.PI * reveal) : 0
    );
    gl.uniform1f(at.uGloss, gloss);
    // Un front négatif : des vaguelettes partout (elles rentrent vers la pastille).
    gl.uniform4f(
      at.uRipple,
      // Elles s'effacent devant le contenu qui arrive.
      slope * Math.exp(-since / life) * (opening ? 1 - reveal : 1),
      k,
      (opening ? 1 : -1) * k * speed * since,
      opening ? speed * since : -1
    );
    gl.uniform2f(
      at.uSheen,
      (sweep * 2 - 1) * diagonal,
      opening ? LIQUID.sheen.gain * Math.sin(Math.PI * sweep) * gloss : 0
    );
    gl.uniform2f(at.uKeyShift, shift((vel[0] + vel[2]) / 2), shift((vel[1] + vel[3]) / 2));
    // Rentrée, la dernière goutte s'éteint dans la pastille.
    gl.uniform1f(at.uFade, opening ? 1 : smoothstep(0, LIQUID.vanish, progress));
    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Seule la région du liquide, de son ombre et de la pastille se calcule.
    const margin = LIQUID.shadow.reach + LIQUID.wobble.max * (1 + LIQUID.wobble.second);
    const x0 = Math.max(0, Math.floor((Math.min(s.box[0], core[0]) - margin) * dpr));
    const y0 = Math.max(0, Math.floor((Math.min(s.box[1], core[1]) - margin) * dpr));
    const x1 = Math.min(canvas.width, Math.ceil((Math.max(s.box[2], core[2]) + margin) * dpr));
    const y1 = Math.min(canvas.height, Math.ceil((Math.max(s.box[3], core[3]) + margin) * dpr));
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(x0, canvas.height - y1, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    panel.style.clipPath = outline(s, target[0], target[1], LIQUID.thin.width * gloss);
    if (opening && content) content.style.translate = `0 ${(LIQUID.rise * (1 - reveal)).toFixed(2)}px`;
  };

  // Le contenu de la carte arrive après coup (l'historique), la barre de défilement s'en va : on remesure.
  const observer = new ResizeObserver(() => {
    if (!running) return;
    if (measure()) draw();
    else finish();
  });

  const bounce = () => {
    if (bounced) return;
    bounced = true;
    source.animate({ scale: LIQUID.bounce.scale }, { duration: LIQUID.bounce.ms, easing: "ease-out" });
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    clearInterval(watchdog);
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("resize", onResize);
    canvas.remove();
    if (current === run) current = null;
  };

  const open = () => {
    if (opened) return;
    opened = true;
    // La feuille recouvre la pastille (écran bas) : la pastille repasse sous le voile.
    if (overlaps) delete source.dataset.liquidSource;
    onOpened();
  };

  /* La fin, au repos ou interrompue : la feuille est ouverte, ou rentrée. */
  function finish() {
    if (!running) return;
    stop();
    if (mode === "open") {
      panel.style.clipPath = "";
      content?.style.removeProperty("translate");
      fading?.finish();
      open();
    } else {
      delete source.dataset.liquidSource;
      bounce();
      resolveClose?.();
    }
  }

  const settled = (goal: Rect) =>
    pos.every((x, i) => Math.abs(x - goal[i]) < LIQUID.rest.distance && Math.abs(vel[i]) < LIQUID.rest.speed);

  const frame = () => {
    raf = 0;
    try {
      const now = performance.now();
      const real = now - last;
      const dt = Math.min(real / 1000, LIQUID.maxStep);
      last = now;
      lastWall = Date.now();
      framed = true;
      slowFrames = real > LIQUID.slow.ms ? slowFrames + 1 : 0;
      const springs = mode === "open" ? LIQUID.open : LIQUID.close;
      const goal = mode === "open" ? target : seed;
      for (let h = 0; h < dt; h += LIQUID.step) {
        const step = Math.min(LIQUID.step, dt - h);
        since += step;
        for (let i = 0; i < 4; i++) {
          const { freq, damping, delay } = springs[i];
          if (since < delay) continue;
          vel[i] += (freq * freq * (goal[i] - pos[i]) - 2 * damping * freq * vel[i]) * step;
          pos[i] += vel[i] * step;
        }
      }
      const speed = Math.max(Math.abs(vel[0]), Math.abs(vel[1]), Math.abs(vel[2]), Math.abs(vel[3]));
      const ease = (rate: number) => 1 - Math.exp(-rate * dt);
      // Avancement : 0 dans la pastille, 1 à la forme de la feuille.
      let span = 0;
      let left = 0;
      for (let i = 0; i < 4; i++) {
        span += Math.abs(target[i] - seed[i]);
        left += Math.abs(target[i] - pos[i]);
      }
      progress = Math.min(1, Math.max(0, 1 - left / (span || 1)));
      const topProgress = Math.min(1, Math.max(0, 1 - Math.abs(target[1] - pos[1]) / (Math.abs(target[1] - seed[1]) || 1)));
      const { form, drain, release, reach } = LIQUID.bridge;
      const calm = LIQUID.rest;
      if (mode === "open") {
        // Le contenu perce une fois le haut arrivé : au-dessus de la feuille, le liquide est plein.
        reveal += (smoothstep(LIQUID.clear[0], LIQUID.clear[1], Math.min(progress, topProgress)) - reveal) * ease(LIQUID.rates.reveal);
      } else {
        veil += (1 - veil) * ease(LIQUID.rates.cloud);
      }
      // Le verre s'efface à mesure que le contenu arrive, pas d'un coup à la fin.
      const glossGoal =
        mode === "close"
          ? 1
          : Math.max(1 - smoothstep(calm.glossFrom, 1, Math.min(reveal, progress)), Math.min(1, speed / calm.glossSpeed));
      const [from, to] = mode === "open" ? form : drain;
      const bridgeGoal = reach * smoothstep(from, to, progress) * (1 - smoothstep(release[0], release[1], progress));
      gloss += (glossGoal - gloss) * ease(LIQUID.rates.gloss);
      bridge += (bridgeGoal - bridge) * ease(LIQUID.rates.bridge);
      wobble += (LIQUID.wobble.gain * speed - wobble) * ease(LIQUID.wobble.rate);
      phase[0] += LIQUID.wobble.spin[0] * dt;
      phase[1] += LIQUID.wobble.spin[1] * dt;
      draw();
      const over = now - startedAt > LIQUID.maxSeconds * 1000 || slowFrames >= LIQUID.slow.frames;
      if (mode === "open") {
        if (reveal > LIQUID.opened) open();
        if (over || (settled(target) && reveal > 1 - calm.gloss && gloss < calm.gloss && bridge < calm.bridge && wobble < calm.wobble)) {
          finish();
          return;
        }
      } else {
        if (progress < LIQUID.bounce.at) bounce();
        if (over || (progress < calm.drained && bridge < calm.bridge)) {
          finish();
          return;
        }
      }
      raf = requestAnimationFrame(frame);
    } catch {
      finish();
    }
  };

  function onVisibility() {
    if (document.hidden) finish();
  }

  // L'écran tourne ou change de largeur : les mesures ne valent plus. La barre d'adresse qui bouge, si.
  function onResize() {
    if (window.innerWidth !== width) finish();
  }

  /* Le fond suit le liquide, en fondu joué par le compositeur. */
  const fade = (to: number, duration: number) => {
    const from = fading ? getComputedStyle(dim).opacity : "0";
    fading?.cancel();
    fading = dim.animate({ opacity: [from, String(to)] }, { duration, easing: "ease-in-out", fill: "forwards" });
  };

  const start = () => {
    running = true;
    framed = false;
    current = run;
    startedAt = performance.now();
    last = startedAt;
    lastWall = Date.now();
    slowFrames = 0;
    since = 0;
    source.dataset.liquidSource = "";
    observer.observe(panel);
    observer.observe(panel.parentElement!);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    panel.after(canvas);
    // Plus d'image depuis un moment (horloge réelle) : la feuille finit sans le liquide.
    watchdog = window.setInterval(() => {
      if (Date.now() - lastWall > (framed ? LIQUID.stall : LIQUID.firstFrame)) finish();
    }, LIQUID.stall);
    try {
      draw();
      raf = requestAnimationFrame(frame);
    } catch {
      finish();
    }
  };

  const run = { finish };
  const content = panel.firstElementChild instanceof HTMLElement ? panel.firstElementChild : null;
  fade(1, LIQUID.dim.open);
  start();

  return {
    close() {
      closing ??= new Promise<void>((resolve) => {
        if (status !== "ready" || document.hidden) {
          finish();
          resolve();
          return;
        }
        resolveClose = resolve;
        if (running) {
          mode = "close";
          since = 0;
          startedAt = performance.now();
          content?.style.removeProperty("translate");
          fade(0, LIQUID.dim.close);
          return;
        }
        // Posée : on repart de la feuille telle qu'elle est.
        if (!measure()) {
          delete source.dataset.liquidSource;
          resolve();
          return;
        }
        mode = "close";
        pos.splice(0, 4, ...target);
        vel.fill(0);
        progress = 1;
        reveal = 1;
        gloss = 0;
        current?.finish();
        fade(0, LIQUID.dim.close);
        start();
      });
      return closing;
    },
    dispose() {
      stop();
      // Le canevas est partagé : libéré seulement si aucune autre feuille ne s'en sert.
      if (!current) {
        canvas.width = 0;
        canvas.height = 0;
      }
      fading?.cancel();
      panel.style.clipPath = "";
      content?.style.removeProperty("translate");
      delete source.dataset.liquidSource;
    },
  };
}
