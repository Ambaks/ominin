/*
 * Le trou noir du panier, posé sur le compteur de la barre de commande :
 * rendu par lancer de rayons, pixel par pixel. Chaque rayon suit une
 * géodésique de Schwarzschild (approximation de Binet) : happé sous
 * l'horizon il reste noir ; s'il traverse le disque d'accrétion, il en prend
 * la lumière (rotation képlérienne, effet Doppler du côté qui vient vers
 * nous). L'anneau de photons et le dessus du disque replié derrière l'ombre
 * naissent de la seule courbure des rayons. Il grossit avec le panier ; chaque
 * ajout emballe le disque, qui revient à son régime. Sans WebGL, un disque
 * en dégradés CSS (.et-hole-disk) ; en mouvement réduit, une image fixe.
 */
import * as THREE from "three";

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const BLACK_HOLE = {
  /* Échelle du disque : panier d'un article → panier plein. */
  scale: [0.9, 1],
  /* Nombre d'articles à partir duquel le trou noir a sa taille maximale. */
  fullAt: 10,
  /* Un ajout : retour au régime (s), vitesse de rotation au pic, surcroît d'éclat au pic. */
  pulseSeconds: 1.1,
  pulseRate: 5,
  pulseGlow: 0.9,
  /* Rotation du disque au repos (rad/s au bord intérieur). */
  spin: 1.6,
  /* Caméra : élévation au-dessus du disque (rad), distance, demi-champ (unités, rayon de l'horizon = 1). */
  elevation: 0.24,
  distance: 26,
  field: 10.4,
  /* Disque : rayons intérieur et extérieur, éclat, part de lumière gagnée du côté qui vient vers nous. */
  disk: [2.6, 8.8],
  brightness: 2.4,
  beaming: 0.15,
  /* Opacité du disque par unité d'éclat : un disque épais cache l'ombre derrière lui. */
  opacity: 2.5,
  /* Décroissance de l'éclat avec le rayon (exposant), profondeur des sillons du disque (0–1). */
  falloff: 1.6,
  rings: 0.1,
  /* Pas de marche par rayon ; rayons par pixel, par côté (2 → 4 rayons, bords lissés). */
  steps: 160,
  samples: 2,
  /* Pas de marche : part de la distance au trou, bornes. */
  step: { scale: 0.08, min: 0.02, max: 1.2 },
  /* Le disque tourne lentement : une image sur tant suffit. */
  frameSkip: 2,
  /* Écart maximal entre deux images (s) : un onglet repris ne fait pas bondir le disque. */
  maxStep: 0.1,
  dprCap: 2,
} as const;

