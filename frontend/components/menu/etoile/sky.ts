/*
 * Le ciel de L'Étoile : un seul canevas WebGL (three.js) derrière la carte,
 * sans image ni vidéo.
 *
 * Des milliers d'étoiles fines dans un volume que la caméra traverse
 * lentement : leur profondeur fait la parallaxe au défilement. Derrière, la
 * Voie lactée, calculée par lancer de rayons dans un disque de poussière
 * (émission, absorption, couloirs sombres), cuite une fois dans une texture
 * équirectangulaire, bande par bande, sans bloquer la page. De temps en
 * temps, une étoile filante. Changer de chapitre en lisant tourne doucement
 * le ciel ; un saut de la navigation passe en vitesse lumière : les étoiles
 * s'étirent en traînées décalées vers le bleu, un éclat, la page change au
 * pic, le ciel se repose ailleurs. Aucun astre, aucun zoom.
 */
import * as THREE from "three";

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const SKY = {
  seed: 7,
  /* Champ de vue vertical (degrés). */
  fov: 58,
  /* Étoiles du volume, par appareil (téléphone : écran tactile). */
  stars: { phone: 6000, desktop: 14000 },
  /* Profondeur du volume (unités) et distance de l'étoile la plus proche. */
  depth: 420,
  near: 6,
  /* Le volume déborde le champ de vue de cette part. */
  margin: 1.15,
  /* Rayon du cœur d'une étoile (px CSS), et gain des plus proches. */
  radius: [0.42, 1.05],
  nearRadius: 0.7,
  /* Un cœur jamais plus fin que tant de px réels : une étoile qui glisse ne crépite pas. */
  minPixels: 0.8,
  /* Éclat : exposant de la loi (beaucoup de faibles, peu de vives), plancher, éclat des plus lointaines. */
  brightCurve: 3.4,
  brightFloor: 0.1,
  farBright: 0.4,
  /* Halo : portée (fois le rayon), part de l'éclat. */
  halo: 6,
  haloGain: 0.05,
  /* Températures tirées (K), et part de leur couleur gardée : un ciel d'argent, à peine teinté. */
  temperature: [3600, 14000],
  tint: 0.32,
  /* Scintillement : amplitude (part de l'éclat), vitesse (rad/s). */
  twinkle: 0.34,
  twinkleSpeed: [0.35, 1.7],
  /* Les plus vives portent une croix à quatre branches, comme la marque : part, longueur (px), finesse (px), éclat. */
  glintShare: 0.014,
  glintLength: 3.2,
  glintWidth: 0.55,
  glintGain: 0.5,
  /* Croisière au repos (unités/s), dérive latérale (x, y, unités/s). */
  cruise: 1.4,
  drift: [0.22, 0.06],
  /* Parallaxe : unités de monde par px défilé. */
  parallax: 0.004,
  /* Rotation lente de la Voie lactée (rad/s). */
  spin: 0.0025,
  /*
   * Saut de la navigation : durée (ms), part de la durée au pic, vitesse
   * maximale (unités/s), courbes de l'accélération et du freinage
   * (exposants), longueur des traînées (s de vitesse), éclat au pic et sa
   * largeur (part de la durée), fenêtre où le ciel tourne autour du pic.
   */
  warp: { ms: 1500, peak: 0.5, speed: 1400, rise: 2, fall: 2.2, streak: 0.075, flash: 0.3, flashWidth: 0.1, turn: 0.12 },
  /* Couleur de la queue des traînées (décalage vers le bleu) et de l'éclat. */
  blueshift: [0.62, 0.74, 1],
  flashColor: [0.86, 0.89, 0.95],
  /* Chapitre atteint en lisant : le ciel tourne (ms), une poussée légère (unités/s). */
  glide: { ms: 2600, speed: 26 },
  /* Arrivée : on sort de l'hyperespace, freinage (ms) depuis cette vitesse. */
  arrival: { ms: 2600, speed: 220 },
  /* Pose du ciel par chapitre (0 = accueil) : rotations (rad) autour de x, y, z ; dorure (Champagnes). */
  poses: [
    { x: -0.04, y: 0.3, z: -0.62, gold: 0 },
    { x: 0.1, y: 1.1, z: 0.35, gold: 0 },
    { x: -0.22, y: 2, z: -0.25, gold: 0 },
    { x: 0.3, y: 2.9, z: 0.8, gold: 0 },
    { x: 0.05, y: -0.3, z: 0.55, gold: 0.8 },
  ],
  /* La dorure : sa teinte. */
  gold: [0.85, 0.72, 0.46],
  /*
   * Voie lactée cuite : largeur de la texture (px, hauteur moitié), pas de
   * marche par rayon, rangées par image, gain d'affichage, fondu d'arrivée (ms).
   */
  dust: {
    width: { phone: 2048, desktop: 2048 },
    steps: { phone: 72, desktop: 96 },
    rowsPerFrame: { phone: 16, desktop: 48 },
    gain: 2.1,
    fadeMs: 2400,
  },
  /*
   * Poussière d'étoiles de la Voie lactée : des points fins à l'infini, fixés
   * au ciel (pas de parallaxe), serrés dans la bande. Nombre par appareil,
   * demi-épaisseur de la bande (rad), part semée sur tout le ciel, poids du
   * bulbe, rayon (px) et éclat (plage).
   */
  bandStars: {
    count: { phone: 6000, desktop: 14000 },
    width: 0.11,
    scatter: 0.18,
    bulge: 0.55,
    radius: [0.32, 0.6],
    bright: [0.1, 0.6],
  },
  /* Vignettage : assombrissement des bords. */
  vignette: 0.55,
  /* Étoile filante : intervalle (ms), vitesse (px/s), longueur (px), vie (s), épaisseur (px), éclat ; départ dans le haut de l'écran. */
  shooting: {
    every: [6500, 14000],
    /* Au chapitre Shooters, le ciel en tire davantage. */
    everyShooters: [2200, 4500],
    shootersChapter: 3,
    speed: [900, 1500],
    length: [140, 280],
    life: [0.6, 1],
    width: 1.3,
    alpha: 0.85,
    from: { x: [0.1, 0.95], y: [0.55, 0.95] },
    /* Pente sous l'horizontale (rad). */
    angle: [0.3, 0.75],
  },
  dprCap: { phone: 1.5, desktop: 2 },
  /* Téléphone au repos : une image sur deux ; plein régime pendant un saut ou un défilement (ms après le dernier). */
  phoneFrameSkip: 2,
  scrollActiveMs: 300,
  /* Au-delà de cette moyenne d'image (ms, sur tant d'images), la résolution baisse une fois. */
  slowFrame: 26,
  slowSamples: 90,
  /* Écart maximal entre deux images (s) : un onglet repris ne fait pas sauter le ciel. */
  maxStep: 0.05,
} as const;

