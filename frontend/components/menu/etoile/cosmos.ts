/*
 * Le cosmos de L'Étoile : un seul canevas WebGL derrière la carte.
 *
 * Une galaxie spirale (étoiles instanciées, nuages de gaz, disque lumineux vu
 * de loin), un ciel de nébuleuses cuit une fois dans une cubemap, l'astre de
 * chaque système et des comètes. La caméra suit un trajet de stations — le
 * héros, un système par catégorie, la sortie — et la position de scroll la
 * fait voyager ; sa vitesse étire les étoiles en traînées.
 */
import * as THREE from "three";
import {
  BLUR_FRAG,
  BRIGHT_FRAG,
  COMPOSITE_FRAG,
  DOWN_FRAG,
  GLOW_BODY_VERT,
  COMET_FRAG,
  COMET_VERT,
  DISK_FRAG,
  DISK_VERT,
  FLARE_FRAG,
  FLARE_VERT,
  LINE_FRAG,
  LINE_VERT,
  NEBULA_FRAG,
  POST_VERT,
  PULSAR_FRAG,
  SKY_FRAG,
  SKY_VERT,
  STAR_FRAG,
  STAR_VERT,
  SUN_FRAG,
  SUN_VERT,
  WARP_FRAG,
  WARP_VERT,
} from "./shaders";
import { ETOILE_TIMING } from "./timing";

export type BodyKind = "constellation" | "binary" | "pulsar" | "gold-giant";

/** Réglages du cosmos : valeurs nommées, à valider (voir la passation). */
export const COSMOS = {
  seed: 7,
  galaxyRadius: 50,
  armWinding: 4.2,
  armCore: 3,
  stars: { mobile: 18000, desktop: 42000 },
  gas: { mobile: 200, desktop: 420 },
  farStars: { mobile: 1400, desktop: 2800 },
  tunnel: { mobile: 1600, desktop: 3200 },
  skyFace: 256,
  dprCap: { mobile: 1.5, desktop: 2 },
  fov: 56,
  /* Suivi du scroll : constante de temps, s. */
  follow: 0.12,
  /* Traînée = vitesse caméra × cette durée, s. */
  streak: 0.05,
  /* Comètes : intervalle entre deux, ms (au repos / au système Shooters). */
  cometEvery: [5200, 10500],
  cometEveryShooters: [900, 2000],
  /* Au-delà de cette moyenne d'image (ms), la résolution baisse une fois. */
  slowFrame: 24,
} as const;

export interface IntroFrame {
  /** Avancement du plongeon, 0 → 1. */
  progress: number;
  /** Vitesse relative, 0 → 1. */
  speed: number;
}

