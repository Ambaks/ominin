/*
 * La scène de L'Étoile : une vidéo plein écran derrière la carte. Chaque
 * chapitre a son repère (la Voie lactée, puis un astre par famille), filmé en
 * boucle (images NASA/ESA animées par Veo) ; passer d'un chapitre à l'autre
 * joue un saut en hyperespace d'un repère au suivant, rendu image par image
 * depuis les deux repères. Le cadrage suit l'écran : repère à droite en
 * paysage, centré en haut en portrait.
 *
 * Tout passe par une seule file (run) : jamais deux plans en concurrence.
 * Chaque attente réseau a son délai ; un plan qui tarde est sauté, et la
 * scène fond sur l'image fixe. En mouvement réduit, en économie de données,
 * ou si la lecture est refusée (iOS en économie d'énergie), la scène fond
 * d'une image fixe à l'autre.
 */

/** Réglages : valeurs nommées, à valider (voir la passation). */
export const STAGE = {
  base: "/l-etoile/stage/",
  /* Repères, dans l'ordre des chapitres (0 = héros). */
  landmarks: ["galaxie", "alcools", "softs", "shooters", "champagnes"],
  /* Centre du repère dans le cadre (part de la largeur, de la hauteur), par format : le point de fuite des sauts. */
  spot: { d: [0.7, 0.5], m: [0.5, 0.24] },
  /* Fondu entre deux plans, ms (même valeur que --et-base dans etoile.css). */
  fade: 480,
  /* Instant du saut où le contenu change : son éclat, rendu à cette part de sa durée. */
  peak: 0.58,
  /* Au-delà, un plan qui ne démarre pas est sauté (ms). */
  timeout: 1500,
  /* Marge après la fin prévue d'un saut : un saut figé (onglet en veille, flux coupé) libère la file (ms). */
  grace: 1500,
  /* Réseaux trop lents pour la vidéo : la scène reste en images fixes. */
  slowNetworks: ["slow-2g", "2g"],
  /* Réseaux justes : on ne charge d'avance que le prochain saut. */
  lightNetworks: ["3g"],
} as const;

type Format = "d" | "m";

export interface StageOptions {
  reducedMotion: boolean;
  /** Un saut commence : sa durée (ms), l'instant de son pic (part de la durée), son point de fuite (part de la largeur, de la hauteur). */
  onWarp?: (duration: number, peak: number, spot: readonly [number, number]) => void;
}