export interface Sky {
  /** Mène le ciel au chapitre `index` ; avec `onPeak`, en vitesse lumière, `onPeak` au pic. */
  goTo(index: number, onPeak?: () => void): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  gold: number;
}

/* ---------- Shaders ---------- */

const NOISE = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    sum += amp * noise3(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}
`;

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/*
 * La Voie lactée, vue de l'intérieur du disque : chaque texel est un rayon
 * qui traverse une couche d'étoiles (émission) et une couche plus mince de
 * poussière grumeleuse (absorption), le bulbe du centre dans l'axe -Z.
 */
const DUST_BAKE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vNdc;
${NOISE}
const float PI = 3.14159265;
void main() {
  vec2 uv = vNdc * 0.5 + 0.5;
  float lon = (uv.x - 0.5) * 2.0 * PI;
  float lat = (uv.y - 0.5) * PI;
  vec3 rd = vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon));
  const float reach = 9.0;
  float dt = reach / float(STEPS);
  float t = dt * 0.5;
  vec3 light = vec3(0.0);
  float transmit = 1.0;
  const vec3 core = vec3(0.0, 0.0, -7.0);
  for (int i = 0; i < STEPS; i++) {
    vec3 p = rd * t;
    float disk = exp(-p.y * p.y / 0.22);
    float lane = exp(-p.y * p.y / 0.03);
    vec3 b = (p - core) * vec3(1.0, 2.8, 1.0);
    float bulge = exp(-dot(b, b) / 4.0);
    float clouds = fbm(p * 1.3);
    float knots = pow(fbm(p * 4.2 + 11.0), 2.2);
    float emit = disk * (0.06 + clouds * clouds * 1.2 + knots * 1.6) + bulge * 1.8;
    float warmth = clamp(bulge * 1.3 + knots * 0.5, 0.0, 1.0);
    vec3 tint = mix(vec3(0.6, 0.67, 0.84), vec3(1.0, 0.94, 0.84), warmth);
    float dust = lane * smoothstep(0.36, 0.68, fbm(p * 2.4 + 4.0)) * 6.0;
    light += transmit * emit * tint * dt;
    transmit *= exp(-dust * dt);
    t += dt;
  }
  float haze = pow(fbm(rd * 1.6 + 23.0), 3.0) * 0.12;
  light += haze * vec3(0.66, 0.71, 0.82);
  gl_FragColor = vec4(light * 0.07, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vNdc;
uniform sampler2D uDust;
uniform mat3 uRot;
uniform vec2 uTan;
uniform float uGain;
uniform float uGold;
uniform vec3 uGoldTint;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform float uVignette;
uniform float uAspect;
uniform float uTime;
const float PI = 3.14159265;
const vec3 INK = vec3(0.0196, 0.0196, 0.0275);
float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec3 dir = normalize(uRot * vec3(vNdc.x * uTan.x, vNdc.y * uTan.y, -1.0));
  vec2 uv = vec2(atan(dir.x, -dir.z) / (2.0 * PI) + 0.5, asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5);
  vec3 dust = texture2D(uDust, uv).rgb * uGain;
  float lum = dot(dust, vec3(0.2126, 0.7152, 0.0722));
  dust = mix(dust, lum * uGoldTint * 1.25, uGold);
  vec2 q = vNdc * vec2(uAspect, 1.0);
  float edge = smoothstep(0.35, 1.5, length(vNdc));
  vec3 col = INK + dust * (1.0 - uVignette * edge);
  col += uFlashColor * uFlash * exp(-dot(q, q) * 1.6);
  col += (hash2(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

/*
 * Une étoile : un quad tendu en espace écran entre sa position et celle
 * qu'elle avait (la traînée, nulle au repos) ; le fragment mesure sa
 * distance au segment, un cœur gaussien, un halo, une croix pour les vives.
 */
const STAR_VERT = /* glsl */ `
attribute vec2 corner;
attribute vec3 aPos;
attribute vec4 aStar;
attribute vec3 aColor;
attribute float aGlint;
uniform vec2 uRes;
uniform float uFocal;
uniform vec3 uBox;
uniform float uNear;
uniform float uTravel;
uniform vec2 uShift;
uniform float uStreak;
uniform float uTime;
uniform float uPixel;
uniform float uBoost;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vR;
varying float vI;
varying float vG;
varying vec3 vC;
void main() {
  float dist = uNear + mod(aPos.z * uBox.z - uTravel, uBox.z);
  vec2 xy = mod(aPos.xy * uBox.xy - uShift + uBox.xy, 2.0 * uBox.xy) - uBox.xy;
  vec2 center = uRes * 0.5;
  vec2 head = center + uFocal * xy / dist;
  vec2 tail = center + uFocal * xy / (dist + uStreak);
  float closeness = 1.0 - (dist - uNear) / uBox.z;
  float r = aStar.x * (1.0 + NEAR_RADIUS * closeness * closeness);
  float rMin = MIN_PIXELS / uPixel;
  float energy = r < rMin ? (r * r) / (rMin * rMin) : 1.0;
  r = max(r, rMin);
  float fade = smoothstep(uBox.z, uBox.z * 0.8, dist - uNear) * smoothstep(uNear, uNear * 2.5, dist);
  float twinkle = 1.0 - TWINKLE + TWINKLE * (0.5 + 0.5 * sin(aStar.z + uTime * aStar.w));
  vI = aStar.y * energy * fade * twinkle * mix(FAR_BRIGHT, 1.0, closeness) * uBoost;
  vR = r;
  vG = aGlint;
  vC = aColor;
  float reach = r * HALO + aGlint * GLINT_LENGTH * 4.0;
  vec2 axis = head - tail;
  float len = length(axis);
  vec2 dir = len > 0.001 ? axis / len : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  vec2 p = (corner.x < 0.0 ? tail - dir * reach : head + dir * reach) + side * corner.y * reach;
  vP = p;
  vA = tail;
  vB = head;
  gl_Position = vI > 0.002 ? vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const STAR_FRAG = /* glsl */ `
precision highp float;
uniform float uStreakMix;
uniform vec3 uBlueshift;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vR;
varying float vI;
varying float vG;
varying vec3 vC;
void main() {
  vec2 ab = vB - vA;
  float l2 = dot(ab, ab);
  float h = l2 > 0.0001 ? clamp(dot(vP - vA, ab) / l2, 0.0, 1.0) : 1.0;
  float d = length(vP - (vA + ab * h));
  float core = exp(-d * d / (vR * vR));
  float halo = HALO_GAIN * exp(-d / (vR * HALO * 0.3));
  float trail = mix(1.0, 0.08 + 0.92 * h * h, smoothstep(0.0, 4.0, sqrt(l2)));
  float light = (core + halo) * trail;
  vec2 q = abs(vP - vB);
  float glint = exp(-q.x / GLINT_LENGTH) * exp(-q.y * q.y / (GLINT_WIDTH * GLINT_WIDTH))
    + exp(-q.y / GLINT_LENGTH) * exp(-q.x * q.x / (GLINT_WIDTH * GLINT_WIDTH));
  light += vG * glint * GLINT_GAIN * (1.0 - uStreakMix);
  vec3 color = mix(vC, uBlueshift, uStreakMix * (1.0 - h));
  gl_FragColor = vec4(color * light * vI, 1.0);
}
`;

/* Une étoile de la bande : une direction du ciel, tournée avec lui, projetée sans traînée. */
const BAND_VERT = /* glsl */ `
attribute vec2 corner;
attribute vec3 aDir;
attribute vec4 aStar;
attribute vec3 aColor;
uniform vec2 uRes;
uniform float uFocal;
uniform mat3 uToView;
uniform float uTime;
uniform float uPixel;
uniform float uFade;
varying vec2 vP;
varying vec2 vA;
varying vec2 vB;
varying float vR;
varying float vI;
varying float vG;
varying vec3 vC;
void main() {
  vec3 v = uToView * aDir;
  vec2 head = uRes * 0.5 + uFocal * v.xy / max(-v.z, 0.0001);
  float r = aStar.x;
  float rMin = MIN_PIXELS / uPixel;
  float energy = r < rMin ? (r * r) / (rMin * rMin) : 1.0;
  r = max(r, rMin);
  float twinkle = 1.0 - TWINKLE * 0.5 + TWINKLE * 0.5 * sin(aStar.z + uTime * aStar.w);
  vI = v.z < 0.0 ? aStar.y * energy * twinkle * uFade : 0.0;
  vR = r;
  vG = 0.0;
  vC = aColor;
  vec2 p = head + corner * r * 3.0;
  vP = p;
  vA = head;
  vB = head;
  gl_Position = vI > 0.002 ? vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/* Une étoile filante : un quad de la queue à la tête, effilé, qui s'allume puis s'éteint. */
const SHOOTING_VERT = /* glsl */ `
attribute vec2 corner;
attribute vec2 aFrom;
attribute vec2 aVel;
attribute float aBirth;
attribute float aLife;
attribute float aLen;
uniform vec2 uRes;
uniform float uTime;
uniform float uWidth;
varying float vAlong;
varying float vAcross;
varying float vLife;
void main() {
  float age = (uTime - aBirth) / aLife;
  vec2 dir = normalize(aVel);
  vec2 head = aFrom + aVel * (uTime - aBirth);
  vec2 tail = head - dir * aLen * smoothstep(0.0, 0.3, age);
  vec2 p = mix(tail, head, corner.x) + vec2(-dir.y, dir.x) * corner.y * uWidth * 2.0;
  vAlong = corner.x;
  vAcross = corner.y;
  vLife = pow(sin(3.14159265 * clamp(age, 0.0, 1.0)), 0.6);
  gl_Position = age > 0.0 && age < 1.0 ? vec4(p / uRes * 2.0 - 1.0, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const SHOOTING_FRAG = /* glsl */ `
precision highp float;
uniform float uAlpha;
varying float vAlong;
varying float vAcross;
varying float vLife;
void main() {
  float taper = mix(0.12, 1.0, vAlong);
  float across = exp(-pow(vAcross / taper, 2.0) * 4.0);
  float light = across * pow(vAlong, 2.4) * vLife * uAlpha;
  vec3 color = mix(vec3(0.7, 0.78, 1.0), vec3(1.0), vAlong);
  gl_FragColor = vec4(color * light, 1.0);
}
`;

/* ---------- Outils ---------- */

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Couleur d'un corps noir (approximation de Tanner Helland), composantes 0–1. */
function blackbody(kelvin: number): [number, number, number] {
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (v: number) => Math.min(1, Math.max(0, v / 255));
  return [c(r), c(g), c(b)];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const between = (rand: () => number, [min, max]: readonly [number, number]) => min + rand() * (max - min);
const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
  gold: lerp(a.gold, b.gold, t),
});
const vec3 = ([x, y, z]: readonly [number, number, number]) => new THREE.Vector3(x, y, z);

/* Un quad instancié, ses coins dans l'ordre (bas gauche, bas droit, haut droit, haut gauche). */
function quad(instances: number, corners: readonly number[]) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("corner", new THREE.BufferAttribute(new Float32Array(corners), 2));
  geometry.instanceCount = instances;
  return geometry;
}

const additive = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneFactor,
} as const;

