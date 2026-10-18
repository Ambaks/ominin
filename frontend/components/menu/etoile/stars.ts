/*
 * Le ciel vivant de L'Étoile, par-dessus la scène vidéo : des étoiles sur
 * trois profondeurs qui dérivent, scintillent et suivent le défilement en
 * parallaxe, une étoile filante de temps en temps. Pendant un saut, elles
 * s'étirent en traînées vers le point de fuite du repère d'arrivée. Un
 * canevas 2D léger ; en mouvement réduit, un ciel fixe dessiné une fois.
 */

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const STARS = {
  /* Une étoile pour tant de px² d'écran (CSS), et au moins tant d'étoiles (téléphone). */
  density: 2400,
  minCount: 220,
  /* Profondeurs, et part des étoiles sur la plus lointaine puis sur la moyenne. */
  depths: [0.3, 0.6, 1],
  farShare: 0.5,
  midShare: 0.65,
  /* Taille (px CSS, avant profondeur) et éclat (0–1), plage aléatoire de chaque étoile ; la profondeur les module. */
  size: [0.6, 2],
  alpha: [0.25, 0.85],
  depthSize: 0.5,
  depthAlpha: 0.55,
  /* Le point de lumière : rendu une fois (px), dessiné à tant de fois la taille de l'étoile ; paliers de son halo. */
  sprite: 32,
  spriteScale: 3,
  spriteStops: [
    [0, 1],
    [0.18, 0.85],
    [0.45, 0.18],
    [1, 0],
  ],
  /* Scintillement : amplitude (part de l'éclat) et vitesse (rad/s). */
  twinkle: 0.3,
  twinkleSpeed: [0.6, 2.4],
  /* Teintes : argent, un bleu froid, un blanc chaud ; part de l'argent. */
  tints: ["244, 245, 247", "223, 230, 242", "242, 234, 219"],
  silverShare: 0.7,
  coolShare: 0.5,
  /* Dérive du ciel à la profondeur 1, px/s (x, y). */
  drift: [-14, -8],
  /* Parallaxe : part du défilement suivie à la profondeur 1. */
  parallax: 0.1,
  /* Étoile filante : intervalle entre deux (ms), vitesse (px/s), longueur (px), durée de vie (s), épaisseur (px). */
  shootingEvery: [6000, 13000],
  shootingSpeed: 1100,
  shootingLength: 180,
  shootingLife: 0.7,
  shootingWidth: 1.2,
  shootingAlpha: 0.9,
  /* Elle part du tiers droit, dans les deux cinquièmes du haut, vers le bas à gauche (angle en tours de π). */
  shootingFrom: { x: [0.3, 1], y: [0, 0.4] },
  shootingAngle: [0.62, 0.74],
  /* Saut : longueur maximale des traînées (px), leur éclat et leur épaisseur maximaux, leur extinction après le pic (ms). */
  warpLength: 300,
  warpAlpha: 0.3,
  warpWidth: 1,
  warpRelease: 300,
  /* Une traînée naît à cette part de sa longueur près du point de fuite ; sa moitié arrière garde cette part de l'éclat. */
  warpReach: 0.25,
  warpTail: 0.3,
  /* Un ciel de points fins n'a pas besoin de la pleine résolution des écrans les plus denses. */
  dprCap: 1.5,
  /* Téléphone : une image sur deux suffit à une dérive lente, la batterie du client compte. */
  phoneFrameSkip: 2,
  /* Écart maximal entre deux images (s) : un onglet repris ne fait pas sauter la dérive. */
  maxStep: 0.05,
} as const;

export interface Stars {
  /** Les étoiles s'étirent en traînées vers le point de fuite (part de la largeur, de la hauteur), le temps d'un saut ; `peak` : part de sa durée. */
  warp(duration: number, peak: number, spot: readonly [number, number]): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

interface Star {
  x: number;
  y: number;
  depth: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
  tint: string;
  /* La couleur de sa traînée, calculée une fois. */
  stroke: string;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;
const between = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);

export function createStars(canvas: HTMLCanvasElement, { reducedMotion }: { reducedMotion: boolean }): Stars {
  const ctx = canvas.getContext("2d")!;
  const phone = matchMedia("(pointer: coarse)").matches;
  let width = 0;
  let height = 0;
  let stars: Star[] = [];
  let raf = 0;
  let tick = 0;
  let paused = false;
  let last = 0;
  let driftX = 0;
  let driftY = 0;
  let warpStart = -Infinity;
  let warpPeakAt = 0;
  let warpSpot: readonly [number, number] = [0.5, 0.5];
  let nextShooting = 0;
  let shooting: { x: number; y: number; vx: number; vy: number; life: number } | null = null;

  /* Un point doux, rendu une fois : chaque étoile le reprend à sa taille. */
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = STARS.sprite;
  {
    const s = sprite.getContext("2d")!;
    const r = STARS.sprite / 2;
    const g = s.createRadialGradient(r, r, 0, r, r, r);
    for (const [at, a] of STARS.spriteStops) g.addColorStop(at, `rgba(255, 255, 255, ${a})`);
    s.fillStyle = g;
    s.fillRect(0, 0, STARS.sprite, STARS.sprite);
  }

  const seed = () => {
    const count = Math.max(STARS.minCount, Math.round((width * height) / STARS.density));
    stars = Array.from({ length: count }, () => {
      const depth = STARS.depths[Math.random() < STARS.farShare ? 0 : Math.random() < STARS.midShare ? 1 : 2];
      const tint = Math.random() < STARS.silverShare ? STARS.tints[0] : STARS.tints[Math.random() < STARS.coolShare ? 1 : 2];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        size: between(STARS.size) * (STARS.depthSize + depth),
        alpha: between(STARS.alpha) * (1 - STARS.depthAlpha + STARS.depthAlpha * depth),
        phase: Math.random() * Math.PI * 2,
        speed: between(STARS.twinkleSpeed),
        tint,
        stroke: `rgb(${tint})`,
      };
    });
  };

