"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { OptionsModal } from "@/components/menu/add-to-order";
import { useNoSheet } from "@/components/menu/sheet";
import { cartLineKey, useCart } from "@/lib/menu/cart";
import { formatPrice, lineName } from "@/lib/menu/format";
import { scrollBehavior } from "@/lib/menu/scroll";
import {
  displayPhone,
  type MenuCategory,
  type MenuItem,
  type Restaurant,
} from "@/lib/menu-data";
import type { BlackHole } from "./black-hole";
import type { BodyKind, Cosmos, IntroFrame } from "./cosmos";
import { EtoileMark } from "./logo";
import { ETOILE_TIMING } from "./timing";
import "./etoile.css";

/*
 * La carte de L'Étoile, version vaisseau : un plongeon dans la galaxie à
 * l'ouverture, un système stellaire par famille de bouteilles, un saut en
 * hyperespace d'un système à l'autre, et le panier en trou noir. Dessous,
 * tout le parcours de commande reste celui d'Ominin (CartProvider, CartBar,
 * OptionsModal) : seule la mise en scène est propre à l'établissement.
 */

interface SystemDef {
  id: string;
  name: string;
  body: BodyKind;
  categories: string[];
}

/* Les catégories de la carte, regroupées en systèmes : un astre chacun. */
const SYSTEMS: SystemDef[] = [
  {
    id: "alcools",
    name: "Alcools",
    body: "constellation",
    categories: ["rhums", "tequilas", "whiskys", "vodkas", "gins", "cognacs"],
  },
  {
    id: "softs",
    name: "Softs",
    body: "binary",
    categories: ["sodas", "eau"],
  },
  {
    id: "shooters",
    name: "Shooters",
    body: "pulsar",
    categories: ["shooters"],
  },
  {
    id: "champagnes",
    name: "Champagnes",
    body: "gold-giant",
    categories: ["champagnes"],
  },
];

/* 2 avenue d'Atlanta (43,6406 N, 1,4681 E, OpenStreetMap), à la minute d'arc. */
const COORDS = "43°38′N 1°28′E";
const INTRO_SEEN = "etoile-intro-vue";
/* Distance affichée au départ du plongeon, en années-lumière. */
const INTRO_DISTANCE_AL = 26000;
/* Au-delà, le moteur WebGL n'est pas encore là (réseau du club) : la carte s'ouvre sans intro. */
const INTRO_WAIT_MS = 6000;

/* Traînée de la bouteille vers le trou noir : nombre d'échos, retard entre deux. */
const PARTICLE_TRAIL = 6;
const PARTICLE_ECHO_MS = 22;
/* Révélation des lignes : décalage en racine de l'index (rapide puis s'étire). */
const REVEAL_STAGGER_MS = 110;
/* Trou noir : préparé au repos après ce délai ; gonflement à l'impact. */
const HOLE_IDLE_MS = 2500;
const HOLE_SWELL = 1.45;

const isMobile = () =>
  matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

const pad = (n: number) => String(n).padStart(2, "0");

function introSeen() {
  try {
    return sessionStorage.getItem(INTRO_SEEN) === "1";
  } catch {
    return false;
  }
}

function rememberIntro() {
  try {
    sessionStorage.setItem(INTRO_SEEN, "1");
  } catch {
    // Stockage refusé : l'intro rejouera en entier, rien de plus.
  }
}

/*
 * Trajet d'une bouteille vers le trou noir : un arc jusqu'au bord du disque,
 * puis une spirale qui se resserre dans le plan incliné du disque.
 */