export interface Stage {
  /** Mène la scène au repère `index` ; `onPeak` au cœur du saut, quand le contenu peut changer. */
  goTo(index: number, onPeak?: () => void): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const landscape = () => matchMedia("(min-aspect-ratio: 1/1)");

/* Données comptées ou réseau trop lent : la scène reste en images fixes. */
const network = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
const frugal = () =>
  Boolean(network()?.saveData) || (STAGE.slowNetworks as readonly string[]).includes(network()?.effectiveType ?? "");
const light = () => (STAGE.lightNetworks as readonly string[]).includes(network()?.effectiveType ?? "");

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
/* Une promesse, ou un échec au-delà du délai. */
const within = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([promise, wait(ms).then(() => Promise.reject(new DOMException("délai", "TimeoutError")))]);

export function createStage(host: HTMLElement, { reducedMotion, onWarp }: StageOptions): Stage {
  const names = STAGE.landmarks;
  const query = landscape();
  let format: Format = query.matches ? "d" : "m";
  const loopUrl = (i: number) => `${STAGE.base}loop-${names[i]}-${format}.mp4`;
  const stillUrl = (i: number) => `${STAGE.base}${names[i]}-${format}.jpg`;
  /* Le saut d'un repère à son voisin. */
  const warpUrl = (from: number, to: number) => `${STAGE.base}warp-${names[from]}-${names[to]}-${format}.mp4`;

  /* -1 : rien encore à l'écran ; la première boucle passe par la file comme les autres. */
  let shown = -1;
  let target = 0;
  let busy = false;
  let reframe = false;
  let paused = false;
  let disposed = false;
  let stills = reducedMotion || frugal();
  let peak: (() => void) | null = null;
  let front: HTMLVideoElement | null = null;
  /* Le saut en cours : une feuille qui s'ouvre l'abrège (sa vidéo s'arrête, son pic ne viendrait jamais). */
  let cutWarp: (() => void) | null = null;
  const cache = new Map<string, HTMLVideoElement>();

  /* L'image fixe du repère, toujours sous la vidéo : jamais d'écran noir entre deux plans. */
  const base = document.createElement("img");
  const veil = document.createElement("img");
  for (const img of [base, veil]) {
    img.alt = "";
    img.decoding = "async";
    img.className = "et-stage-layer";
    host.appendChild(img);
  }
  base.dataset.on = "";

  const firePeak = () => {
    const callback = peak;
    peak = null;
    callback?.();
  };

  const fadeStill = async (index: number) => {
    veil.src = stillUrl(index);
    await veil.decode().catch(() => {});
    veil.dataset.on = "";
    await wait(STAGE.fade);
    base.src = stillUrl(index);
    delete veil.dataset.on;
    await wait(STAGE.fade);
  };

  const video = (url: string) => {
    const cached = cache.get(url);
    if (cached) return cached;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.disableRemotePlayback = true;
    v.className = "et-stage-layer";
    v.src = url;
    cache.set(url, v);
    return v;
  };

  /* Un plan abandonné : son téléchargement s'arrête aussi. */
  const drop = (url: string, v: HTMLVideoElement) => {
    v.pause();
    v.removeAttribute("src");
    v.load();
    v.remove();
    cache.delete(url);
  };

  /* Un plan sort : il s'efface, puis quitte la scène. */
  const retire = (v: HTMLVideoElement | null) => {
    if (!v) return;
    delete v.dataset.on;
    void wait(STAGE.fade).then(() => {
      if (v === front) return;
      v.pause();
      v.remove();
    });
  };

  /*
   * Un plan entre par-dessus le précédent. kind : « loop » (fondu long),
   * « warp » (fondu court : l'image de départ du saut ne colle pas à l'instant
   * de la boucle), « cut » (raccord à l'éclat, pris à la part `at` de sa
   * durée). Refusé (économie d'énergie) : la scène passe aux images fixes ;
   * en erreur : ce plan seul est sauté (null) ; en retard aussi, mais il
   * continue de se charger, et une boucle attendue revient dès qu'elle peut.
   */
  const show = async (
    url: string,
    kind: "loop" | "warp" | "cut",
    { at = 0, onStart }: { at?: number; onStart?: (v: HTMLVideoElement) => void } = {},
  ) => {
    if (disposed) return null;
    const v = video(url);
    v.loop = kind === "loop";
    v.dataset.kind = kind;
    host.appendChild(v);
    try {
      if (v.readyState < HTMLMediaElement.HAVE_METADATA)
        await within(new Promise((resolve) => v.addEventListener("loadedmetadata", resolve, { once: true })), STAGE.timeout);
      v.currentTime = v.duration * at;
      if (!paused) await within(v.play(), STAGE.timeout);
      else if (v.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)
        await within(new Promise((resolve) => v.addEventListener("canplay", resolve, { once: true })), STAGE.timeout);
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        v.pause();
        v.remove();
        if (kind === "loop")
          v.addEventListener(
            "canplay",
            () => {
              if (url !== loopUrl(shown) || disposed || stills) return;
              reframe = true;
              kick();
            },
            { once: true },
          );
      } else drop(url, v);
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        stills = true;
        retire(front);
        front = null;
      }
      return null;
    }
    if (disposed) {
      drop(url, v);
      return null;
    }
    /* Un plan déjà chargé arrive dans la même image que son ajout : sans cette image d'écart, pas de fondu, une coupe. */
    void v.offsetWidth;
    await nextFrame();
    v.dataset.on = "";
    onStart?.(v);
    const previous = front;
    front = v;
    onVisibility();
    if (previous !== v) retire(previous);
    return v;
  };

  /*
   * Le saut se joue jusqu'au bout ; son pic, suivi à l'image près, déclenche
   * le changement de contenu. `toPeak` : il s'arrête à son éclat, sans le
   * contenu (premier bond d'un saut lointain).
   */
  const play = (v: HTMLVideoElement, toPeak = false) =>
    new Promise<void>((resolve) => {
      /* Une feuille s'est ouverte entre-temps : pas de voyage figé derrière elle. */
      if (paused) {
        if (!toPeak) firePeak();
        return resolve();
      }
      let frame = 0;
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        cutWarp = null;
        cancelAnimationFrame(frame);
        v.removeEventListener("ended", done);
        v.removeEventListener("error", done);
        if (!toPeak) firePeak();
        resolve();
      };
      const watch = () => {
        if (v.duration && v.currentTime >= v.duration * STAGE.peak) {
          if (toPeak) return done();
          firePeak();
        }
        frame = requestAnimationFrame(watch);
      };
      v.addEventListener("ended", done);
      v.addEventListener("error", done);
      frame = requestAnimationFrame(watch);
      cutWarp = done;
      void wait((v.duration || 0) * 1000 + STAGE.grace).then(done);
    });

  /* Au repos, les sauts vers les voisins se chargent d'abord, puis leurs boucles : le prochain voyage part sans attendre. */
  const prefetch = () => {
    const wanted = new Set<string>([loopUrl(shown)]);
    const neighbours = [shown + 1, shown - 1].filter((i) => i >= 0 && i < names.length);
    if (light()) {
      if (shown + 1 < names.length) wanted.add(warpUrl(shown, shown + 1));
    } else {
      for (const i of neighbours) wanted.add(warpUrl(shown, i));
      for (const i of neighbours) wanted.add(loopUrl(i));
    }
    for (const [url, v] of cache) {
      /* Un plan encore à l'écran (qui finit de s'effacer) reste. */
      if (wanted.has(url) || v.isConnected) continue;
      drop(url, v);
    }
    for (const url of wanted) video(url);
  };

  const run = async () => {
    busy = true;
    while (!disposed && (target !== shown || reframe)) {
      const to = target;
      if (stills) {
        firePeak();
        await fadeStill(to);
        shown = to;
        reframe = false;
        continue;
      }
      /* Sous une feuille ouverte, pas de voyage : le repère change directement. */
      if (shown >= 0 && to !== shown && !reframe && !paused) {
        const step = to > shown ? 1 : -1;
        const onStart = (v: HTMLVideoElement) => onWarp?.(v.duration * 1000, STAGE.peak, STAGE.spot[format]);
        /* Plus loin qu'un voisin : on plonge vers le voisin, et à son éclat on raccorde sur l'arrivée, prise à son propre éclat. */
        if (Math.abs(to - shown) > 1) {
          const dive = await show(warpUrl(shown, shown + step), "warp", { onStart });
          if (dive) await play(dive, true);
          const arrival = dive && !paused && (await show(warpUrl(to - step, to), "cut", { at: STAGE.peak }));
          if (arrival) await play(arrival);
        } else {
          const warp = await show(warpUrl(shown, to), "warp", { onStart });
          if (warp) await play(warp);
        }
        if (disposed) break;
      }
      reframe = false;
      firePeak();
      shown = to;
      base.src = stillUrl(to);
      if (stills) await fadeStill(to);
      else if (!(await show(loopUrl(to), "loop")) && !stills) {
        retire(front);
        front = null;
        await fadeStill(to);
      }
    }
    busy = false;
    /* Un saut demandé vers le repère déjà montré, pendant que la file tournait : son pic vient ici. */
    firePeak();
    if (!disposed && !stills) prefetch();
  };

  const kick = () => {
    if (!busy) void run();
  };
  /* Rotation, redimensionnement : la scène se recadre au prochain tour de file. */
  const onFormat = () => {
    format = query.matches ? "d" : "m";
    reframe = true;
    kick();
  };
  /* Onglet caché ou feuille ouverte : la scène se fige ; elle reprend, sauf un saut déjà fini. */
  const onVisibility = () => {
    if (document.hidden || paused) front?.pause();
    else if (front && !front.ended) void front.play().catch(() => {});
  };
  query.addEventListener("change", onFormat);
  document.addEventListener("visibilitychange", onVisibility);
  /* Après les effets de la page : son premier goTo (rechargement en plein chapitre) part directement au bon repère. */
  queueMicrotask(kick);

  return {
    goTo(index, onPeak) {
      if (peak && onPeak) firePeak();
      if (onPeak) peak = onPeak;
      target = Math.max(0, Math.min(names.length - 1, index));
      if (target === shown && !busy) firePeak();
      else kick();
    },
    setPaused(next) {
      paused = next;
      if (paused) cutWarp?.();
      onVisibility();
    },
    dispose() {
      disposed = true;
      firePeak();
      query.removeEventListener("change", onFormat);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const v of cache.values()) {
        v.pause();
        v.removeAttribute("src");
        v.load();
        v.remove();
      }
      cache.clear();
      base.remove();
      veil.remove();
    },
  };
}
