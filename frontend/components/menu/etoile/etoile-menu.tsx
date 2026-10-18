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
  type MenuCategory,
  type MenuItem,
  type Restaurant,
} from "@/lib/menu-data";
import { createBlackHole, type BlackHole } from "./black-hole";
import { EtoileMark } from "./logo";
import { createStage, type Stage } from "./stage";
import { createStars, type Stars } from "./stars";
import { ETOILE_TIMING } from "./timing";
import "./etoile.css";

/*
 * La carte de L'Étoile, club fictif, en argent : une scène vidéo derrière la
 * page (la Voie lactée, puis un astre par chapitre, des sauts en hyperespace
 * de l'un à l'autre, voir stage.ts) sous un ciel d'étoiles vivant (stars.ts),
 * la carte en quatre chapitres, le panier en trou noir. Dessous, tout le parcours de commande reste celui d'Ominin
 * (CartProvider, CartBar, OptionsModal) : seule la mise en scène est propre
 * à l'établissement.
 */

interface ChapterDef {
  id: string;
  name: string;
  categories: string[];
}

/* Les catégories de la carte, en chapitres ; le chapitre k a le repère k de la scène. */
const CHAPTERS: ChapterDef[] = [
  {
    id: "alcools",
    name: "Alcools",
    categories: ["rhums", "tequilas", "whiskys", "vodkas", "gins", "cognacs"],
  },
  { id: "softs", name: "Softs", categories: ["sodas", "eau"] },
  { id: "shooters", name: "Shooters", categories: ["shooters"] },
  { id: "champagnes", name: "Champagnes", categories: ["champagnes"] },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/* Un chapitre devient courant dès que son haut passe cette hauteur d'écran (part de la hauteur) : son astre arrive avec lui. */
const CHAPTER_AT = 0.9;

/* Traînée de la bouteille vers le trou noir : nombre d'échos, retard entre deux. */
const PARTICLE_TRAIL = 6;
const PARTICLE_ECHO_MS = 22;
/* Révélation des lignes : décalage en racine de l'index (rapide puis s'étire). */
const REVEAL_STAGGER_MS = 110;
/* Trou noir : préparé au repos après ce délai ; à l'impact, une onde, une secousse, un gonflement. */
const HOLE_IDLE_MS = 2500;
const HOLE_IMPACT = {
  ring: { from: 0.5, to: 2.4, opacity: 0.9, ms: 520, ease: "cubic-bezier(0.16, 1, 0.3, 1)" },
  flash: { brightness: 1.8, ms: 160 },
  shake: { px: 2, ms: 220 },
  swell: { scale: 1.18, at: 0.3, ms: 600 },
  bar: { scale: 1.035, ms: 260 },
  ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
/* La carte reste retirée un instant après l'éclat du saut, le temps qu'il retombe (ms). */
const WARP_HOLD = 120;
/* L'onde du bouton « + » au contact : couleur, portée (px), courbe. */
const RIPPLE = { color: "232, 234, 238", spread: 16, alpha: 0.6, ease: "cubic-bezier(0.2, 0.7, 0.2, 1)" } as const;
/* Une ligne apparaît un peu avant d'entrer dans l'écran : jamais de bande vide au bas d'un chapitre. */
const REVEAL_MARGIN = "0px 0px 10% 0px";
/* La barre de commande se monte avec le premier article : le trou noir la guette tant d'images. */
const PLACE_TRIES = 30;


const pad = (n: number) => String(n).padStart(2, "0");

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

interface Chapter extends ChapterDef {
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
  const stageRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLCanvasElement>(null);
  const topRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const holeVideoRef = useRef<HTMLVideoElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const stars = useRef<Stars | null>(null);
  const holeApi = useRef<BlackHole | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const pendingOrigin = useRef<{ x: number; y: number } | null>(null);
  const reduced = useRef(false);
  const jumping = useRef(false);
  /* Le dernier saut en cours : seul lui rend la carte. */
  const warps = useRef(0);
  /* Minuteries de la mise en scène, coupées au démontage. */
  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  const [holeReady, setHoleReady] = useState(false);
  /* Le compte du trou noir : il change quand la bouteille y tombe, pas avant. */
  const [holeCount, setHoleCount] = useState(0);

  const chapters = useMemo<Chapter[]>(() => {
    const byId = new Map(
      restaurant.categories.map((category) => [category.id, category]),
    );
    return CHAPTERS.map((chapter) => {
      const groups = chapter.categories.flatMap((id) => byId.get(id) ?? []);
      return {
        ...chapter,
        groups,
        items: groups.flatMap((group) => group.items),
      };
    }).filter((chapter) => chapter.items.length > 0);
  }, [restaurant]);

  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of cart.lines)
      counts.set(line.itemId, (counts.get(line.itemId) ?? 0) + line.quantity);
    return counts;
  }, [cart.lines]);

  /* ---------- Scène ---------- */
  useEffect(() => {
    const host = stageRef.current;
    const canvas = starsRef.current;
    if (!host || !canvas) return;
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sky = createStars(canvas, { reducedMotion: reduced.current });
    const created = createStage(host, {
      reducedMotion: reduced.current,
      onWarp: (duration, peak, spot) => {
        sky.warp(duration, peak, spot);
        /* Le temps du saut, la carte se retire derrière lui : on voit le voyage, pas une liste. */
        const warp = ++warps.current;
        rootRef.current?.setAttribute("data-warp", "");
        later(() => warp === warps.current && rootRef.current?.removeAttribute("data-warp"), duration * peak + WARP_HOLD);
      },
    });
    stage.current = created;
    stars.current = sky;
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
      created.dispose();
      sky.dispose();
      stage.current = null;
      stars.current = null;
    };
  }, [later]);

  /* ---------- Défilement : chapitre courant, scène ---------- */
  useEffect(() => {
    let raf = 0;
    /* Les hauts des chapitres, mesurés à chaque changement de mise en page, pas à chaque image. */
    let tops: number[] = [];
    const measure = () => {
      tops = chapters.map((chapter) => {
        const section = document.getElementById(chapter.id);
        return section ? section.getBoundingClientRect().top + window.scrollY : Infinity;
      });
    };
    const update = () => {
      raf = 0;
      const line = window.scrollY + window.innerHeight * CHAPTER_AT;
      const current = tops.filter((top) => top <= line).length;
      setActive(current);
      /* Pendant un saut de la navigation, la scène suit le saut, pas le défilement. */
      if (!jumping.current) stage.current?.goTo(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    observer.observe(document.body);
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [chapters]);

  /* Le filet du chapitre courant glisse sous son nom ; à l'accueil, il s'efface. */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const place = () => {
      const line = nav.querySelector<HTMLElement>(".et-top-line");
      const button = active ? nav.querySelectorAll<HTMLElement>("ol button")[active - 1] : null;
      if (!line) return;
      line.style.opacity = button ? "1" : "0";
      if (!button) return;
      line.style.setProperty("--x", `${button.offsetLeft}px`);
      line.style.setProperty("--w", `${button.offsetWidth}px`);
    };
    /* Les largeurs bougent aussi quand la police arrive : le filet suit. */
    const observer = new ResizeObserver(place);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [active]);

  /* Saut vers un chapitre (0 = accueil) : le contenu s'efface, la scène saute, la page se pose au pic. */
  const jump = useCallback(
    (index: number) => {
      const target = index
        ? document.getElementById(chapters[index - 1].id)
        : null;
      const top = target
        ? target.getBoundingClientRect().top + window.scrollY - (topRef.current?.offsetHeight ?? 0)
        : 0;
      const focus = () =>
        index > 0 &&
        document
          .getElementById(`${chapters[index - 1].id}-titre`)
          ?.focus({ preventScroll: true });
      const root = rootRef.current;
      /* Un saut à la fois : un second toucher pendant le premier est ignoré. */
      if (jumping.current) return;
      cart.track("categorie");
      if (!stage.current || !root || reduced.current) {
        window.scrollTo({ top, behavior: scrollBehavior() });
        focus();
        return;
      }
      jumping.current = true;
      root.setAttribute("data-warping", "");
      /* Le plongeon part pendant que la page s'efface : pas de temps mort entre le toucher et le voyage. */
      later(() => {
        stage.current?.goTo(index, () =>
          /* La page se pose sur une image, au cœur du saut : jamais d'image intermédiaire. */
          requestAnimationFrame(() => {
            window.scrollTo({ top, behavior: "instant" });
            jumping.current = false;
            root.removeAttribute("data-warping");
            focus();
          }),
        );
      }, ETOILE_TIMING.dive);
    },
    [cart, chapters, later],
  );

  /* ---------- Trou noir ---------- */
  const hasItems = cart.count > 0;
  const countRef = useRef(cart.count);
  const liveRef = useRef(false);
  useEffect(
    () => () => {
      holeApi.current?.dispose();
      holeApi.current = null;
    },
    [],
  );
  /* Préparé au repos (ou au premier article) : prêt avant que la première bouteille n'arrive. */
  const [holeIdle, setHoleIdle] = useState(false);
  useEffect(() => {
    if (!ready || holeIdle) return;
    const timer = window.setTimeout(() => setHoleIdle(true), HOLE_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [ready, holeIdle]);
  const holeWanted = ready && (holeIdle || hasItems);
  useEffect(() => {
    const video = holeVideoRef.current;
    if (!video || !holeWanted || holeApi.current) return;
    const hole = createBlackHole(video, { reducedMotion: reduced.current });
    holeApi.current = hole;
    hole.setCount(countRef.current);
    hole.setPaused(!liveRef.current);
    setHoleReady(true);
  }, [holeWanted]);

  useEffect(() => {
    countRef.current = cart.count;
    holeApi.current?.setCount(cart.count);
  }, [cart.count]);

  /* Feuille ouverte ou panier vide : les vidéos s'arrêtent. */
  useEffect(() => {
    liveRef.current = noSheet && hasItems;
    stage.current?.setPaused(!noSheet);
    stars.current?.setPaused(!noSheet);
    /* Les animations CSS du fond se figent aussi. */
    rootRef.current?.toggleAttribute("data-paused", !noSheet);
    holeApi.current?.setPaused(!liveRef.current);
  }, [noSheet, hasItems]);

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
        if (tries++ < PLACE_TRIES) raf = requestAnimationFrame(place);
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

  /* Impact : le trou noir s'emballe, une onde s'échappe, la barre tressaille. */
  const impact = useCallback(() => {
    holeApi.current?.pulse();
    const hole = holeRef.current;
    if (!hole || reduced.current) return;
    const { ring, flash, shake, swell, bar, ease } = HOLE_IMPACT;
    hole.querySelector(".et-hole-ring")?.animate(
      [
        { transform: `scale(${ring.from})`, opacity: ring.opacity },
        { transform: `scale(${ring.to})`, opacity: 0 },
      ],
      { duration: ring.ms, easing: ring.ease },
    );
    hole.animate(
      [
        { translate: "0 0" },
        { translate: `${shake.px}px ${-shake.px / 2}px` },
        { translate: `${-shake.px}px ${shake.px / 2}px` },
        { translate: "0 0" },
      ],
      { duration: shake.ms },
    );
    document.querySelector(".cart-bar")?.animate(
      [{ scale: "1" }, { scale: String(bar.scale) }, { scale: "1" }],
      { duration: bar.ms, easing: ease },
    );
    /* Le disque s'embrase un instant et gonfle, puis se repose. */
    hole.querySelector("video")?.animate(
      [
        { scale: "1", filter: `brightness(${flash.brightness})` },
        { filter: "brightness(1)", offset: flash.ms / swell.ms },
        { scale: String(swell.scale), offset: swell.at },
        { scale: "1", filter: "brightness(1)" },
      ],
      { duration: swell.ms, easing: ease },
    );
  }, []);

  /* Un ajout : la bouteille part en spirale dans le trou noir. */
  const previousCount = useRef(cart.count);
  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = cart.count;
    const from = origin.current;
    origin.current = null;
    const count = cart.count;
    if (count <= previous || !from) {
      setHoleCount(count);
      return;
    }
    const hole = holeApi.current;
    const badge = document.querySelector<HTMLElement>(".cart-bar-count");
    const layer = fxRef.current;
    if (!badge || !layer || reduced.current) {
      setHoleCount(count);
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
        if (i !== 0) return;
        setHoleCount(countRef.current);
        impact();
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
            { boxShadow: `0 0 0 0 rgba(${RIPPLE.color}, ${RIPPLE.alpha})` },
            { boxShadow: `0 0 0 ${RIPPLE.spread}px rgba(${RIPPLE.color}, 0)` },
          ],
          { duration: ETOILE_TIMING.ripple, easing: RIPPLE.ease },
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

  /* Apparition des lignes au fil de la lecture. */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-in", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: REVEAL_MARGIN },
    );
    rootRef.current
      ?.querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapters]);

  return (
    <>
      <div
        ref={rootRef}
        className="et"
        data-ready={ready || undefined}
        data-chapter={active}
      >
        <div ref={stageRef} className="et-stage" aria-hidden />
        <div className="et-haze" aria-hidden />
        <canvas ref={starsRef} className="et-stars" aria-hidden />
        <div className="et-shade" aria-hidden />

        <header ref={topRef} className="et-top">
          <button
            type="button"
            className="et-top-mark"
            onClick={() => jump(0)}
          >
            L’Étoile
          </button>
          <nav ref={navRef} aria-label="Chapitres" className="et-top-nav">
            <span className="et-top-line" aria-hidden />
            <ol>
              {chapters.map((chapter, i) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    aria-current={active === i + 1 ? "location" : undefined}
                    onClick={() => jump(i + 1)}
                  >
                    <span className="et-top-num" aria-hidden>
                      {ROMAN[i]}
                    </span>
                    {chapter.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </header>

        <section className="et-hero" aria-labelledby="et-titre">
          <p className="et-hero-meta">
            <span>Club &amp; Rooftop</span>
            <span>
              {tableNumber !== null && <>Table {pad(tableNumber)}</>}
            </span>
          </p>
          <div className="et-hero-body">
            <EtoileMark className="et-hero-mark" />
            <h1 id="et-titre" className="et-wordmark">
              <span className="sr-only">L&apos;Étoile</span>
              {["L’", "É", "T", "O", "I", "L", "E"].map((letter, i) => (
                <span key={i} aria-hidden style={{ "--i": i } as CSSProperties}>
                  {letter}
                </span>
              ))}
            </h1>
            <p className="et-hero-line">On fait la fête à l&apos;Étoile</p>
            <button type="button" className="et-cta" onClick={() => jump(1)}>
              <span>Découvrir la carte</span>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <ol className="et-index" aria-label="Sommaire">
            {chapters.map((chapter, i) => (
              <li key={chapter.id}>
                <button type="button" onClick={() => jump(i + 1)}>
                  <span className="et-index-num" aria-hidden>
                    {ROMAN[i]}
                  </span>
                  <span className="et-index-name">{chapter.name}</span>
                  <span className="et-index-count">
                    {chapter.items.length} réf.
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <main className="et-main">
          {chapters.map((chapter, i) => (
            <ChapterSection
              key={chapter.id}
              chapter={chapter}
              index={i}
              inCart={inCart}
              onAdd={add}
            />
          ))}
        </main>

        <footer className="et-footer">
          <EtoileMark className="et-footer-mark" />
          <p className="et-footer-name">L&apos;Étoile</p>
          <p>Club &amp; Rooftop</p>
          <p className="et-credit">
            Images NASA, ESA, CSA, STScI, ESO
            <br />
            Carte Ominin
          </p>
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
        <video ref={holeVideoRef} muted loop playsInline disablePictureInPicture />
        <span className="et-hole-ring" />
        <span className="et-hole-count">{hasItems && holeCount ? holeCount : null}</span>
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

function ChapterSection({
  chapter,
  index,
  inCart,
  onAdd,
}: {
  chapter: Chapter;
  index: number;
  inCart: Map<string, number>;
  onAdd: (item: MenuItem, button: HTMLElement) => void;
}) {
  const prices = chapter.items.map((item) => item.price);
  const nested = chapter.groups.length > 1;
  return (
    <section
      id={chapter.id}
      className="et-chapter"
      aria-labelledby={`${chapter.id}-titre`}
    >
      <div className="et-head" data-reveal>
        <p className="et-kicker">
          <span>Chapitre {ROMAN[index]}</span>
          <span>{chapter.items.length} références</span>
        </p>
        <h2
          id={`${chapter.id}-titre`}
          className="et-title"
          tabIndex={-1}
          style={{ "--len": chapter.name.length } as CSSProperties}
        >
          {chapter.name}
        </h2>
        <p className="et-range">
          De {formatPrice(Math.min(...prices))} à{" "}
          {formatPrice(Math.max(...prices))}
        </p>
        {nested && (
          <ul className="et-subnav">
            {chapter.groups.map((group) => (
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
        {chapter.groups.map((group) => (
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