  const draw = (now: number) => {
    ctx.clearRect(0, 0, width, height);
    const t = now / 1000;
    const scroll = window.scrollY * STARS.parallax;
    /* Accélère jusqu'au changement de repère, puis s'éteint vite : la traînée meurt avec le freinage. */
    const elapsed = now - warpStart;
    const streak = reducedMotion
      ? 0
      : elapsed < warpPeakAt
        ? (elapsed / warpPeakAt) ** 2
        : Math.max(0, 1 - (elapsed - warpPeakAt) / STARS.warpRelease) ** 3;
    const cx = width * warpSpot[0];
    const cy = height * warpSpot[1];
    const reach = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
    for (const s of stars) {
      const x = mod(s.x + driftX * s.depth, width);
      const y = mod(s.y + driftY * s.depth - scroll * s.depth, height);
      const alpha = s.alpha * (reducedMotion ? 1 : 1 - STARS.twinkle + STARS.twinkle * Math.sin(s.phase + t * s.speed));
      if (streak > 0.01) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const length = streak * STARS.warpLength * s.depth * (STARS.warpReach + dist / reach);
        /* La tête à l'étoile, la traînée vers le point de fuite : on plonge vers lui. Deux tronçons : elle s'effile. */
        const tx = x - (dx / dist) * length;
        const ty = y - (dy / dist) * length;
        const head = Math.min(STARS.warpAlpha, alpha * (1 + streak));
        ctx.strokeStyle = s.stroke;
        ctx.lineWidth = STARS.warpWidth * s.depth;
        ctx.globalAlpha = head * STARS.warpTail;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo((x + tx) / 2, (y + ty) / 2);
        ctx.stroke();
        ctx.globalAlpha = head;
        ctx.beginPath();
        ctx.moveTo((x + tx) / 2, (y + ty) / 2);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      const size = s.size * STARS.spriteScale;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    if (shooting) {
      const { x, y, vx, vy } = shooting;
      const speed = Math.hypot(vx, vy);
      const tx = x - (vx / speed) * STARS.shootingLength;
      const ty = y - (vy / speed) * STARS.shootingLength;
      const tail = ctx.createLinearGradient(x, y, tx, ty);
      tail.addColorStop(0, `rgba(255, 255, 255, ${STARS.shootingAlpha * shooting.life})`);
      tail.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.strokeStyle = tail;
      ctx.lineWidth = STARS.shootingWidth;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, STARS.dprCap);
    const widened = canvas.clientWidth !== width;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Une barre d'adresse qui se replie ne rebat pas le ciel ; une rotation, si. Le canevas vidé se redessine aussitôt. */
    if (widened) seed();
    draw(performance.now());
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    /* Pendant un saut, chaque image : les traînées suivent la vidéo. */
    const warping = now - warpStart < warpPeakAt + STARS.warpRelease;
    if (phone && !warping && tick++ % STARS.phoneFrameSkip) return;
    const dt = Math.min((now - (last || now)) / 1000, STARS.maxStep * (phone ? STARS.phoneFrameSkip : 1));
    last = now;
    driftX += STARS.drift[0] * dt;
    driftY += STARS.drift[1] * dt;
    if (!shooting && now >= nextShooting) {
      const angle = Math.PI * between(STARS.shootingAngle);
      shooting = {
        x: width * between(STARS.shootingFrom.x),
        y: height * between(STARS.shootingFrom.y),
        vx: Math.cos(angle) * STARS.shootingSpeed,
        vy: Math.sin(angle) * STARS.shootingSpeed,
        life: 1,
      };
    }
    if (shooting) {
      shooting.x += shooting.vx * dt;
      shooting.y += shooting.vy * dt;
      shooting.life -= dt / STARS.shootingLife;
      if (shooting.life <= 0) {
        shooting = null;
        nextShooting = now + between(STARS.shootingEvery);
      }
    }
    draw(now);
  };

  const start = () => {
    if (reducedMotion || paused || document.hidden || raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  nextShooting = performance.now() + STARS.shootingEvery[0];
  start();

  return {
    warp(duration, peak, spot) {
      if (reducedMotion) return;
      warpStart = performance.now();
      warpPeakAt = duration * peak;
      warpSpot = spot;
    },
    setPaused(next) {
      paused = next;
      if (paused) stop();
      else start();
    },
    dispose() {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