export interface Cosmos {
  intro(opts: {
    short: boolean;
    onFrame?: (frame: IntroFrame) => void;
    onFlare: () => void;
  }): Promise<void>;
  skipIntro(): void;
  /** `snap` : la caméra y est tout de suite, sans voler jusque-là. */
  setProgress(p: number, snap?: boolean): void;
  jump(to: number, onPeak: () => void): Promise<void>;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const UP = new THREE.Vector3(0, 1, 0);

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/* Angle d'un bras à un rayon donné — même formule que DISK_FRAG. */
const armAngle = (r: number, arm: number) =>
  arm * Math.PI + COSMOS.armWinding * Math.log(Math.max(r, 0.6) / COSMOS.armCore);

/* Le disque est dans le plan XZ ; z = -r·sinθ pour coller au repère du quad. */
const polar = (r: number, theta: number, y: number) =>
  new THREE.Vector3(r * Math.cos(theta), y, -r * Math.sin(theta));

const QUAD = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
const QUAD_INDEX = [0, 1, 2, 0, 2, 3];

function quadGeometry(instances?: number) {
  const geometry = instances === undefined ? new THREE.BufferGeometry() : new THREE.InstancedBufferGeometry();
  geometry.setIndex(QUAD_INDEX);
  geometry.setAttribute("corner", new THREE.BufferAttribute(QUAD, 2));
  if (geometry instanceof THREE.InstancedBufferGeometry && instances !== undefined) {
    geometry.instanceCount = instances;
  }
  return geometry;
}

function starGeometry(positions: Float32Array, colors: Float32Array, lums: Float32Array) {
  const geometry = quadGeometry(lums.length) as THREE.InstancedBufferGeometry;
  geometry.setAttribute("iPos", new THREE.InstancedBufferAttribute(positions, 3));
  geometry.setAttribute("iColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("iLum", new THREE.InstancedBufferAttribute(lums, 1));
  return geometry;
}

const additive = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
} as const;

/* Système binaire (Softs) : deux étoiles autour de leur centre de masse. */
const BINARY = {
  /* Période orbitale, s. */
  period: 14,
  /* Rayons des deux étoiles et de leurs orbites (la petite est la plus excentrée). */
  radiusA: 0.09,
  radiusB: 0.06,
  orbitA: 0.14,
  orbitB: 0.22,
} as const;
const PULSAR_RADIUS = 0.08;
/* Alcools : décalage de la supergéante par rapport au centre de la constellation (droite, haut). */
const CONSTELLATION_STAR = [-1.5, -1.25] as const;

/* Survol des astres : on les vise de loin, on les frôle, on se pose au-delà. */
const FLYBY = {
  /* Distance du point d'approche avant l'astre, de la station au-delà ; hauteur de la route au-dessus de lui. */
  before: 6,
  beyond: 3.5,
  rise: 0.25,
  /* Écart latéral au passage, par astre (le pulsar et sa lueur demandent plus de place). */
  lateral: { constellation: 2.7, binary: 3, pulsar: 2.5, "gold-giant": 3.2 } as Record<BodyKind, number>,
  /* Position de l'approche et du survol sur la progression, avant la station (en stations). */
  approachAt: 0.12,
  passAt: 0.03,
  /* L'étoile visée se place au-dessus du centre de l'écran, en demi-hauteurs (0,5 = quart supérieur). */
  aim: 0.5,
  /* Pointes de diffraction : distance où elles commencent, longueur de la montée ; taille minimale du halo (px CSS). */
  glareNear: 3,
  glareFar: 10,
  glarePx: 72,
} as const;
/* Nébuleuse d'Alcools : rayon de l'astre fictif dont le quad (×18) fait la nébuleuse. */
const NEBULA_RADIUS = 0.14;

/* Post-traitement : bloom serré (÷4) et large (÷8), objectif. */
const POST = {
  /* Luminance à partir de laquelle un pixel fleurit, gains des deux niveaux. */
  threshold: 0.78,
  strength: 0.55,
  wide: 0.4,
  divisor: 4,
  wideDivisor: 8,
  /* Aberration chromatique au repos (×4 au pic du saut) ; part du flou radial à vitesse pleine. */
  aberration: 0.25,
  radial: 0.8,
} as const;

/* Bruit tuilable cuit une fois : R, G deux fbm ; B une turbulence (crêtes = filaments) ; A basse fréquence. */
const NOISE_TEX = { size: 256, octaves: 4, cells: 6 } as const;
function noiseTexture(rand: () => number) {
  const { size, octaves, cells } = NOISE_TEX;
  const data = new Uint8Array(size * size * 4);
  const channel = (slot: number, ridged: boolean, octaveCount: number, baseCells: number) => {
    const values = new Float32Array(size * size);
    let amp = 1;
    let total = 0;
    let n = baseCells;
    for (let o = 0; o < octaveCount; o++) {
      const lattice = Float32Array.from({ length: n * n }, rand);
      const scale = n / size;
      for (let y = 0; y < size; y++) {
        const fy = y * scale;
        const y0 = Math.floor(fy);
        const y1 = (y0 + 1) % n;
        const ty = smooth(fy - y0);
        for (let x = 0; x < size; x++) {
          const fx = x * scale;
          const x0 = Math.floor(fx);
          const x1 = (x0 + 1) % n;
          const tx = smooth(fx - x0);
          const top = lattice[y0 * n + x0] + (lattice[y0 * n + x1] - lattice[y0 * n + x0]) * tx;
          const bottom = lattice[y1 * n + x0] + (lattice[y1 * n + x1] - lattice[y1 * n + x0]) * tx;
          const v = top + (bottom - top) * ty;
          values[y * size + x] += (ridged ? 1 - Math.abs(v * 2 - 1) : v) * amp;
        }
      }
      total += amp;
      amp *= 0.5;
      n *= 2;
    }
    for (let i = 0; i < values.length; i++) data[i * 4 + slot] = Math.round((values[i] / total) * 255);
  };
  channel(0, false, octaves, cells);
  channel(1, false, octaves, cells);
  /* Les crêtes : deux octaves seulement, des parois de granules nettes plutôt que des fibres. */
  channel(2, true, 2, cells * 2);
  channel(3, false, 2, cells / 2);
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

interface Comet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  width: number;
  age: number;
}

export async function createCosmos(
  canvas: HTMLCanvasElement,
  {
    kinds,
    mobile,
    reducedMotion,
    onLost,
  }: { kinds: BodyKind[]; mobile: boolean; reducedMotion: boolean; onLost: () => void }
): Promise<Cosmos> {
  const tier = mobile ? "mobile" : "desktop";
  const rand = mulberry32(COSMOS.seed);
  const R = COSMOS.galaxyRadius;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: mobile ? "default" : "high-performance",
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  let dpr = Math.min(window.devicePixelRatio || 1, COSMOS.dprCap[tier]);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(COSMOS.fov, 1, 0.1, 4000);

  /* Uniformes partagés par toutes les couches. */
  const shared = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: dpr },
    uProj: { value: 1 },
    uTime: { value: 0 },
    uTwinkle: { value: reducedMotion ? 0 : 1 },
    uNoise: { value: noiseTexture(mulberry32(COSMOS.seed + 1)) },
  };

  /* ---------- Post-traitement : cibles et passes ---------- */
  const targetOptions = { depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const bloomA = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const bloomB = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const wideA = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const wideB = new THREE.WebGLRenderTarget(1, 1, targetOptions);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postScene = new THREE.Scene();
  const postPass = (vertexShader: string, fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
    new THREE.RawShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const brightMaterial = postPass(POST_VERT, BRIGHT_FRAG, {
    uScene: { value: sceneTarget.texture },
    uTexel: { value: new THREE.Vector2() },
    uThreshold: { value: POST.threshold },
  });
  const downMaterial = postPass(POST_VERT, DOWN_FRAG, { uTex: { value: bloomA.texture }, uTexel: { value: new THREE.Vector2() } });
  const blurMaterial = postPass(POST_VERT, BLUR_FRAG, { uTex: { value: null }, uDir: { value: new THREE.Vector2() } });
  const compositeMaterial = postPass(POST_VERT, COMPOSITE_FRAG, {
    uScene: { value: sceneTarget.texture },
    uBloom: { value: bloomA.texture },
    uWide: { value: wideA.texture },
    uStrength: { value: POST.strength },
    uWideGain: { value: POST.wide },
    uAberration: { value: POST.aberration },
    uRadial: { value: 0 },
  });
  const postMesh = new THREE.Mesh(quadGeometry(), compositeMaterial);
  postMesh.frustumCulled = false;
  postScene.add(postMesh);
  const pass = (material: THREE.RawShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
    postMesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(postScene, postCamera);
  };
  const blur = (from: THREE.WebGLRenderTarget, via: THREE.WebGLRenderTarget) => {
    blurMaterial.uniforms.uTex.value = from.texture;
    blurMaterial.uniforms.uDir.value.set(1 / from.width, 0);
    pass(blurMaterial, via);
    blurMaterial.uniforms.uTex.value = via.texture;
    blurMaterial.uniforms.uDir.value.set(0, 1 / from.height);
    pass(blurMaterial, from);
  };
  /* Dégradé : un seul niveau de bloom, le large ; `uWideGain` à 0 et bloomA en ⅛ font l'affaire. */
  const runPost = (wideLevel: boolean) => {
    pass(brightMaterial, bloomA);
    blur(bloomA, bloomB);
    if (wideLevel) {
      pass(downMaterial, wideA);
      blur(wideA, wideB);
    }
    compositeMaterial.uniforms.uWideGain.value = wideLevel ? POST.wide : 0;
    pass(compositeMaterial, null);
  };

  /* ---------- Ciel de nébuleuses, cuit une fois ---------- */
  const skyTarget = new THREE.WebGLCubeRenderTarget(COSMOS.skyFace);
  {
    const skyScene = new THREE.Scene();
    const box = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.RawShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    skyScene.add(new THREE.Mesh(box, material));
    new THREE.CubeCamera(0.1, 10, skyTarget).update(renderer, skyScene);
    box.dispose();
    material.dispose();
  }
  scene.background = skyTarget.texture;

  /* ---------- Galaxie ---------- */
  const starCount = COSMOS.stars[tier];
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const starLum = new Float32Array(starCount);
  const palette = {
    bulge: [1.0, 0.84, 0.62],
    blue: [0.5, 0.88, 1.0],
    white: [0.94, 0.98, 1.0],
    yellow: [1.0, 0.9, 0.7],
    red: [1.0, 0.36, 0.62],
  } as const;
  for (let i = 0; i < starCount; i++) {
    let p: THREE.Vector3;
    let c: readonly number[];
    const pick = rand();
    if (pick < 0.16) {
      const r = Math.abs(gaussian(rand)) * 5.5;
      const dir = new THREE.Vector3(gaussian(rand), gaussian(rand) * 0.55, gaussian(rand)).normalize();
      p = dir.multiplyScalar(r);
      c = rand() < 0.8 ? palette.bulge : palette.yellow;
    } else {
      const r = COSMOS.armCore + -Math.log(1 - rand() * 0.96) * R * 0.3;
      const inArm = rand() < 0.72;
      const theta = inArm
        ? armAngle(r, rand() < 0.5 ? 0 : 1) + gaussian(rand) * (0.22 + 0.12 * (r / R))
        : rand() * Math.PI * 2;
      p = polar(r, theta, gaussian(rand) * (0.35 + 0.012 * r));
      const tone = rand();
      c = inArm
        ? tone < 0.55
          ? palette.blue
          : tone < 0.9
            ? palette.white
            : palette.yellow
        : tone < 0.5
          ? palette.white
          : tone < 0.85
            ? palette.yellow
            : palette.red;
    }
    starPos.set([p.x, p.y, p.z], i * 3);
    starCol.set(c, i * 3);
    starLum[i] = 0.25 + Math.pow(rand(), 7) * 5;
  }

  const starUniforms = {
    ...shared,
    uTrail: { value: new THREE.Vector3() },
    uStarPx: { value: 1.25 },
    uRefDist: { value: 9 },
    uMaxPx: { value: 48 },
    uAlpha: { value: 1 },
    uQuadScale: { value: 1 },
  };
  const starMaterial = new THREE.RawShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: starUniforms,
    ...additive,
  });
  const starGeom = starGeometry(starPos, starCol, starLum);
  const stars = new THREE.Mesh(starGeom, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = 3;
  scene.add(stars);

  /* Nuages de gaz : gros sprites ténus le long des bras. */
  const gasCount = COSMOS.gas[tier];
  const gasPos = new Float32Array(gasCount * 3);
  const gasCol = new Float32Array(gasCount * 3);
  const gasRad = new Float32Array(gasCount);
  const gasTones = [
    [0.4, 0.12, 0.75],
    [0.0, 0.5, 0.8],
    [0.85, 0.08, 0.42],
    [0.1, 0.3, 0.85],
  ];
  for (let i = 0; i < gasCount; i++) {
    const r = 4 + rand() * (R - 6);
    const theta = armAngle(r, rand() < 0.5 ? 0 : 1) + gaussian(rand) * 0.18;
    const p = polar(r, theta, gaussian(rand) * 0.4);
    const tone = gasTones[Math.floor(rand() * gasTones.length)];
    const k = 0.035 + rand() * 0.06;
    gasPos.set([p.x, p.y, p.z], i * 3);
    gasCol.set([tone[0] * k, tone[1] * k, tone[2] * k], i * 3);
    gasRad[i] = 1.6 + rand() * 3.4;
  }
  const gasMaterial = new THREE.RawShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    defines: { GAS: "" },
    /* Un nuage ne laisse pas de traînée : seules les étoiles filent. */
    uniforms: { ...starUniforms, uMaxPx: { value: mobile ? 260 : 420 }, uTrail: { value: new THREE.Vector3() } },
    ...additive,
  });
  const gas = new THREE.Mesh(starGeometry(gasPos, gasCol, gasRad), gasMaterial);
  gas.frustumCulled = false;
  gas.renderOrder = 2;
  scene.add(gas);

  /* Étoiles lointaines, hors galaxie : sans traînée ni parallaxe. */
  const farCount = COSMOS.farStars[tier];
  const farPos = new Float32Array(farCount * 3);
  const farCol = new Float32Array(farCount * 3);
  const farLum = new Float32Array(farCount);
  for (let i = 0; i < farCount; i++) {
    const dir = new THREE.Vector3(gaussian(rand), gaussian(rand), gaussian(rand)).normalize().multiplyScalar(1500);
    farPos.set([dir.x, dir.y, dir.z], i * 3);
    farCol.set(rand() < 0.7 ? palette.white : palette.blue, i * 3);
    farLum[i] = 0.15 + Math.pow(rand(), 5) * 1.2;
  }
  const farMaterial = new THREE.RawShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: {
      ...starUniforms,
      uTrail: { value: new THREE.Vector3() },
      uRefDist: { value: 1100 },
    },
    ...additive,
  });
  const far = new THREE.Mesh(starGeometry(farPos, farCol, farLum), farMaterial);
  far.frustumCulled = false;
  far.renderOrder = 1;
  scene.add(far);

  /* Disque lumineux : la galaxie vue de loin. */
  const diskMaterial = new THREE.RawShaderMaterial({
    vertexShader: DISK_VERT,
    fragmentShader: DISK_FRAG,
    uniforms: {
      uOpacity: { value: 0 },
      uRadius: { value: R },
      uWinding: { value: COSMOS.armWinding },
      uCore: { value: COSMOS.armCore },
    },
    side: THREE.DoubleSide,
    ...additive,
  });
  const disk = new THREE.Mesh(new THREE.PlaneGeometry(R * 2.4, R * 2.4), diskMaterial);
  disk.rotation.x = -Math.PI / 2;
  disk.renderOrder = 1;
  scene.add(disk);

  /* Tunnel d'hyperespace : n'apparaît qu'en saut. */
  const tunnelCount = COSMOS.tunnel[tier];
  const tunnelLen = 160;
  const tunPos = new Float32Array(tunnelCount * 3);
  const tunCol = new Float32Array(tunnelCount * 3);
  const tunLum = new Float32Array(tunnelCount);
  for (let i = 0; i < tunnelCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.8 + Math.pow(rand(), 0.7) * 14;
    tunPos.set([Math.cos(a) * r, Math.sin(a) * r, rand() * tunnelLen], i * 3);
    /* Près des bords (proches de la caméra) chaud, vers le cœur bleu. */
    const edge = clamp01((r - 4) / 10);
    tunCol.set([0.35 + 0.65 * edge, 0.9 - 0.6 * edge, 1.0 - 0.45 * edge], i * 3);
    tunLum[i] = 0.6 + rand() * 1.4;
  }
  const tunnelUniforms = {
    ...starUniforms,
    uTrail: { value: new THREE.Vector3() },
    uAlpha: { value: 0 },
    uCamPos: { value: new THREE.Vector3() },
    uCamRight: { value: new THREE.Vector3() },
    uCamUp: { value: new THREE.Vector3() },
    uCamFwd: { value: new THREE.Vector3() },
    uTravel: { value: 0 },
    uTunnelLen: { value: tunnelLen },
    uTint: { value: new THREE.Vector3(0.0, 0.83, 1.0) },
  };
  const tunnelMaterial = new THREE.RawShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    defines: { TUNNEL: "" },
    uniforms: tunnelUniforms,
    ...additive,
  });
  const tunnel = new THREE.Mesh(starGeometry(tunPos, tunCol, tunLum), tunnelMaterial);
  tunnel.frustumCulled = false;
  tunnel.renderOrder = 6;
  tunnel.visible = false;
  scene.add(tunnel);

  /* ---------- Stations : héros, un système par catégorie, sortie ---------- */
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(COSMOS.fov / 2));
  const thetaT = armAngle(17, 0) + 0.05;
  const heroStar = polar(17, thetaT, 0.35);
  const stationPos: THREE.Vector3[] = [polar(24, thetaT + 0.04, 1.1)];
  const stationLook: THREE.Vector3[] = [heroStar.clone()];
  const stationPitch: number[] = [Math.atan(0.2 * tanHalf)];
  const stationRoll: number[] = [-0.1];

  const bodies: { kind: BodyKind; pos: THREE.Vector3; index: number; travel: THREE.Vector3; lateral: THREE.Vector3 }[] = kinds.map((kind, i) => {
    const theta = thetaT - (i + 1) * 0.62;
    /* L'astre, sur l'anneau de la galaxie ; la route le longe dans le sens du voyage. */
    const pos = polar(21 + 2 * Math.sin(i * 1.9), theta, 1 + 0.9 * Math.cos(i * 2.3));
    const travel = polar(1, theta - 0.1, 0).sub(polar(1, theta + 0.1, 0)).normalize();
    const lateral = new THREE.Vector3().crossVectors(travel, UP).normalize().multiplyScalar(FLYBY.lateral[kind] * (i % 2 ? 1 : -1));
    return { kind, pos, index: i + 1, travel, lateral };
  });
  bodies.forEach((body, i) => {
    /* La station est au-delà de l'astre, le regard sur l'étoile suivante, loin devant : celle-ci
       reste un point lumineux au-dessus du titre, l'astre passé n'est plus dans le cadre. */
    const station = body.pos.clone().addScaledVector(body.travel, FLYBY.beyond).add(body.lateral).add(new THREE.Vector3(0, FLYBY.rise, 0));
    const next = bodies[i + 1];
    stationPos.push(station);
    stationLook.push(next ? next.pos.clone() : station.clone().addScaledVector(body.travel, 10));
    stationPitch.push(Math.atan(FLYBY.aim * tanHalf));
    stationRoll.push([-0.06, 0.05, -0.04, 0.07][i % 4]);
  });

  const lastTheta = thetaT - (kinds.length + 1) * 0.62;
  stationPos.push(polar(32, lastTheta, 17));
  stationLook.push(new THREE.Vector3(0, -3, 0));
  stationPitch.push(0);
  stationRoll.push(0);

  const stationCount = stationPos.length;
  /*
   * Le trajet passe, avant chaque station, par un point d'approche qui vise
   * l'astre de loin, puis par le point de survol où il défile tout près sur le
   * côté, avant la station d'où il n'est plus visible. `knots` relie la
   * progression (0 = héros, k = système k) à l'indice du point sur le trajet.
   */
  const pathPos: THREE.Vector3[] = [];
  const pathLook: THREE.Vector3[] = [];
  const pathPitch: number[] = [];
  const pathRoll: number[] = [];
  const knots: [number, number][] = [];
  for (let k = 0; k < stationCount; k++) {
    const isSystem = k > 0 && k < stationCount - 1;
    if (isSystem) {
      const { pos: star, travel, lateral } = bodies[k - 1];
      const rise = new THREE.Vector3(0, FLYBY.rise, 0);
      knots.push([k - FLYBY.approachAt, pathPos.length]);
      pathPos.push(star.clone().addScaledVector(travel, -FLYBY.before).add(lateral).add(rise));
      pathLook.push(star.clone());
      pathPitch.push(stationPitch[k]);
      pathRoll.push(stationRoll[k]);
      knots.push([k - FLYBY.passAt, pathPos.length]);
      pathPos.push(star.clone().add(lateral).add(rise));
      pathLook.push(star.clone().addScaledVector(travel, 4).add(lateral));
      pathPitch.push(stationPitch[k]);
      pathRoll.push(stationRoll[k]);
    }
    knots.push([k, pathPos.length]);
    pathPos.push(stationPos[k]);
    pathLook.push(stationLook[k]);
    pathPitch.push(stationPitch[k]);
    pathRoll.push(stationRoll[k]);
  }
  const pathLast = pathPos.length - 1;
  const posCurve = new THREE.CatmullRomCurve3(pathPos, false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(pathLook, false, "centripetal");
  const pathIndex = (p: number) => {
    if (p <= 0) return 0;
    for (let i = 1; i < knots.length; i++) {
      const [p1, i1] = knots[i];
      if (p <= p1) {
        const [p0, i0] = knots[i - 1];
        return i0 + ((i1 - i0) * (p - p0)) / (p1 - p0);
      }
    }
    return pathLast;
  };

  /* ---------- Astres des systèmes ---------- */
  /* Les astres des systèmes sont toujours là, vus de loin ou survolés ; seule l'étoile du héros s'efface. */
  const fadeByStation = (index: number, p: number) => (index === 0 ? clamp01(1.4 - p) : 1);
  type Tone = { radius: number; deep: number[]; mid: number[]; hot: number[]; storms?: true };
  const HERO_SUN: Tone = { radius: 0.14, deep: [0.3, 0.6, 0.9], mid: [0.75, 0.95, 1.0], hot: [1.0, 1.0, 1.0] };
  /* Alcools : une supergéante bleue, cœur blanc, limbe bleu profond. */
  const CONSTELLATION_SUN: Tone = { radius: 0.12, deep: [0.04, 0.18, 0.7], mid: [0.42, 0.76, 1.0], hot: [1.0, 1.0, 1.0] };
  /* Softs : la binaire, une naine blanche-bleue et sa compagne ambrée. */
  const BINARY_A: Tone = { radius: BINARY.radiusA, deep: [0.3, 0.55, 1.0], mid: [0.72, 0.9, 1.0], hot: [1.0, 1.0, 1.0] };
  const BINARY_B: Tone = { radius: BINARY.radiusB, deep: [0.7, 0.26, 0.06], mid: [1.0, 0.68, 0.34], hot: [1.0, 0.94, 0.8] };
  /* Champagnes : la géante dorée et ses tempêtes. */
  const GOLD_GIANT: Tone = { radius: 0.14, deep: [0.6, 0.14, 0.02], mid: [1.0, 0.56, 0.12], hot: [1.0, 0.88, 0.55], storms: true };
  const suns: {
    material: THREE.RawShaderMaterial;
    glare: THREE.RawShaderMaterial;
    meshes: THREE.Mesh[];
    radius: number;
    pos: THREE.Vector3;
    index: number;
  }[] = [];
  const sunGeometry = quadGeometry();
  const constellationMaterials: {
    line: THREE.RawShaderMaterial;
    stars: THREE.RawShaderMaterial;
    meshes: THREE.Object3D[];
    index: number;
  }[] = [];

  const addSun = (pos: THREE.Vector3, tone: Tone, index: number, seed = index * 3.7) => {
    const material = new THREE.RawShaderMaterial({
      vertexShader: SUN_VERT,
      fragmentShader: SUN_FRAG,
      defines: tone.storms ? { STORMS: "" } : {},
      uniforms: {
        ...shared,
        uPos: { value: pos },
        uRadius: { value: tone.radius },
        uSeed: { value: seed },
        uFade: { value: 0 },
        uDeep: { value: new THREE.Vector3(...tone.deep) },
        uMid: { value: new THREE.Vector3(...tone.mid) },
        uHot: { value: new THREE.Vector3(...tone.hot) },
      },
      ...additive,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(sunGeometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    scene.add(mesh);
    /* Pointes de diffraction légères, sans cœur : même optique que l'étoile du héros. */
    const glare = new THREE.RawShaderMaterial({
      vertexShader: FLARE_VERT,
      fragmentShader: FLARE_FRAG,
      uniforms: {
        ...shared,
        uPos: { value: pos },
        uSizePx: { value: 1 },
        uCorePx: { value: 1 },
        uIntensity: { value: 0 },
        uSpikes: { value: 1 },
        uCoreGain: { value: 0 },
        uMaskPx: { value: 1 },
        uColor: { value: new THREE.Vector3(...tone.hot) },
      },
      ...additive,
    });
    const glareMesh = new THREE.Mesh(sunGeometry, glare);
    glareMesh.frustumCulled = false;
    /* Les pointes passent devant toute photosphère, la binaire comprise. */
    glareMesh.renderOrder = 4.9;
    scene.add(glareMesh);
    const sun = { material, glare, meshes: [mesh, glareMesh], radius: tone.radius, pos, index };
    suns.push(sun);
    return sun;
  };

  /* Binaires : positions recalculées à chaque image, dans le plan (u1, u2) vu de biais. */
  const binaries: {
    center: THREE.Vector3;
    u1: THREE.Vector3;
    u2: THREE.Vector3;
    a: ReturnType<typeof addSun>;
    b: ReturnType<typeof addSun>;
    phase: number;
  }[] = [];
  const orbitBasis = (body: { pos: THREE.Vector3; index: number }) => {
    const fwd = body.pos.clone().sub(stationPos[body.index]).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    return { fwd, right, up };
  };

  for (const body of bodies) {
    if (body.kind === "gold-giant") addSun(body.pos, GOLD_GIANT, body.index);
    if (body.kind === "binary") {
      const { fwd, right, up } = orbitBasis(body);
      /* Orbite inclinée : de la profondeur, les deux étoiles passent l'une devant l'autre. */
      const u2 = up.clone().multiplyScalar(0.32).addScaledVector(fwd, 0.75).normalize();
      binaries.push({
        center: body.pos,
        u1: right,
        u2,
        a: addSun(body.pos.clone(), BINARY_A, body.index),
        b: addSun(body.pos.clone(), BINARY_B, body.index, body.index * 3.7 + 5.1),
        phase: body.index * 1.3,
      });
    }
    if (body.kind === "constellation") {
      /* Six étoiles reliées dans le plan face à la caméra de la station. */
      const { right, up } = orbitBasis(body);
      const pattern = [
        [-2.3, 0.9],
        [-1.2, 1.5],
        [-0.2, 0.7],
        [0.9, 1.25],
        [1.9, 0.35],
        [0.65, -0.5],
      ];
      const points = pattern.map(([x, y]) =>
        body.pos.clone().addScaledVector(right, x).addScaledVector(up, y)
      );
      /* L'astre du système : la supergéante, la constellation autour. */
      addSun(
        body.pos.clone().addScaledVector(right, CONSTELLATION_STAR[0]).addScaledVector(up, CONSTELLATION_STAR[1]),
        CONSTELLATION_SUN,
        body.index,
        body.index * 3.7 + 11.3,
      );
      const cPos = new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));
      const temperatures = [
        [0.5, 0.92, 1.0],
        [0.95, 0.98, 1.0],
        [1.0, 0.45, 0.72],
        [0.6, 0.9, 1.0],
        [1.0, 0.86, 0.6],
        [0.92, 0.97, 1.0],
      ];
      const cCol = new Float32Array(temperatures.flat());
      const cLum = new Float32Array([10, 9, 16, 8, 11, 9]);
      const starsMaterial = new THREE.RawShaderMaterial({
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        defines: { SPIKES: "" },
        uniforms: {
          ...starUniforms,
          uRefDist: { value: 13 },
          uStarPx: { value: 1.6 },
          uAlpha: { value: 0 },
          uQuadScale: { value: 5 },
        },
        ...additive,
      });
      const cStars = new THREE.Mesh(starGeometry(cPos, cCol, cLum), starsMaterial);
      cStars.frustumCulled = false;
      cStars.renderOrder = 5;
      scene.add(cStars);
      const order = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 2];
      const segments = order.flatMap((k) => [points[k].x, points[k].y, points[k].z]);
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segments), 3));
      lineGeometry.setAttribute(
        "aT",
        new THREE.BufferAttribute(new Float32Array(order.map((_, v) => (Math.floor(v / 2) + (v % 2)) / 6)), 1)
      );
      const lineMaterial = new THREE.RawShaderMaterial({
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        uniforms: {
          uColor: { value: new THREE.Vector3(0.0, 0.75, 0.95) },
          uFade: { value: 0 },
          uDraw: { value: 0 },
          uTime: shared.uTime,
        },
        ...additive,
      });
      const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
      lines.frustumCulled = false;
      lines.renderOrder = 5;
      scene.add(lines);
      constellationMaterials.push({ line: lineMaterial, stars: starsMaterial, meshes: [cStars, lines], index: body.index });
    }
  }
  /* Shooters : un pulsar ; les comètes d'arrière-plan s'y font plus fréquentes. */
  const cometStation = bodies.find((b) => b.kind === "pulsar")?.index ?? -10;
  const glowBodies: { material: THREE.RawShaderMaterial; mesh: THREE.Mesh; index: number }[] = [];
  /* Alcools : la supergéante est enveloppée d'une nébuleuse, dessinée sous elle. */
  for (const body of bodies.filter((b) => b.kind === "constellation")) {
    const { right, up } = orbitBasis(body);
    const star = body.pos.clone().addScaledVector(right, CONSTELLATION_STAR[0]).addScaledVector(up, CONSTELLATION_STAR[1]);
    const material = new THREE.RawShaderMaterial({
      vertexShader: GLOW_BODY_VERT,
      fragmentShader: NEBULA_FRAG,
      uniforms: { ...shared, uPos: { value: star }, uRadius: { value: NEBULA_RADIUS }, uSeed: { value: body.index * 2.9 }, uFade: { value: 0 } },
      ...additive,
    });
    const mesh = new THREE.Mesh(sunGeometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3.5;
    scene.add(mesh);
    glowBodies.push({ material, mesh, index: body.index });
  }
  for (const body of bodies.filter((b) => b.kind === "pulsar")) {
    const material = new THREE.RawShaderMaterial({
      vertexShader: GLOW_BODY_VERT,
      fragmentShader: PULSAR_FRAG,
      uniforms: { ...shared, uPos: { value: body.pos }, uRadius: { value: PULSAR_RADIUS }, uFade: { value: 0 } },
      ...additive,
    });
    const mesh = new THREE.Mesh(sunGeometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    scene.add(mesh);
    glowBodies.push({ material, mesh, index: body.index });
  }

  /* ---------- L'étoile du héros : un corps blanc-chaud sous l'éclat ---------- */
  addSun(heroStar, HERO_SUN, 0);

  const flareUniforms = {
    ...shared,
    uPos: { value: heroStar },
    uSizePx: { value: 100 },
    uCorePx: { value: 10 },
    uIntensity: { value: 0 },
    uSpikes: { value: 0.55 },
    uCoreGain: { value: 1 },
    uMaskPx: { value: 0 },
    uColor: { value: new THREE.Vector3(0.78, 0.95, 1.0) },
  };
  const flare = new THREE.Mesh(
    quadGeometry(),
    new THREE.RawShaderMaterial({
      vertexShader: FLARE_VERT,
      fragmentShader: FLARE_FRAG,
      uniforms: flareUniforms,
      ...additive,
    })
  );
  flare.frustumCulled = false;
  flare.renderOrder = 7;
  scene.add(flare);

  /* ---------- Cœur du saut ---------- */
  const warpUniforms = {
    ...shared,
    uWarp: { value: 0 },
    uFlash: { value: 0 },
    uShock: { value: 0 },
    uTint: { value: new THREE.Vector3(0.0, 0.83, 1.0) },
  };
  /* Teinte de l'onde de choc : la couleur du système d'arrivée (0 = héros). */
  const arrivalTint = (index: number) => {
    const kind = index >= 1 && index <= kinds.length ? kinds[index - 1] : null;
    return kind === "gold-giant" ? [1.0, 0.75, 0.3] : kind === "pulsar" ? [1.0, 0.18, 0.47] : [0.0, 0.83, 1.0];
  };
  const warpCore = new THREE.Mesh(
    quadGeometry(),
    new THREE.RawShaderMaterial({ vertexShader: WARP_VERT, fragmentShader: WARP_FRAG, uniforms: warpUniforms, ...additive })
  );
  warpCore.frustumCulled = false;
  warpCore.renderOrder = 9;
  scene.add(warpCore);

  /* ---------- Comètes (espace écran) ---------- */
  const COMET_MAX = 4;
  const cometGeom = quadGeometry(0) as THREE.InstancedBufferGeometry;
  const cHead = new THREE.InstancedBufferAttribute(new Float32Array(COMET_MAX * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const cDir = new THREE.InstancedBufferAttribute(new Float32Array(COMET_MAX * 2), 2).setUsage(THREE.DynamicDrawUsage);
  const cLen = new THREE.InstancedBufferAttribute(new Float32Array(COMET_MAX), 1).setUsage(THREE.DynamicDrawUsage);
  const cWidth = new THREE.InstancedBufferAttribute(new Float32Array(COMET_MAX), 1).setUsage(THREE.DynamicDrawUsage);
  const cAlpha = new THREE.InstancedBufferAttribute(new Float32Array(COMET_MAX), 1).setUsage(THREE.DynamicDrawUsage);
  cometGeom.setAttribute("iHead", cHead);
  cometGeom.setAttribute("iDir", cDir);
  cometGeom.setAttribute("iLen", cLen);
  cometGeom.setAttribute("iWidth", cWidth);
  cometGeom.setAttribute("iAlpha", cAlpha);
  const cometAttributes = [cHead, cDir, cLen, cWidth, cAlpha];
  const cometMesh = new THREE.Mesh(
    cometGeom,
    new THREE.RawShaderMaterial({
      vertexShader: COMET_VERT,
      fragmentShader: COMET_FRAG,
      uniforms: shared,
      ...additive,
    })
  );
  cometMesh.frustumCulled = false;
  /* Derrière les astres : une comète ne passe pas devant une photosphère. */
  cometMesh.renderOrder = 3;
  scene.add(cometMesh);
  const comets: Comet[] = [];
  let nextComet = 1800;

  const spawnComet = (big: boolean) => {
    const { x: w, y: h } = shared.uResolution.value;
    const scale = big ? 1.5 : 1;
    const fromLeft = rand() < 0.5;
    const angle = (fromLeft ? -0.35 : Math.PI + 0.35) + (rand() - 0.5) * 0.5;
    const speed = h * (0.38 + rand() * 0.3);
    comets.push({
      x: fromLeft ? -w * 0.5 - 40 : w * 0.5 + 40,
      y: h * (0.05 + rand() * 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: h * (0.18 + rand() * 0.22) * scale,
      width: dpr * (2.2 + rand() * 1.6) * scale,
      age: 0,
    });
  };

  const updateComets = (dt: number, p: number) => {
    if (reducedMotion) return;
    nextComet -= dt * 1000;
    const shooters = Math.abs(p - cometStation) < 0.7;
    if (nextComet <= 0 && comets.length < COMET_MAX) {
      spawnComet(shooters);
      const range = shooters ? COSMOS.cometEveryShooters : COSMOS.cometEvery;
      nextComet = range[0] + rand() * (range[1] - range[0]);
    }
    const { x: w, y: h } = shared.uResolution.value;
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const margin = c.len + 80;
      if (Math.abs(c.x) > w * 0.5 + margin || Math.abs(c.y) > h * 0.5 + margin) comets.splice(i, 1);
    }
    comets.forEach((c, i) => {
      const speed = Math.hypot(c.vx, c.vy);
      cHead.setXY(i, c.x, c.y);
      cDir.setXY(i, c.vx / speed, c.vy / speed);
      cLen.setX(i, c.len);
      cWidth.setX(i, c.width);
      cAlpha.setX(i, Math.min(1, c.age * 4) * 0.9);
    });
    if (comets.length === 0 && cometGeom.instanceCount === 0) return;
    cometGeom.instanceCount = comets.length;
    for (const attribute of cometAttributes) attribute.needsUpdate = true;
  };

  /* ---------- Caméra ---------- */
  const tmpMatrix = new THREE.Matrix4();
  const pitchQuat = new THREE.Quaternion();
  const rollQuat = new THREE.Quaternion();
  const X = new THREE.Vector3(1, 0, 0);
  const lookPoint = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const travelQuat = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1);

  const orient = (pos: THREE.Vector3, look: THREE.Vector3, pitch: number, roll: number, out: THREE.Quaternion) => {
    tmpMatrix.lookAt(pos, look, UP);
    out.setFromRotationMatrix(tmpMatrix);
    out.multiply(pitchQuat.setFromAxisAngle(X, -pitch));
    out.multiply(rollQuat.setFromAxisAngle(Z, roll));
    return out;
  };

  const stationPose = (p: number, pos: THREE.Vector3, quat: THREE.Quaternion) => {
    const index = pathIndex(p);
    const t = index / pathLast;
    posCurve.getPoint(t, pos);
    const look = lookCurve.getPoint(t, lookPoint);
    const i = Math.min(Math.floor(index), pathLast - 1);
    const f = smooth(index - i);
    const pitch = THREE.MathUtils.lerp(pathPitch[i], pathPitch[i + 1], f);
    const roll = THREE.MathUtils.lerp(pathRoll[i], pathRoll[i + 1], f);
    orient(pos, look, pitch, roll, quat);
  };

  /*
   * Saut (t de 0 à 1) : une compression d'anticipation, une accélération
   * cubique jusqu'au pic — l'éclair, l'instant où le contenu change — puis un
   * freinage exponentiel sur l'astre d'arrivée.
   */
  const ANTICIPATION = 0.1;
  const PEAK = 0.45;
  const jumpTravel = (t: number) => {
    if (t < ANTICIPATION) return 0;
    const u = (t - ANTICIPATION) / (1 - ANTICIPATION);
    return u < PEAK ? 0.5 * Math.pow(u / PEAK, 2) : 0.5 + 0.5 * (1 - Math.pow(2, (-10 * (u - PEAK)) / (1 - PEAK)));
  };
  const jumpWarp = (t: number) => {
    if (t < ANTICIPATION) return 0.15 * (t / ANTICIPATION);
    const u = (t - ANTICIPATION) / (1 - ANTICIPATION);
    return u < PEAK ? Math.pow(u / PEAK, 1.2) : Math.pow(2, (-8 * (u - PEAK)) / (1 - PEAK));
  };
  const flashAt = ANTICIPATION + PEAK * (1 - ANTICIPATION);

  /* ---------- Intro ---------- */
  const introCurve = { curve: null as THREE.CatmullRomCurve3 | null, startQuat: new THREE.Quaternion() };
  /* Profil de vitesse du plongeon : accélère, pointe tard, freine sec. */
  const PROFILE_STEPS = 256;
  const profile = new Float32Array(PROFILE_STEPS + 1);
  {
    let acc = 0;
    for (let i = 1; i <= PROFILE_STEPS; i++) {
      const u = (i - 0.5) / PROFILE_STEPS;
      acc += Math.pow(u, 2.4) * Math.pow(1 - u, 0.85);
      profile[i] = acc;
    }
    for (let i = 0; i <= PROFILE_STEPS; i++) profile[i] /= acc;
  }
  const diveAt = (u: number) => {
    const x = clamp01(u) * PROFILE_STEPS;
    const i = Math.floor(x);
    return i >= PROFILE_STEPS ? 1 : profile[i] + (profile[i + 1] - profile[i]) * (x - i);
  };
  const diveSpeed = (u: number) => {
    const v = Math.pow(clamp01(u), 2.4) * Math.pow(1 - clamp01(u), 0.85);
    return v / 0.21;
  };

  type Mode =
    | { kind: "idle" }
    | {
        kind: "intro";
        start: number;
        duration: number;
        from: number;
        onFrame?: (frame: IntroFrame) => void;
        onFlare: () => void;
        flared: boolean;
        resolve: () => void;
      }
    | {
        kind: "jump";
        start: number;
        from: number;
        to: number;
        onPeak: () => void;
        peaked: boolean;
        resolve: () => void;
      };
  let mode: Mode = { kind: "idle" };

  let pTarget = 0;
  let pShown = 0;
  let flareBurst = 0;
  let warp = 0;
  let bank = 0;
  const aim = { x: 0, y: 0 };
  const gaze = { x: 0, y: 0 };
  const gazeQuat = new THREE.Quaternion();
  const gazeEuler = new THREE.Euler();
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    aim.x = (event.clientX / window.innerWidth) * 2 - 1;
    aim.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  /* Inclinaison : seulement là où elle ne demande pas d'autorisation (Android). */
  const onTilt = (event: DeviceOrientationEvent) => {
    if (event.gamma === null || event.beta === null) return;
    aim.x = Math.max(-1, Math.min(1, event.gamma / 30));
    aim.y = Math.max(-1, Math.min(1, (event.beta - 50) / 30));
  };
  const tiltNeedsPermission =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function";
  if (!reducedMotion) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    if (!tiltNeedsPermission) window.addEventListener("deviceorientation", onTilt);
  }
  let travel = 0;
  const camPos = new THREE.Vector3();
  const camQuat = new THREE.Quaternion();
  const prevPos = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const tmpVel = new THREE.Vector3();

  stationPose(0, camPos, camQuat);
  prevPos.copy(camPos);

  const buildIntro = () => {
    const vHalf = tanHalf;
    const hHalf = tanHalf * camera.aspect;
    const distance = (R * 1.05) / Math.min(vHalf, hHalf);
    const elevation = THREE.MathUtils.degToRad(48);
    const start = polar(distance * Math.cos(elevation), thetaT + 0.45, distance * Math.sin(elevation));
    const mid = polar(46, thetaT + 0.16, 15);
    introCurve.curve = new THREE.CatmullRomCurve3([start, mid, stationPos[0]], false, "centripetal");
    /* En portrait, la galaxie se couche en diagonale pour remplir l'écran. */
    const roll = camera.aspect < 1 ? -0.85 : -0.35;
    orient(start, new THREE.Vector3(0, 0, 0), 0, roll, introCurve.startQuat);
  };

  const heroQuat = new THREE.Quaternion();
  /* L'orientation suit le temps (et non la distance, qui ne s'emballe qu'à la fin). */
  const introPose = (s: number, turn: number, pos: THREE.Vector3, quat: THREE.Quaternion) => {
    introCurve.curve!.getPointAt(s, pos);
    stationPose(0, tmpVel, heroQuat);
    quat.slerpQuaternions(introCurve.startQuat, heroQuat, smooth(turn));
  };

  /* Moins de mouvement : la scène est fixe, on ne la redessine qu'au besoin. */
  let dirty = true;
  /* Téléphone lent : résolution et effectifs réduits une fois pour toutes (voir la boucle). */
  let degraded = false;

  /* ---------- Taille ---------- */
  const resize = () => {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    shared.uResolution.value.copy(buffer);
    shared.uProj.value = buffer.y * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    /* Cibles du post-traitement : la scène en entier, le bloom en ¼ (⅛ une fois dégradé), le large en ⅛. */
    sceneTarget.setSize(buffer.x, buffer.y);
    const tight = degraded ? POST.wideDivisor : POST.divisor;
    bloomA.setSize(Math.ceil(buffer.x / tight), Math.ceil(buffer.y / tight));
    bloomB.setSize(bloomA.width, bloomA.height);
    wideA.setSize(Math.ceil(buffer.x / POST.wideDivisor), Math.ceil(buffer.y / POST.wideDivisor));
    wideB.setSize(wideA.width, wideA.height);
    brightMaterial.uniforms.uTexel.value.set(1 / buffer.x, 1 / buffer.y);
    downMaterial.uniforms.uTexel.value.set(0.5 / bloomA.width, 0.5 / bloomA.height);
    dirty = true;
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  /* ---------- Boucle ---------- */
  let last = performance.now();
  let frames = 0;
  let frameTime = 0;
  let paused = false;
  let idleSkip = false;
  let skippedLast = false;

  const frame = (now: number) => {
    /* `elapsed` réel pour la vitesse (une image en retard ne doit pas étirer
       les étoiles), `dt` plafonné pour les animations. */
    const elapsed = Math.max((now - last) / 1000, 1 / 240);
    const dt = Math.min(elapsed, 0.05);
    /* Sur téléphone, à l'arrêt, une image sur deux suffit : la batterie du client compte. */
    if (mobile && mode.kind === "idle" && Math.abs(pTarget - pShown) < 0.002 && velocity.lengthSq() < 0.01) {
      idleSkip = !idleSkip;
      if (idleSkip) {
        skippedLast = true;
        return;
      }
    }
    last = now;
    if (reducedMotion && !dirty && mode.kind === "idle") return;
    dirty = false;
    shared.uTime.value = now / 1000;

    /* Mesuré hors intro (compilation et plongeon faussent la moyenne), et
       seulement entre deux images rendues d'affilée : une image sautée
       exprès doublerait l'intervalle et ferait passer un téléphone au repos
       pour un téléphone lent. */
    if (!degraded && mode.kind === "idle" && frames < 120 && !skippedLast) {
      frames++;
      frameTime += dt;
      if (frames === 120 && (frameTime / frames) * 1000 > COSMOS.slowFrame) {
        degraded = true;
        dpr = 1;
        renderer.setPixelRatio(1);
        shared.uDpr.value = 1;
        starGeom.instanceCount = Math.floor(starCount * 0.6);
        (gas.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.floor(gasCount * 0.5);
        (far.geometry as THREE.InstancedBufferGeometry).instanceCount = Math.floor(farCount * 0.6);
        resize();
      }
    }
    skippedLast = false;

    let fovPunch = 0;
    let flareRest = 1;
    let flareScale = 1;
    /* Au scroll, des traînées plus franches et un champ qui s'ouvre : on doit sentir le vol. */
    let streakGain = 2.4;
    let flash = 0;
    let shock = 0;
    warp = 0;

    if (mode.kind === "intro") {
      if (mode.start < 0) mode.start = now;
      const u = clamp01((now - mode.start) / mode.duration);
      const diveEnd = 0.78;
      const du = clamp01(u / diveEnd);
      const s = mode.from + (1 - mode.from) * diveAt(du);
      introPose(s, clamp01((du - 0.2) / 0.75), camPos, camQuat);
      const speed = du < 1 ? diveSpeed(du) : 0;
      warp = speed * speed;
      fovPunch = warp * 16;
      streakGain = 1 + warp * 3;
      /* De loin, la cible n'est qu'un point à pointes ; l'éclat ne s'ouvre qu'à l'approche. */
      const near = smooth(clamp01((s - 0.55) / 0.45));
      flareRest = 0.08 + 0.92 * near;
      flareScale = 0.3 + 0.7 * near;
      mode.onFrame?.({ progress: du, speed });
      if (du >= 1 && !mode.flared) {
        mode.flared = true;
        flareBurst = 1;
        mode.onFlare();
      }
      if (u >= 1) {
        const done = mode.resolve;
        mode = { kind: "idle" };
        pShown = 0;
        done();
      }
    } else if (mode.kind === "jump") {
      const t = clamp01((now - mode.start) / ETOILE_TIMING.jump);
      pShown = mode.from + (mode.to - mode.from) * jumpTravel(t);
      warp = jumpWarp(t);
      /* Le bloom amplifie l'éclair : il reste sous le blanc pur. */
      flash = 0.55 * Math.exp(-Math.pow((t - flashAt) / 0.02, 2));
      shock = t > flashAt ? clamp01((t - flashAt) / 0.14) : 0;
      fovPunch = t < ANTICIPATION ? -5 * Math.sin((Math.PI * t) / ANTICIPATION) : warp * 26;
      streakGain = 1 + warp * 1.5;
      if (t >= flashAt && !mode.peaked) {
        mode.peaked = true;
        mode.onPeak();
      }
      stationPose(pShown, camPos, camQuat);
      /* Le vaisseau se tourne vers sa route : les traînées partent du point de fuite. */
      posCurve.getTangent(pathIndex(pShown) / pathLast, tangent);
      if (mode.to < mode.from) tangent.negate();
      tmpMatrix.lookAt(camPos, lookPoint.copy(camPos).add(tangent), UP);
      travelQuat.setFromRotationMatrix(tmpMatrix);
      camQuat.slerp(travelQuat, Math.min(1, warp * 1.3) * 0.92);
      if (t >= 1) {
        const done = mode.resolve;
        pShown = mode.to;
        mode = { kind: "idle" };
        stationPose(pShown, camPos, camQuat);
        prevPos.copy(camPos);
        velocity.set(0, 0, 0);
        done();
      }
    } else {
      /* Moins de mouvement : une seule vue fixe, celle du héros. */
      if (!reducedMotion) pShown += (pTarget - pShown) * (1 - Math.exp(-dt / COSMOS.follow));
      stationPose(pShown, camPos, camQuat);
      if (!reducedMotion) {
        const t = now / 1000;
        camPos.x += Math.sin(t * 0.21) * 0.05;
        camPos.y += Math.sin(t * 0.17 + 1.3) * 0.04;
        /* Parallaxe : la souris ou l'inclinaison du téléphone oriente doucement la vue. */
        const ease = 1 - Math.exp(-dt / 0.4);
        gaze.x += (aim.x - gaze.x) * ease;
        gaze.y += (aim.y - gaze.y) * ease;
        camQuat.multiply(gazeQuat.setFromEuler(gazeEuler.set(-gaze.y * 0.03, -gaze.x * 0.045, 0)));
      }
    }

    tmpVel.subVectors(camPos, prevPos).divideScalar(elapsed);
    velocity.lerp(tmpVel, 0.35);
    prevPos.copy(camPos);

    /* En vol au scroll, le vaisseau s'incline vers sa route. */
    if (mode.kind === "idle" && !reducedMotion) {
      const lateral = velocity.dot(tangent.set(1, 0, 0).applyQuaternion(camQuat));
      const target = Math.max(-0.08, Math.min(0.08, -lateral * 0.006));
      bank += (target - bank) * (1 - Math.exp(-dt / 0.25));
      camQuat.multiply(rollQuat.setFromAxisAngle(Z, bank));
    }

    camera.position.copy(camPos);
    camera.quaternion.copy(camQuat);
    if (mode.kind === "idle" && !reducedMotion) fovPunch = Math.min(6, velocity.length() * 0.35);
    camera.fov = COSMOS.fov + fovPunch;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    shared.uProj.value = shared.uResolution.value.y * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

    starUniforms.uTrail.value.copy(velocity).multiplyScalar(reducedMotion ? 0 : COSMOS.streak * streakGain);
    starUniforms.uAlpha.value = 1 - 0.6 * warp;
    /* Au pic d'un saut, la moitié des étoiles suffit : les traînées longues coûtent cher. */
    if (mobile) starGeom.instanceCount = Math.floor(starCount * (degraded ? 0.6 : 1) * (warp > 0.3 ? 0.5 : 1));
    warpUniforms.uWarp.value = mode.kind === "intro" ? warp * 0.5 : warp;
    warpUniforms.uFlash.value = flash;
    warpUniforms.uShock.value = shock < 1 ? shock : 0;
    warpCore.visible = warp > 0.01 || flash > 0.01 || (shock > 0 && shock < 1);

    /* Tunnel : vitesse propre, plein écran en saut. */
    tunnel.visible = warp > 0.01;
    if (tunnel.visible) {
      const speed = warp * 200;
      travel += speed * dt;
      const fwd = tunnelUniforms.uCamFwd.value.set(0, 0, -1).applyQuaternion(camQuat);
      tunnelUniforms.uCamRight.value.set(1, 0, 0).applyQuaternion(camQuat);
      tunnelUniforms.uCamUp.value.set(0, 1, 0).applyQuaternion(camQuat);
      tunnelUniforms.uCamPos.value.copy(camPos);
      tunnelUniforms.uTravel.value = travel;
      tunnelUniforms.uTrail.value.copy(fwd).multiplyScalar(speed * COSMOS.streak * 1.6);
      tunnelUniforms.uAlpha.value = warp * 1.3;
    }

    /* Disque : visible de loin seulement. */
    const diskOpacity = clamp01((camPos.length() - 35) / 90) * 0.9;
    diskMaterial.uniforms.uOpacity.value = diskOpacity;
    disk.visible = diskOpacity > 0;

    /* Astres : présents autour de leur station. */
    const p = mode.kind === "intro" ? 0 : pShown;
    /* Binaires : les deux étoiles tournent, la plus lointaine se dessine d'abord. */
    for (const binary of binaries) {
      const theta = binary.phase + (reducedMotion ? 0 : (now / 1000) * ((2 * Math.PI) / BINARY.period));
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      binary.a.pos.copy(binary.center).addScaledVector(binary.u1, c * BINARY.orbitA).addScaledVector(binary.u2, s * BINARY.orbitA);
      binary.b.pos.copy(binary.center).addScaledVector(binary.u1, -c * BINARY.orbitB).addScaledVector(binary.u2, -s * BINARY.orbitB);
      const aFarther = camPos.distanceToSquared(binary.a.pos) > camPos.distanceToSquared(binary.b.pos);
      binary.a.meshes[0].renderOrder = aFarther ? 4 : 4.2;
      binary.b.meshes[0].renderOrder = aFarther ? 4.2 : 4;
    }
    for (const sun of suns) {
      const fade = fadeByStation(sun.index, p);
      for (const mesh of sun.meshes) mesh.visible = fade > 0.003;
      sun.material.uniforms.uFade.value = fade;
      /* Le halo suit l'astre qui grandit ; au loin, des pointes de point lumineux. */
      const radiusPx = ((sun.radius * shared.uProj.value) / Math.max(camPos.distanceTo(sun.pos), 0.5)) * smooth(fade);
      /* Pendant le plongeon, l'astre visé reste une pointe : son halo s'ouvre avec l'éclat. */
      sun.glare.uniforms.uSizePx.value = Math.max(radiusPx * 4.5, FLYBY.glarePx * dpr * flareScale);
      sun.glare.uniforms.uCorePx.value = Math.max(radiusPx * 0.5, 7 * dpr * flareScale);
      sun.glare.uniforms.uMaskPx.value = radiusPx;
      /* Au loin, l'astre est un point qui scintille de ses pointes ; de près, elles s'effacent. */
      const far = clamp01((camPos.distanceTo(sun.pos) - FLYBY.glareNear) / FLYBY.glareFar);
      sun.glare.uniforms.uIntensity.value = fade * (0.12 + 0.8 * far);
    }
    for (const body of glowBodies) {
      const fade = fadeByStation(body.index, p);
      body.mesh.visible = fade > 0.003;
      body.material.uniforms.uFade.value = fade;
    }
    for (const c of constellationMaterials) {
      const fade = fadeByStation(c.index, p);
      for (const mesh of c.meshes) mesh.visible = fade > 0.003;
      c.line.uniforms.uFade.value = fade * 0.45;
      c.line.uniforms.uDraw.value = clamp01((fade - 0.35) / 0.6);
      c.stars.uniforms.uAlpha.value = fade;
    }

    /* L'étoile du héros : éclat à l'arrivée, puis repos. */
    flareBurst = Math.max(0, flareBurst - dt * 1.5);
    const burst = smooth(flareBurst);
    const { x: w, y: h } = shared.uResolution.value;
    const away = clamp01(1 - p * 0.9);
    /* Hors du héros, l'étoile s'efface : elle ne doit pas flotter dans les autres systèmes. */
    const heroPresence = clamp01(1.4 - p);
    flareUniforms.uIntensity.value = flareRest * (0.12 + 0.88 * away) * heroPresence + burst * 2.6;
    flareUniforms.uSpikes.value = 0.15 + 0.4 * away + burst * 1.2;
    flareUniforms.uCorePx.value = dpr * (9 + burst * 26) * flareScale;
    flareUniforms.uSizePx.value = Math.min(w, h) * 0.4 * flareScale + burst * Math.max(w, h) * 0.35;

    updateComets(dt, p);
    /* Objectif : l'aberration s'ouvre avec la vitesse, le flou radial n'existe qu'en vol. */
    compositeMaterial.uniforms.uAberration.value = POST.aberration * (1 + warp * 3);
    compositeMaterial.uniforms.uRadial.value = reducedMotion ? 0 : warp * POST.radial;
    renderer.setRenderTarget(sceneTarget);
    renderer.render(scene, camera);
    runPost(!degraded);
  };

  const start = () => {
    last = performance.now();
    renderer.setAnimationLoop(frame);
  };
  const stop = () => renderer.setAnimationLoop(null);
  const onVisibility = () => (document.hidden || paused ? stop() : start());
  /* Contexte perdu (iOS en arrière-plan, pilote) : la page bascule sur son ciel CSS. */
  let lost = false;
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stop();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  const release = () => {
    stop();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("deviceorientation", onTilt);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    resizeObserver.disconnect();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
    postMesh.geometry.dispose();
    for (const material of [brightMaterial, downMaterial, blurMaterial, compositeMaterial]) material.dispose();
    for (const target of [sceneTarget, bloomA, bloomB, wideA, wideB]) target.dispose();
    shared.uNoise.value.dispose();
    skyTarget.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  /* Programmes compilés avant le premier rendu (tunnel et cœur du saut compris,
     montrés le temps de la compilation) : ni intro ni premier saut ne saccadent.
     Les passes de post-traitement se compilent sur un premier rendu à blanc. */
  tunnel.visible = warpCore.visible = true;
  await renderer.compileAsync(scene, camera);
  tunnel.visible = warpCore.visible = false;
  if (lost) {
    release();
    throw new Error("Contexte WebGL perdu pendant la compilation");
  }
  renderer.setRenderTarget(sceneTarget);
  renderer.render(scene, camera);
  runPost(true);
  document.addEventListener("visibilitychange", onVisibility);
  start();

  const api: Cosmos = {
    intro({ short, onFrame, onFlare }) {
      if (reducedMotion) {
        onFlare();
        return Promise.resolve();
      }
      buildIntro();
      return new Promise<void>((resolve) => {
        mode = {
          kind: "intro",
          start: -1,
          duration: short ? ETOILE_TIMING.introShort : ETOILE_TIMING.intro,
          from: short ? 0.55 : 0,
          onFrame,
          onFlare,
          flared: false,
          resolve,
        };
      });
    },
    skipIntro() {
      if (mode.kind !== "intro") return;
      const { onFlare, flared, resolve } = mode;
      mode = { kind: "idle" };
      pShown = pTarget;
      stationPose(pShown, camPos, camQuat);
      prevPos.copy(camPos);
      velocity.set(0, 0, 0);
      if (!flared) {
        flareBurst = 0.6;
        onFlare();
      }
      resolve();
    },
    setProgress(p, snap = false) {
      pTarget = p;
      if (snap && !reducedMotion) {
        pShown = p;
        stationPose(p, camPos, camQuat);
        prevPos.copy(camPos);
        velocity.set(0, 0, 0);
      }
    },
    jump(to, onPeak) {
      if (mode.kind === "intro") api.skipIntro();
      if (mode.kind === "jump") {
        if (!mode.peaked) mode.onPeak();
        mode.resolve();
      }
      return new Promise<void>((resolve) => {
        warpUniforms.uTint.value.set(...(arrivalTint(Math.round(to)) as [number, number, number]));
        tunnelUniforms.uTint.value.copy(warpUniforms.uTint.value);
        mode = { kind: "jump", start: performance.now(), from: pShown, to, onPeak, peaked: false, resolve };
        pTarget = to;
      });
    },
    setPaused(next) {
      paused = next;
      dirty = true;
      onVisibility();
    },
    dispose() {
      /* Un saut ou une intro en cours ne doit pas laisser la page masquée. */
      if (mode.kind === "jump") {
        if (!mode.peaked) mode.onPeak();
        mode.resolve();
      } else if (mode.kind === "intro") {
        mode.resolve();
      }
      mode = { kind: "idle" };
      release();
    },
  };
  return api;
}