export interface BlackHole {
  setCount(count: number): void;
  pulse(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const VERT = /* glsl */ `
varying vec2 vNdc;
void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
varying vec2 vNdc;
uniform float uPhase;
uniform float uGlow;
uniform float uElevation;
uniform float uDistance;
uniform float uField;
uniform vec2 uDisk;
uniform vec2 uRes;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
/* La lumière du disque au point (x, z) : chaude et dense au bord intérieur, striée par la rotation. */
vec4 disk(vec3 hit, vec3 ray) {
  float r = length(hit.xz);
  if (r < uDisk.x || r > uDisk.y) return vec4(0.0);
  float angle = atan(hit.z, hit.x);
  float orbit = angle + uPhase * pow(uDisk.x / r, 1.5);
  vec2 swirl = vec2(cos(orbit), sin(orbit)) * r;
  float streaks = noise(swirl * 1.6) * 0.6 + noise(swirl * 4.1 + 7.0) * 0.4;
  float rings = 1.0 - RINGS + RINGS * sin(r * 9.0 + streaks * 3.0);
  float edge = smoothstep(uDisk.x, uDisk.x + 0.35, r) * (1.0 - smoothstep(uDisk.y - 2.6, uDisk.y, r));
  float falloff = pow(uDisk.x / r, FALLOFF);
  vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));
  float beaming = pow(clamp(1.0 + BEAMING * dot(tangent, -ray), 0.2, 2.0), 3.0);
  float light = BRIGHTNESS * edge * falloff * (0.35 + 0.65 * streaks) * rings * beaming * (1.0 + uGlow);
  vec3 color = mix(vec3(0.56, 0.6, 0.7), vec3(1.0, 0.97, 0.92), clamp(light * 0.8, 0.0, 1.0));
  return vec4(color * light, clamp(light * OPACITY, 0.0, 1.0));
}
/* Un rayon : de l'œil, à travers le point ndc de l'écran, jusqu'à l'horizon, au disque ou au large. */
vec4 trace(vec2 ndc) {
  vec3 eye = vec3(0.0, sin(uElevation), -cos(uElevation)) * uDistance;
  vec3 forward = normalize(-eye);
  vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, forward);
  vec3 ray = normalize(forward * uDistance + (ndc.x * right + ndc.y * up) * uField);
  vec3 p = eye;
  vec3 c = cross(p, ray);
  float h2 = dot(c, c);
  vec3 color = vec3(0.0);
  float alpha = 0.0;
  for (int i = 0; i < STEPS; i++) {
    float r2 = dot(p, p);
    if (r2 < 1.0) {
      alpha = 1.0;
      break;
    }
    float r = sqrt(r2);
    float dt = clamp(STEP_SCALE * r, STEP_MIN, STEP_MAX);
    vec3 next = p + ray * dt;
    /* Binet : la courbure d'un rayon de lumière autour d'une masse, en 3/2 h² / r⁵ (rayon de l'horizon = 1). */
    ray = normalize(ray - 1.5 * h2 * p / (r2 * r2 * r) * dt);
    if (p.y * next.y < 0.0) {
      vec4 d = disk(mix(p, next, p.y / (p.y - next.y)), ray);
      color += (1.0 - alpha) * d.rgb;
      alpha += (1.0 - alpha) * d.a;
    }
    p = next;
    if (r > uDistance * 1.2 || alpha > 0.99) break;
  }
  return vec4(color, alpha);
}
void main() {
  vec2 pixel = 2.0 / uRes;
  vec4 sum = vec4(0.0);
  for (int x = 0; x < SAMPLES; x++)
    for (int y = 0; y < SAMPLES; y++)
      sum += trace(vNdc + (vec2(x, y) + 0.5 - float(SAMPLES) * 0.5) / float(SAMPLES) * pixel);
  gl_FragColor = sum / float(SAMPLES * SAMPLES);
}
`;

export function createBlackHole(host: HTMLElement, { reducedMotion }: { reducedMotion: boolean }): BlackHole {
  const canvas = document.createElement("canvas");
  canvas.className = "et-hole-gl";
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  } catch {
    renderer = null;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const uniforms = {
    uPhase: { value: 0 },
    uGlow: { value: 0 },
    uElevation: { value: BLACK_HOLE.elevation },
    uDistance: { value: BLACK_HOLE.distance },
    uField: { value: BLACK_HOLE.field },
    uDisk: { value: new THREE.Vector2(...BLACK_HOLE.disk) },
    uRes: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    defines: {
      STEPS: BLACK_HOLE.steps,
      SAMPLES: BLACK_HOLE.samples,
      BRIGHTNESS: BLACK_HOLE.brightness.toFixed(4),
      BEAMING: BLACK_HOLE.beaming.toFixed(4),
      OPACITY: BLACK_HOLE.opacity.toFixed(4),
      FALLOFF: BLACK_HOLE.falloff.toFixed(4),
      RINGS: BLACK_HOLE.rings.toFixed(4),
      STEP_SCALE: BLACK_HOLE.step.scale.toFixed(4),
      STEP_MIN: BLACK_HOLE.step.min.toFixed(4),
      STEP_MAX: BLACK_HOLE.step.max.toFixed(4),
    },
    depthTest: false,
    depthWrite: false,
    transparent: true,
    premultipliedAlpha: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();

  let paused = true;
  let lost = false;
  let pulse = 0;
  let raf = 0;
  let last = 0;
  let tick = 0;

  const draw = () => {
    if (!renderer || lost) return;
    renderer.render(scene, camera);
    host.dataset.gl = "";
  };
  const frame = (now: number) => {
    raf = 0;
    if (paused || lost || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (tick++ % BLACK_HOLE.frameSkip) return;
    const dt = last ? Math.min((now - last) / 1000, BLACK_HOLE.maxStep) : 0;
    last = now;
    pulse = Math.max(0, pulse - dt / BLACK_HOLE.pulseSeconds);
    const boost = pulse * pulse;
    uniforms.uPhase.value -= dt * BLACK_HOLE.spin * (1 + (BLACK_HOLE.pulseRate - 1) * boost);
    uniforms.uGlow.value = BLACK_HOLE.pulseGlow * boost;
    draw();
  };
  /* Sans WebGL, rien à faire tourner : le disque CSS reste. */
  const play = () => {
    if (!renderer || reducedMotion || paused || document.hidden || lost || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : play());
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
    delete host.dataset.gl;
  };
  const onRestored = () => {
    lost = false;
    draw();
    play();
  };

  /* La taille réelle du disque à l'écran, à sa plus grande échelle. */
  const resize = () => {
    if (!renderer) return;
    const size = host.clientWidth;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, BLACK_HOLE.dprCap));
    renderer.setSize(size, size, false);
    renderer.getDrawingBufferSize(uniforms.uRes.value);
    draw();
  };
  const observer = new ResizeObserver(resize);
  if (renderer) {
    host.appendChild(canvas);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    observer.observe(host);
  }
  document.addEventListener("visibilitychange", onVisibility);

  return {
    setCount(count) {
      const k = Math.min(1, Math.log1p(Math.max(count - 1, 0)) / Math.log1p(BLACK_HOLE.fullAt - 1));
      host.style.setProperty("--et-fill", String(BLACK_HOLE.scale[0] + (BLACK_HOLE.scale[1] - BLACK_HOLE.scale[0]) * k));
    },
    pulse() {
      if (reducedMotion) return;
      pulse = 1;
      play();
    },
    setPaused(next) {
      paused = next;
      if (paused) stop();
      else play();
    },
    dispose() {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      geometry.dispose();
      material.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      canvas.remove();
      delete host.dataset.gl;
    },
  };
}