function spiralFrames(
  from: { x: number; y: number },
  to: { x: number; y: number },
): Keyframe[] {
  const steps = 40;
  const radius = 54;
  const flatten = 0.32;
  const theta0 = Math.atan2(from.y - to.y, from.x - to.x) + 0.8;
  const entry = {
    x: to.x + Math.cos(theta0) * radius,
    y: to.y + Math.sin(theta0) * radius * flatten,
  };
  const control = {
    x: (from.x + entry.x) / 2 + 40,
    y: Math.min(from.y, entry.y) - 90,
  };
  const split = 0.58;
  const point = (t: number) => {
    if (t <= split) {
      const s = t / split;
      const e = s * s * (3 - 2 * s);
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      return {
        x: a * from.x + b * control.x + c * entry.x,
        y: a * from.y + b * control.y + c * entry.y,
        scale: 1,
      };
    }
    const s = (t - split) / (1 - split);
    const r = radius * Math.pow(1 - s, 1.4);
    const th = theta0 - s * Math.PI * 2.3;
    return {
      x: to.x + Math.cos(th) * r,
      y: to.y + Math.sin(th) * r * flatten,
      scale: 1 - s * 0.85,
    };
  };
  const frames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = point(t);
    const q = point(Math.min(1, t + 1 / steps));
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    const speed = Math.hypot(q.x - p.x, q.y - p.y);
    const stretch = 1 + Math.min(speed / 9, 2.4);
    frames.push({
      offset: t,
      opacity: t > 0.94 ? (1 - t) / 0.06 : 1,
      transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${angle}rad) scale(${stretch * p.scale}, ${p.scale})`,
    });
  }
  return frames;
}

interface SystemView extends SystemDef {
  groups: MenuCategory[];
  items: MenuItem[];
}

export function EtoileMenu({
  restaurant,
  tableNumber,
}: {
  restaurant: Restaurant;
  tableNumber: number | null;
}) {
  const cart = useCart();
  const noSheet = useNoSheet();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const holeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const speedRef = useRef<HTMLElement>(null);
  const distRef = useRef<HTMLElement>(null);
  const cosmosRef = useRef<Cosmos | null>(null);
  const holeApi = useRef<BlackHole | null>(null);
  const tops = useRef<number[]>([]);
  /* Paires (scroll, progression) : chaque système compte une demi-station
     pour son en-tête et une demie pour sa liste. */
  const stops = useRef<[number, number][]>([]);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const pendingOrigin = useRef<{ x: number; y: number } | null>(null);
  const reduced = useRef(false);
  const skipped = useRef(false);
  const finishRef = useRef<(() => void) | null>(null);
  const jumpToken = useRef(0);
  const progress = useRef(0);
  const noSheetRef = useRef(true);
  const [warpLabel, setWarpLabel] = useState<string | null>(null);
  const [phase, setPhase] = useState<"boot" | "intro" | "ready">("boot");
  const [revealed, setRevealed] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [active, setActive] = useState(0);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [clock, setClock] = useState<string | null>(null);
  const [short, setShort] = useState(false);
  const [holeReady, setHoleReady] = useState(false);

  const systems = useMemo<SystemView[]>(() => {
    const byId = new Map(
      restaurant.categories.map((category) => [category.id, category]),
    );
    return SYSTEMS.map((system) => {
      const groups = system.categories.flatMap((id) => byId.get(id) ?? []);
      return {
        ...system,
        groups,
        items: groups.flatMap((group) => group.items),
      };
    }).filter((system) => system.items.length > 0);
  }, [restaurant]);
  const references = systems.reduce(
    (sum, system) => sum + system.items.length,
    0,
  );

  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of cart.lines)
      counts.set(line.itemId, (counts.get(line.itemId) ?? 0) + line.quantity);
    return counts;
  }, [cart.lines]);

  /* ---------- Cosmos et intro ---------- */
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    /* Un canevas neuf par montage : deux montages (Strict Mode) ne se partagent pas un contexte. */
    const canvas = document.createElement("canvas");
    canvas.className = "et-canvas";
    host.appendChild(canvas);
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = introSeen();
    setShort(seen);
    const html = document.documentElement;
    let disposed = false;
    let cosmos: Cosmos | null = null;

    html.classList.add("et-locked");
    const restoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo({ top: 0, behavior: "instant" });

    const finish = () => {
      if (disposed) return;
      html.classList.remove("et-locked");
      rememberIntro();
      setRevealed(true);
      setPhase("ready");
    };
    let fell = false;
    const fallback = (error?: unknown) => {
      if (disposed || fell) return;
      fell = true;
      window.clearTimeout(wait);
      if (error) console.error("L'Étoile : cosmos indisponible", error);
      rootRef.current?.classList.remove("is-warping");
      setWebgl(false);
      finish();
    };
    finishRef.current = finish;
    const wait = window.setTimeout(() => {
      skipped.current = true;
      finish();
    }, INTRO_WAIT_MS);

    const writeTelemetry = (frame: IntroFrame, elapsed: number) => {
      if (timeRef.current) {
        const seconds = elapsed / 1000;
        timeRef.current.textContent = `${pad(Math.floor(seconds / 60))}:${seconds.toFixed(2).padStart(5, "0")}`;
      }
      if (speedRef.current)
        speedRef.current.textContent = `${(Math.min(frame.speed, 1) * 0.997).toFixed(3)} c`;
      if (distRef.current) {
        const al = Math.round(
          INTRO_DISTANCE_AL * Math.pow(1 - frame.progress, 1.6),
        );
        distRef.current.textContent = `${al.toLocaleString("fr-FR")} al`;
      }
    };

    import("./cosmos")
      .then(({ createCosmos }) =>
        createCosmos(canvas, {
          kinds: systems.map((system) => system.body),
          mobile: isMobile(),
          reducedMotion: reduced.current,
          onLost: () => {
            cosmos?.dispose();
            cosmos = null;
            cosmosRef.current = null;
            fallback(new Error("contexte WebGL perdu"));
          },
        }),
      )
      .then((created) => {
        if (disposed) {
          created.dispose();
          return;
        }
        window.clearTimeout(wait);
        cosmos = created;
        cosmosRef.current = created;
        created.setPaused(!noSheetRef.current);
        /* Intro déjà passée (« Passer » ou attente trop longue) : le ciel arrive
           directement là où la carte est déjà défilée. */
        if (skipped.current) {
          created.setProgress(progress.current, true);
          return;
        }
        setPhase("intro");
        let started = 0;
        created
          .intro({
            short: seen,
            onFrame: (frame) => {
              const now = performance.now();
              if (!started) started = now;
              writeTelemetry(frame, now - started);
            },
            onFlare: () => setRevealed(true),
          })
          .then(finish);
      })
      .catch(fallback);

    return () => {
      disposed = true;
      window.clearTimeout(wait);
      html.classList.remove("et-locked");
      history.scrollRestoration = restoration;
      cosmos?.dispose();
      cosmosRef.current = null;
      canvas.remove();
    };
  }, [systems]);

  const skipIntro = useCallback(() => {
    if (cosmosRef.current) {
      cosmosRef.current.skipIntro();
      return;
    }
    skipped.current = true;
    finishRef.current?.();
  }, []);

  /* ---------- Trou noir ---------- */
  const hasItems = cart.count > 0;
  const countRef = useRef(cart.count);
  const liveRef = useRef(false);
  const holeStarted = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      holeApi.current?.dispose();
      holeApi.current = null;
    };
  }, []);
  /* Préparé au repos après la révélation (ou au premier article) : prêt à
     naître avant que la première bouteille n'arrive. */
  const [holeIdle, setHoleIdle] = useState(false);
  useEffect(() => {
    if (phase !== "ready" || holeIdle) return;
    const timer = window.setTimeout(() => setHoleIdle(true), HOLE_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, holeIdle]);
  const holeWanted = phase === "ready" && (holeIdle || hasItems);
  useEffect(() => {
    const canvas = holeCanvasRef.current;
    if (!canvas || !holeWanted || holeStarted.current) return;
    holeStarted.current = true;
    const lost = (error?: unknown) => {
      if (error) console.error("L'Étoile : trou noir indisponible", error);
      holeApi.current?.dispose();
      holeApi.current = null;
      setHoleReady(false);
    };
    /* Sans trou noir (pas de WebGL2, shader refusé), la pastille de la barre réapparaît. */
    import("./black-hole")
      .then(({ createBlackHole }) => {
        if (!mounted.current) return;
        const hole = createBlackHole(canvas, {
          reducedMotion: reduced.current,
          mobile: isMobile(),
          onLost: () => lost(new Error("contexte WebGL perdu")),
        });
        if (!hole) return;
        holeApi.current = hole;
        hole.setCount(countRef.current);
        hole.setPaused(!liveRef.current);
        setHoleReady(true);
      })
      .catch(lost);
  }, [holeWanted]);

  useEffect(() => {
    countRef.current = cart.count;
    holeApi.current?.setCount(cart.count);
  }, [cart.count]);

  /* Feuille ouverte ou panier vide : les rendus s'arrêtent. */
  useEffect(() => {
    noSheetRef.current = noSheet;
    liveRef.current = noSheet && hasItems;
    cosmosRef.current?.setPaused(!noSheet);
    holeApi.current?.setPaused(!liveRef.current);
  }, [noSheet, hasItems, phase]);

  /* Le trou noir se pose sur le compteur de la barre, ancré comme elle au bas de l'écran. */
  useEffect(() => {
    if (!hasItems) return;
    let raf = 0;
    let tries = 0;
    const place = () => {
      const badge = document.querySelector<HTMLElement>(".cart-bar-count");
      const hole = holeRef.current;
      if (!badge || !hole) {
        /* La barre se monte au même rendu : on la guette quelques images. */
        if (tries++ < 30) raf = requestAnimationFrame(place);
        return;
      }
      const rect = badge.getBoundingClientRect();
      const fromBottom = window.innerHeight - (rect.top + rect.height / 2);
      hole.style.transform = `translate3d(${rect.left + rect.width / 2}px, ${-fromBottom}px, 0)`;
    };
    raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
    };
  }, [hasItems]);

  /* Impact : le trou noir s'illumine, une onde s'échappe, la barre tressaille. */
  const impact = useCallback(() => {
    holeApi.current?.pulse();
    const hole = holeRef.current;
    if (!hole || reduced.current) return;
    hole.querySelector(".et-hole-ring")?.animate(
      [
        { transform: "scale(0.35)", opacity: 0.9 },
        { transform: "scale(1.5)", opacity: 0 },
      ],
      { duration: 480, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" },
    );
    hole.animate(
      [
        { translate: "0 0" },
        { translate: "2px -1px" },
        { translate: "-2px 1px" },
        { translate: "0 0" },
      ],
      {
        duration: 220,
      },
    );
    hole
      .querySelector("canvas")
      ?.animate(
        [
          { scale: "1" },
          { scale: String(HOLE_SWELL), offset: 0.3 },
          { scale: "1" },
        ],
        { duration: 600, easing: "cubic-bezier(0.2, 0.7, 0.1, 1)" },
      );
  }, []);

  /* Un ajout : la bouteille part en spirale dans le trou noir. */
  const previousCount = useRef(cart.count);
  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = cart.count;
    const from = origin.current;
    origin.current = null;
    if (cart.count <= previous || !from) return;
    const hole = holeApi.current;
    const badge = document.querySelector<HTMLElement>(".cart-bar-count");
    const layer = fxRef.current;
    if (!badge || !layer || reduced.current) {
      hole?.pulse();
      return;
    }
    const rect = badge.getBoundingClientRect();
    const frames = spiralFrames(from, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    /* Une tête lumineuse et sa traînée : des échos de plus en plus ténus, en retard. */
    for (let i = PARTICLE_TRAIL; i >= 0; i--) {
      const particle = document.createElement("span");
      particle.className =
        i === 0 ? "et-particle" : "et-particle et-particle-echo";
      particle.style.setProperty("--echo", String(i / PARTICLE_TRAIL));
      layer.appendChild(particle);
      const animation = particle.animate(frames, {
        duration: ETOILE_TIMING.particle,
        delay: i * PARTICLE_ECHO_MS,
        easing: "linear",
        fill: "both",
      });
      animation.onfinish = () => {
        particle.remove();
        if (i === 0) impact();
      };
    }
  }, [cart.count, impact]);

  const add = useCallback(
    (item: MenuItem, button: HTMLElement) => {
      const rect = button.getBoundingClientRect();
      const point = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      /* Le bouton émet une onde au contact, avant même le vol de la bouteille. */
      if (!reduced.current)
        button.animate(
          [
            { boxShadow: "0 0 0 0 rgba(0, 212, 255, 0.7)" },
            { boxShadow: "0 0 0 16px rgba(0, 212, 255, 0)" },
          ],
          { duration: ETOILE_TIMING.ripple, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
        );
      if (item.options?.length) {
        pendingOrigin.current = point;
        setOptionsItem(item);
        return;
      }
      origin.current = point;
      cart.addLine({
        key: cartLineKey(item.id, []),
        itemId: item.id,
        name: lineName(item),
        detail: item.detail,
        unitPrice: item.price,
        optionSummary: [],
        choices: [],
        stock: item.stock,
        noticeHours: item.noticeHours,
      });
      cart.track("panier", { items: [item.id] });
    },
    [cart],
  );

  /* ---------- Scroll → trajet de la caméra ---------- */
  useEffect(() => {
    if (phase !== "ready") return;
    const n = systems.length;
    const measure = () => {
      const navHeight = navRef.current?.offsetHeight ?? 0;
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const pairs: [number, number][] = [[0, 0]];
      const starts = [0];
      systems.forEach((system, i) => {
        const section = document.getElementById(system.id);
        const head = section?.querySelector<HTMLElement>(".et-system-head");
        const top = section
          ? Math.min(
              max,
              section.getBoundingClientRect().top + window.scrollY - navHeight,
            )
          : max;
        starts.push(top);
        pairs.push(
          [top, i + 1],
          [Math.min(max, top + (head?.offsetHeight ?? 0)), i + 1.5],
        );
      });
      pairs.push([max, n + 1]);
      tops.current = starts;
      stops.current = pairs;
    };
    let raf = 0;
    const update = () => {
      raf = 0;
      const s = stops.current;
      const y = window.scrollY;
      let p = s[s.length - 1][1];
      for (let i = 0; i < s.length - 1; i++) {
        const [y0, p0] = s[i];
        const [y1, p1] = s[i + 1];
        if (y < y1) {
          p = y1 > y0 ? p0 + ((p1 - p0) * Math.max(0, y - y0)) / (y1 - y0) : p1;
          break;
        }
      }
      progress.current = p;
      cosmosRef.current?.setProgress(p);
      const current = Math.min(n, Math.floor(p + 0.02));
      setActive((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measure();
    update();
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [phase, systems]);

  /* Saut en hyperespace vers un système (0 = héros). */
  const jump = useCallback(
    (index: number) => {
      const top = tops.current[index] ?? 0;
      const focus = () =>
        index > 0 &&
        document
          .getElementById(`${systems[index - 1].id}-titre`)
          ?.focus({ preventScroll: true });
      cart.track("categorie");
      const cosmos = cosmosRef.current;
      if (!cosmos || reduced.current) {
        window.scrollTo({ top, behavior: scrollBehavior() });
        focus();
        return;
      }
      const root = rootRef.current;
      const token = ++jumpToken.current;
      root?.classList.add("is-warping");
      setWarpLabel(
        index > 0
          ? `Système ${pad(index)} · ${systems[index - 1].name}`
          : "Retour au héros",
      );
      cosmos
        .jump(index, () => {
          window.scrollTo({ top, behavior: "instant" });
          /* Le contenu arrive pendant le freinage, pas après : scène et interface atterrissent ensemble,
             et la lecture du saut s'efface avec l'éclair. */
          if (token !== jumpToken.current) return;
          root?.classList.remove("is-warping");
          setWarpLabel(null);
        })
        .then(() => {
          /* Un saut plus récent a pris la main : c'est lui qui rendra le contenu. */
          if (token !== jumpToken.current) return;
          root?.classList.remove("is-warping");
          focus();
        });
    },
    [cart, systems],
  );

  /* Apparition des lignes, une orbite après l'autre. */
  useEffect(() => {
    if (phase !== "ready") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-in", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    rootRef.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [phase]);

  /* Heure de Toulouse dans la barre de télémétrie. */
  useEffect(() => {
    const format = new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    });
    const tick = () => setClock(format.format(new Date()));
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <div
        ref={rootRef}
        className="et"
        data-phase={phase}
        data-revealed={revealed || undefined}
        data-webgl={webgl || undefined}
      >
        <div ref={canvasHostRef} className="et-canvas-host" aria-hidden />
        <div className="et-veil" aria-hidden />
        <p
          className="et-warp-hud"
          data-on={warpLabel ? "" : undefined}
          aria-hidden
        >
          <span>Saut hyperespace</span>
          <strong>{warpLabel}</strong>
          <i
            className="et-warp-progress"
            style={{ "--jump": `${ETOILE_TIMING.jump}ms` } as CSSProperties}
          />
        </p>

        {phase !== "ready" && (
          <div
            className="et-intro"
            onPointerDown={skipIntro}
            style={
              {
                "--intro": `${short ? ETOILE_TIMING.introShort : ETOILE_TIMING.intro}ms`,
              } as CSSProperties
            }
          >
            <div className="et-intro-top">
              <span>L&apos;Étoile — Toulouse</span>
              <button type="button" className="et-skip" onClick={skipIntro}>
                Passer
              </button>
            </div>
            <div className="et-reticle" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </div>
            <dl className="et-telemetry" aria-hidden>
              <div>
                <dt>T+</dt>
                <dd ref={timeRef}>00:00.00</dd>
              </div>
              <div>
                <dt>Vitesse</dt>
                <dd ref={speedRef}>0.000 c</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd ref={distRef}>
                  {INTRO_DISTANCE_AL.toLocaleString("fr-FR")} al
                </dd>
              </div>
              <div>
                <dt>Cible</dt>
                <dd>{COORDS}</dd>
              </div>
            </dl>
          </div>
        )}

        <header className="et-hero">
          <div className="et-hud">
            <span>{COORDS}</span>
            <span>
              {tableNumber !== null && <>Table {pad(tableNumber)}</>}
              {clock && <> · {clock}</>}
            </span>
          </div>
          <div className="et-hero-center">
            <div className="et-hero-star">
              <span className="et-orbit" aria-hidden />
              <EtoileMark className="et-hero-mark" />
            </div>
            <h1 className="et-wordmark">
              <span className="sr-only">L&apos;Étoile</span>
              {["L’", "É", "T", "O", "I", "L", "E"].map((letter, i) => (
                <span key={i} aria-hidden style={{ "--i": i } as CSSProperties}>
                  {letter}
                </span>
              ))}
            </h1>
            <p className="et-hero-city">Toulouse · Club &amp; Rooftop</p>
            <p className="et-tagline">On fait la fête à l&apos;Étoile</p>
          </div>
          <p className="et-scroll-cue" aria-hidden>
            Défiler
          </p>
          <div className="et-hero-foot">
            <button type="button" className="et-cta" onClick={() => jump(1)}>
              <span>Explorer la carte</span>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <dl className="et-stats">
              <div>
                <dt>Systèmes</dt>
                <dd>{pad(systems.length)}</dd>
              </div>
              <div>
                <dt>Références</dt>
                <dd>{pad(references)}</dd>
              </div>
            </dl>
          </div>
        </header>

        <nav
          ref={navRef}
          className="et-nav"
          aria-label="Catégories"
          style={{ "--systems": systems.length } as CSSProperties}
        >
          <ol>
            {systems.map((system, i) => (
              <li key={system.id}>
                <button
                  type="button"
                  data-kind={system.body}
                  aria-current={active === i + 1 ? "true" : undefined}
                  onClick={() => jump(i + 1)}
                >
                  <span className="et-orb" aria-hidden />
                  <span className="et-orb-name">{system.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="et-main">
          {systems.map((system, i) => (
            <SystemSection
              key={system.id}
              system={system}
              index={i + 1}
              inCart={inCart}
              onAdd={add}
            />
          ))}
        </main>

        <footer className="et-footer">
          <EtoileMark className="et-footer-mark" />
          <p className="et-footer-name">L&apos;Étoile</p>
          <address>
            2 Avenue d&apos;Atlanta
            <br />
            31200 Toulouse
          </address>
          <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}>
            Réservation VIP · {displayPhone(restaurant.phone)}
          </a>
          <ul className="et-socials">
            <li>
              <a
                href="https://www.instagram.com/etoile_toulouse/"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@etoileclub_"
                target="_blank"
                rel="noreferrer"
              >
                TikTok
              </a>
            </li>
          </ul>
          <p className="et-credit">Carte Ominin</p>
        </footer>

        {optionsItem && (
          <OptionsModal
            item={optionsItem}
            onClose={() => setOptionsItem(null)}
            onAdded={() => {
              origin.current = pendingOrigin.current;
            }}
          />
        )}
      </div>
      {/* Hors de .et (contexte d'empilement isolé) : au-dessus de la barre de commande. */}
      <div
        ref={holeRef}
        className="et-hole"
        data-on={hasItems || undefined}
        data-ready={holeReady || undefined}
        aria-hidden
      >
        <canvas ref={holeCanvasRef} />
        <span className="et-hole-ring" />
        <span className="et-hole-count">{hasItems ? cart.count : null}</span>
      </div>
      <div ref={fxRef} className="et-fx" aria-hidden />
      {/* Sous la barre de commande, la carte s'efface dans le noir au lieu d'y être coupée. */}
      <div
        className="et-bottom-fade"
        data-on={hasItems || undefined}
        aria-hidden
      />
    </>
  );
}

function SystemSection({
  system,
  index,
  inCart,
  onAdd,
}: {
  system: SystemView;
  index: number;
  inCart: Map<string, number>;
  onAdd: (item: MenuItem, button: HTMLElement) => void;
}) {
  const prices = system.items.map((item) => item.price);
  const nested = system.groups.length > 1;
  return (
    <section
      id={system.id}
      className="et-system"
      data-body={system.body}
      aria-labelledby={`${system.id}-titre`}
    >
      <div className="et-system-head" data-reveal>
        <p className="et-eyebrow">
          <span>Système {pad(index)}</span>
          <span>{pad(system.items.length)} réf.</span>
        </p>
        <h2 id={`${system.id}-titre`} className="et-system-title" tabIndex={-1}>
          {system.name}
        </h2>
        <p className="et-range">
          <span>De</span> {formatPrice(Math.min(...prices))} <span>à</span>{" "}
          {formatPrice(Math.max(...prices))}
        </p>
        {nested && (
          <ul className="et-subnav">
            {system.groups.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    document
                      .getElementById(group.id)
                      ?.scrollIntoView({ behavior: scrollBehavior() });
                  }}
                >
                  {group.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="et-list">
        {system.groups.map((group) => (
          <div key={group.id} id={group.id} className="et-group">
            {nested && (
              <h3 className="et-group-title" data-reveal>
                <span>{group.name}</span>
                <span aria-hidden>{pad(group.items.length)}</span>
              </h3>
            )}
            <ul className="et-items">
              {group.items.map((item, k) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  index={k}
                  quantity={inCart.get(item.id) ?? 0}
                  onAdd={onAdd}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ItemRow({
  item,
  index,
  quantity,
  onAdd,
}: {
  item: MenuItem;
  index: number;
  quantity: number;
  onAdd: (item: MenuItem, button: HTMLElement) => void;
}) {
  return (
    <li
      className="et-item"
      data-reveal
      style={
        {
          "--delay": `${Math.round(Math.sqrt(index) * REVEAL_STAGGER_MS)}ms`,
        } as CSSProperties
      }
    >
      <div className="et-item-text">
        <span className="et-item-name">{item.name}</span>
        <span className="et-item-meta">{item.tarifs ?? item.detail}</span>
      </div>
      {!item.tarifs && (
        <span className="et-item-price">{formatPrice(item.price)}</span>
      )}
      <button
        type="button"
        className="et-add"
        data-quantity={quantity || undefined}
        aria-label={`Ajouter ${lineName(item)}${quantity ? `, ${quantity} déjà au panier` : ""}`}
        onClick={(event) => onAdd(item, event.currentTarget)}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        {quantity > 0 && (
          <span className="et-add-quantity" aria-hidden>
            {quantity}
          </span>
        )}
      </button>
    </li>
  );
}