/* ---------- Le ciel ---------- */

export function createSky(
  host: HTMLElement,
  { reducedMotion, chapter }: { reducedMotion: boolean; chapter: number },
): Sky | null {
  const phone = matchMedia("(pointer: coarse)").matches;
  const device = phone ? "phone" : "desktop";
  const canvas = document.createElement("canvas");
  canvas.className = "et-sky-canvas";
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  host.appendChild(canvas);
  renderer.setClearColor(0x050507, 1);
  renderer.autoClear = true;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, SKY.dprCap[device]);
  renderer.setPixelRatio(pixelRatio);

  const rand = mulberry32(SKY.seed);
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  const fullscreen = new THREE.BufferGeometry();
  fullscreen.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));

  /* La Voie lactée cuite : demi-flottants si possible, sinon 8 bits (le tramage d'affichage masque les paliers). */
  const dustWidth = SKY.dust.width[device];
  const floatable =
    renderer.extensions.has("EXT_color_buffer_half_float") || renderer.extensions.has("EXT_color_buffer_float");
  const dustTarget = new THREE.WebGLRenderTarget(dustWidth, dustWidth / 2, {
    type: floatable ? THREE.HalfFloatType : THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  const bakeMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: DUST_BAKE_FRAG,
    defines: { STEPS: SKY.dust.steps[device] },
    depthTest: false,
    depthWrite: false,
  });
  const bakeScene = new THREE.Scene();
  const bakeMesh = new THREE.Mesh(fullscreen, bakeMaterial);
  bakeMesh.frustumCulled = false;
  bakeScene.add(bakeMesh);
  let bakedRows = 0;

  const skyUniforms = {
    uDust: { value: dustTarget.texture },
    uRot: { value: new THREE.Matrix3() },
    uTan: { value: new THREE.Vector2() },
    uGain: { value: 0 },
    uGold: { value: 0 },
    uGoldTint: { value: vec3(SKY.gold) },
    uFlash: { value: 0 },
    uFlashColor: { value: vec3(SKY.flashColor) },
    uVignette: { value: SKY.vignette },
    uAspect: { value: 1 },
    uTime: { value: 0 },
  };
  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: skyUniforms,
    depthTest: false,
    depthWrite: false,
  });
  const skyMesh = new THREE.Mesh(fullscreen, skyMaterial);
  skyMesh.frustumCulled = false;
  skyMesh.renderOrder = 0;
  scene.add(skyMesh);

  /* Les étoiles. */
  const count = SKY.stars[device];
  const positions = new Float32Array(count * 3);
  const stats = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const glints = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([rand() * 2 - 1, rand() * 2 - 1, rand()], i * 3);
    const glint = rand() < SKY.glintShare;
    const light = glint ? 1 : SKY.brightFloor + (1 - SKY.brightFloor) * rand() ** SKY.brightCurve;
    const radius = lerp(SKY.radius[0], SKY.radius[1], light ** 1.5);
    stats.set([radius, light, rand() * Math.PI * 2, between(rand, SKY.twinkleSpeed)], i * 4);
    const [r, g, b] = blackbody(between(rand, SKY.temperature));
    colors.set([lerp(1, r, SKY.tint), lerp(1, g, SKY.tint), lerp(1, b, SKY.tint)], i * 3);
    glints[i] = glint ? 1 : 0;
  }
  const starGeometry = quad(count, [-1, -1, 1, -1, 1, 1, -1, 1]);
  starGeometry.setAttribute("aPos", new THREE.InstancedBufferAttribute(positions, 3));
  starGeometry.setAttribute("aStar", new THREE.InstancedBufferAttribute(stats, 4));
  starGeometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  starGeometry.setAttribute("aGlint", new THREE.InstancedBufferAttribute(glints, 1));
  const starUniforms = {
    uRes: { value: new THREE.Vector2() },
    uFocal: { value: 1 },
    uBox: { value: new THREE.Vector3(1, 1, SKY.depth) },
    uNear: { value: SKY.near },
    uTravel: { value: 0 },
    uShift: { value: new THREE.Vector2() },
    uStreak: { value: 0 },
    uStreakMix: { value: 0 },
    uBlueshift: { value: vec3(SKY.blueshift) },
    uTime: { value: 0 },
    uPixel: { value: pixelRatio },
    uBoost: { value: 1 },
  };
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: starUniforms,
    defines: {
      NEAR_RADIUS: SKY.nearRadius.toFixed(4),
      MIN_PIXELS: SKY.minPixels.toFixed(4),
      TWINKLE: (reducedMotion ? 0 : SKY.twinkle).toFixed(4),
      FAR_BRIGHT: SKY.farBright.toFixed(4),
      HALO: SKY.halo.toFixed(4),
      HALO_GAIN: SKY.haloGain.toFixed(4),
      GLINT_LENGTH: SKY.glintLength.toFixed(4),
      GLINT_WIDTH: SKY.glintWidth.toFixed(4),
      GLINT_GAIN: SKY.glintGain.toFixed(4),
    },
    ...additive,
  });
  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  starMesh.frustumCulled = false;
  starMesh.renderOrder = 1;
  scene.add(starMesh);

  /* La poussière d'étoiles de la Voie lactée, tirée dans le repère galactique de la cuisson (disque y = 0, bulbe vers -Z). */
  const band = SKY.bandStars;
  const bandCount = band.count[device];
  const dirs = new Float32Array(bandCount * 3);
  const bandStats = new Float32Array(bandCount * 4);
  const bandColors = new Float32Array(bandCount * 3);
  for (let i = 0; i < bandCount; i++) {
    const scattered = rand() < band.scatter;
    /* Latitude gaussienne (Box-Muller) ; longitude resserrée vers le bulbe pour une part des étoiles. */
    const gauss = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
    const lat = scattered ? Math.asin(rand() * 2 - 1) : gauss * band.width;
    const toward = !scattered && rand() < band.bulge;
    const lon = toward ? (rand() - 0.5) * (rand() + rand()) * Math.PI * 0.5 : (rand() * 2 - 1) * Math.PI;
    dirs.set([Math.cos(lat) * Math.sin(lon), Math.sin(lat), -Math.cos(lat) * Math.cos(lon)], i * 3);
    bandStats.set(
      [between(rand, band.radius), between(rand, band.bright) * rand() ** 1.5, rand() * Math.PI * 2, between(rand, SKY.twinkleSpeed)],
      i * 4,
    );
    const [r, g, b] = blackbody(between(rand, SKY.temperature));
    bandColors.set([lerp(1, r, SKY.tint), lerp(1, g, SKY.tint), lerp(1, b, SKY.tint)], i * 3);
  }
  const bandGeometry = quad(bandCount, [-1, -1, 1, -1, 1, 1, -1, 1]);
  bandGeometry.setAttribute("aDir", new THREE.InstancedBufferAttribute(dirs, 3));
  bandGeometry.setAttribute("aStar", new THREE.InstancedBufferAttribute(bandStats, 4));
  bandGeometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(bandColors, 3));
  const bandUniforms = {
    uRes: starUniforms.uRes,
    uFocal: starUniforms.uFocal,
    uPixel: starUniforms.uPixel,
    uTime: starUniforms.uTime,
    uStreakMix: starUniforms.uStreakMix,
    uBlueshift: starUniforms.uBlueshift,
    uToView: { value: new THREE.Matrix3() },
    uFade: { value: 0 },
  };
  const bandMaterial = new THREE.ShaderMaterial({
    vertexShader: BAND_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: bandUniforms,
    defines: starMaterial.defines,
    ...additive,
  });
  const bandMesh = new THREE.Mesh(bandGeometry, bandMaterial);
  bandMesh.frustumCulled = false;
  bandMesh.renderOrder = 1;
  scene.add(bandMesh);

  /* Les étoiles filantes : une seule à la fois, sa place réécrite à chaque départ. */
  /* Le quad de l'étoile filante va de la queue (0) à la tête (1). */
  const shootingGeometry = quad(1, [0, -1, 1, -1, 1, 1, 0, 1]);
  const shootingAttrs = {
    aFrom: new THREE.InstancedBufferAttribute(new Float32Array(2), 2),
    aVel: new THREE.InstancedBufferAttribute(new Float32Array(2), 2),
    aBirth: new THREE.InstancedBufferAttribute(new Float32Array([-10]), 1),
    aLife: new THREE.InstancedBufferAttribute(new Float32Array([1]), 1),
    aLen: new THREE.InstancedBufferAttribute(new Float32Array(1), 1),
  };
  for (const [name, attr] of Object.entries(shootingAttrs)) shootingGeometry.setAttribute(name, attr);
  const shootingUniforms = {
    uRes: starUniforms.uRes,
    uTime: { value: 0 },
    uWidth: { value: SKY.shooting.width },
    uAlpha: { value: SKY.shooting.alpha },
  };
  const shootingMaterial = new THREE.ShaderMaterial({
    vertexShader: SHOOTING_VERT,
    fragmentShader: SHOOTING_FRAG,
    uniforms: shootingUniforms,
    ...additive,
  });
  const shootingMesh = new THREE.Mesh(shootingGeometry, shootingMaterial);
  shootingMesh.frustumCulled = false;
  shootingMesh.renderOrder = 2;
  shootingMesh.visible = !reducedMotion;
  scene.add(shootingMesh);

  /* ---------- État ---------- */
  const poses = SKY.poses as readonly Pose[];
  const last = poses.length - 1;
  let target = Math.max(0, Math.min(last, chapter));
  let pose: Pose = { ...poses[target] };
  let time = 0;
  let travel = 0;
  let driftX = 0;
  let driftY = 0;
  let raf = 0;
  let tick = 0;
  let lastNow = 0;
  let paused = false;
  let lost = false;
  let shown = false;
  let dirty = true;
  let fadeStart = -1;
  let scrollActiveUntil = 0;
  let slowSum = 0;
  let slowCount = 0;
  let width = 0;
  let height = 0;
  let nextShooting = SKY.shooting.every[0] / 1000;
  let warp: { start: number; from: Pose; to: number; onPeak: (() => void) | null } | null = null;
  let glide: { start: number; from: Pose; to: number } | null = null;
  const arrival = reducedMotion ? null : { start: 0 };
  const euler = new THREE.Euler();
  const rotation = new THREE.Matrix4();

  const firePeak = () => {
    const callback = warp?.onPeak;
    if (warp) warp.onPeak = null;
    callback?.();
  };
  /* Un saut abrégé (onglet caché, feuille ouverte) : le contenu change, le ciel se pose. */
  const settle = () => {
    if (warp) {
      firePeak();
      pose = { ...poses[warp.to] };
      warp = null;
    }
    if (glide) {
      pose = { ...poses[glide.to] };
      glide = null;
    }
    dirty = true;
  };

  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const tanY = Math.tan(((SKY.fov / 2) * Math.PI) / 180);
    const focal = height / 2 / tanY;
    starUniforms.uRes.value.set(width, height);
    starUniforms.uFocal.value = focal;
    starUniforms.uPixel.value = pixelRatio;
    const reach = SKY.depth + SKY.near;
    starUniforms.uBox.value.set(((width / 2) / focal) * reach * SKY.margin, tanY * reach * SKY.margin, SKY.depth);
    skyUniforms.uTan.value.set(tanY * (width / height), tanY);
    skyUniforms.uAspect.value = width / height;
    dirty = true;
    kick();
  };

  const spawnShooting = () => {
    const s = SKY.shooting;
    const angle = between(rand, s.angle);
    const speed = between(rand, s.speed);
    const sign = rand() < 0.5 ? -1 : 1;
    shootingAttrs.aFrom.array.set([width * between(rand, s.from.x), height * between(rand, s.from.y)]);
    shootingAttrs.aVel.array.set([sign * Math.cos(angle) * speed, -Math.sin(angle) * speed]);
    shootingAttrs.aBirth.array[0] = time;
    shootingAttrs.aLife.array[0] = between(rand, s.life);
    shootingAttrs.aLen.array[0] = between(rand, s.length);
    for (const attr of Object.values(shootingAttrs)) attr.needsUpdate = true;
    nextShooting = time + shootingAttrs.aLife.array[0] + between(rand, target === s.shootersChapter ? s.everyShooters : s.every) / 1000;
  };

  /* Une bande de la Voie lactée par image : la page reste fluide pendant la cuisson. */
  const bakeStep = () => {
    const rows = SKY.dust.rowsPerFrame[device];
    dustTarget.scissor.set(0, bakedRows, dustWidth, rows);
    dustTarget.scissorTest = true;
    renderer.setRenderTarget(dustTarget);
    renderer.render(bakeScene, camera);
    renderer.setRenderTarget(null);
    dustTarget.scissorTest = false;
    bakedRows += rows;
    if (bakedRows >= dustWidth / 2) fadeStart = time;
  };

  const update = (dt: number, now: number) => {
    time += dt;
    let speed = reducedMotion ? 0 : SKY.cruise;
    let streakMix = 0;
    let flash = 0;
    if (arrival) {
      const p = clamp01((time - arrival.start) / (SKY.arrival.ms / 1000));
      speed += SKY.arrival.speed * (1 - p) ** 3;
    }
    if (glide) {
      const p = clamp01((time - glide.start) / (SKY.glide.ms / 1000));
      pose = mixPose(glide.from, poses[glide.to], ease(p));
      speed += SKY.glide.speed * Math.sin(Math.PI * p);
      if (p >= 1) glide = null;
    }
    if (warp) {
      const w = SKY.warp;
      const p = clamp01((time - warp.start) / (w.ms / 1000));
      const s = p < w.peak ? (p / w.peak) ** w.rise : (1 - (p - w.peak) / (1 - w.peak)) ** w.fall;
      speed += w.speed * s;
      streakMix = s;
      flash = w.flash * Math.exp(-(((p - w.peak) / w.flashWidth) ** 2));
      pose = mixPose(warp.from, poses[warp.to], smooth(clamp01((p - w.peak + w.turn) / (2 * w.turn))));
      if (p >= w.peak) firePeak();
      if (p >= 1) warp = null;
    }
    const extra = speed - (reducedMotion ? 0 : SKY.cruise);
    travel = (travel + speed * dt) % SKY.depth;
    const box = starUniforms.uBox.value;
    driftX = (driftX + SKY.drift[0] * dt) % (2 * box.x);
    driftY = (driftY + SKY.drift[1] * dt) % (2 * box.y);
    const parallax = reducedMotion ? 0 : (window.scrollY * SKY.parallax) % (2 * box.y);
    starUniforms.uTravel.value = travel;
    starUniforms.uShift.value.set(driftX, driftY - parallax);
    starUniforms.uStreak.value = extra * SKY.warp.streak;
    starUniforms.uStreakMix.value = Math.max(streakMix, clamp01(extra / SKY.warp.speed));
    starUniforms.uBoost.value = 1 + streakMix * 0.6;
    starUniforms.uTime.value = time;
    shootingUniforms.uTime.value = time;
    if (!reducedMotion && !warp && time >= nextShooting) spawnShooting();

    euler.set(pose.x, pose.y + (reducedMotion ? 0 : time * SKY.spin), pose.z, "YXZ");
    rotation.makeRotationFromEuler(euler);
    skyUniforms.uRot.value.setFromMatrix4(rotation);
    skyUniforms.uGold.value = pose.gold;
    skyUniforms.uFlash.value = flash;
    skyUniforms.uTime.value = now / 1000;
    const fade = fadeStart < 0 ? 0 : reducedMotion ? 1 : clamp01((time - fadeStart) / (SKY.dust.fadeMs / 1000));
    skyUniforms.uGain.value = SKY.dust.gain * smooth(fade);
    /* La bande tourne avec le ciel ; elle s'efface dans la vitesse lumière, où seules comptent les traînées. */
    bandUniforms.uToView.value.copy(skyUniforms.uRot.value).transpose();
    bandUniforms.uFade.value = (1 - streakMix) * smooth(fade);
  };

  /* Une seule baisse de résolution si les images tardent (téléphone ancien). */
  const watchBudget = (delta: number) => {
    if (slowCount < 0 || pixelRatio <= 1) return;
    slowSum += delta;
    if (++slowCount < SKY.slowSamples) return;
    if (slowSum / slowCount > SKY.slowFrame) {
      pixelRatio = 1;
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
    slowCount = -1;
  };

  const baking = () => bakedRows < dustWidth / 2;
  /* En mouvement réduit, une image par changement (cuisson, recadrage, chapitre), puis plus rien. */
  const animating = () => !reducedMotion || baking() || dirty;

  const frame = (now: number) => {
    raf = 0;
    if (paused || lost || document.hidden || !width) return;
    const busy = Boolean(warp || glide) || now < scrollActiveUntil || baking();
    const delta = lastNow ? now - lastNow : 0;
    raf = requestAnimationFrame(frame);
    if (phone && !busy && tick++ % SKY.phoneFrameSkip) return;
    const step = Math.min(delta / 1000, SKY.maxStep * (phone && !busy ? SKY.phoneFrameSkip : 1));
    lastNow = now;
    if (!busy && delta) watchBudget(delta / (phone ? SKY.phoneFrameSkip : 1));
    if (baking()) bakeStep();
    update(reducedMotion ? 0 : step, now);
    renderer.render(scene, camera);
    dirty = false;
    if (!shown) {
      shown = true;
      canvas.dataset.on = "";
    }
    if (!animating()) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  function kick() {
    if (raf || paused || lost || document.hidden) return;
    lastNow = 0;
    raf = requestAnimationFrame(frame);
  }
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const onVisibility = () => {
    if (document.hidden) {
      settle();
      stop();
    } else kick();
  };
  const onScroll = () => {
    scrollActiveUntil = performance.now() + SKY.scrollActiveMs;
    if (!reducedMotion) kick();
  };
  /* Contexte perdu : le dégradé CSS de .et-sky reprend ; rendu, tout se recuit. */
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    settle();
    stop();
    delete canvas.dataset.on;
    shown = false;
  };
  const onRestored = () => {
    lost = false;
    bakedRows = 0;
    fadeStart = -1;
    dirty = true;
    kick();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("scroll", onScroll, { passive: true });
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    goTo(index, onPeak) {
      const to = Math.max(0, Math.min(last, index));
      if (onPeak) {
        if (warp) firePeak();
        glide = null;
        target = to;
        if (reducedMotion || paused || lost || document.hidden || !width) {
          pose = { ...poses[to] };
          dirty = true;
          kick();
          onPeak();
          return;
        }
        warp = { start: time, from: { ...pose }, to, onPeak };
        kick();
        return;
      }
      if (to === target) return;
      target = to;
      if (warp) {
        warp.to = to;
        return;
      }
      if (reducedMotion) {
        pose = { ...poses[to] };
        dirty = true;
      } else glide = { start: time, from: { ...pose }, to };
      kick();
    },
    setPaused(next) {
      paused = next;
      if (paused) {
        settle();
        stop();
      } else kick();
    },
    dispose() {
      stop();
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      fullscreen.dispose();
      starGeometry.dispose();
      bandGeometry.dispose();
      bandMaterial.dispose();
      shootingGeometry.dispose();
      bakeMaterial.dispose();
      skyMaterial.dispose();
      starMaterial.dispose();
      shootingMaterial.dispose();
      dustTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
