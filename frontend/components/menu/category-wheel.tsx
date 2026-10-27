"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SectionLink, jumpToSection } from "@/components/menu/section-link";
import { useCart } from "@/lib/menu/cart";
import { prefersReducedMotion } from "@/lib/menu/scroll";
import { CategoryIcon, categoryIcons } from "@/lib/menu/category-icons";
import { type CategoryLink, useActiveSection } from "@/lib/menu/use-active-section";

/*
 * Les catégories en roue (réglage category_layout « wheel »), posée par-dessus
 * la carte, sans place dans la page. Au repos, trois icônes au bord droit, à
 * mi-hauteur : la catégorie en cours dans son anneau, la précédente et la
 * suivante plus petites, en retrait ; elles tournent à mesure qu'on lit la
 * carte. Le doigt posé dessus, la page s'efface sous un voile à ses couleurs
 * et la roue grandit : les icônes s'écartent le long d'un grand arc, les noms
 * en sortent comme des rayons. On la fait tourner, on la lance, elle continue
 * sur son élan, s'arrête sur une catégorie, la carte y va et la roue se
 * replie en trois icônes.
 *
 * Tout le mouvement s'écrit hors de React, une image à la fois, dans les
 * styles des éléments : un rendu par image du doigt saccaderait la roue.
 * La position (pos) se compte en catégories, 2.5 : à mi-chemin de la
 * troisième à la quatrième.
 */

/** Au repos : écart entre deux icônes, marge au bord droit, en pixels. */
const IDLE_PITCH = 36;
const EDGE_GAP = 3;
/** Diamètre d'une pastille d'icône, roue ouverte, à l'échelle 1. */
const DISC = 44;
/** Échelles de la pastille : au repos (en cours, voisines), ouverte (choisie).
 * Au repos, l'anneau tient à droite des boutons d'ajout des plats. */
const IDLE_SCALE = 0.64;
const IDLE_NEIGHBOUR_SCALE = 0.5;
const OPEN_SCALE = 1.2;
/** Roue ouverte : rayon de l'arc, en part de la hauteur d'écran, plafonné. */
const RADIUS_VH = 0.7;
const RADIUS_MAX = 620;
/** Espace entre une pastille et son nom. */
const LABEL_GAP = 14;
/** Distance du centre de la pastille choisie au bord droit, roue ouverte. */
const FOCUS_INSET = 56;
/** Écart entre deux catégories le long de l'arc, en pixels. */
const WHEEL_PITCH = 74;
/** Angle au-delà duquel une catégorie s'est effacée, en radians. */
const FADE_ANGLE = 0.6;
/** Part de l'angle de l'arc que prennent les noms : assez pour se lire en
 * rayons, pas au point de pencher. */
const SPOKE_TILT = 0.6;
/** Les noms attendent que le voile ait couvert la carte : cette part de
 * l'ouverture. */
const LABEL_DELAY = 0.4;
/** Retard d'ouverture par rang d'éloignement, en part de l'ouverture. */
const STAGGER = 0.07;
/** Constante de temps de l'élan après un lancer, en secondes. Un toucher
 * sur un nom, le clavier et le retour d'un bout glissent au ressort de
 * FOLLOW_STIFFNESS : ils partent de l'arrêt. */
const COAST_TAU = 0.3;
/** Fenêtre des derniers mouvements du doigt qui donne la vitesse du lancer. */
const VELOCITY_WINDOW_MS = 90;
/** Doigt immobile depuis plus longtemps au relâché : pas d'élan. */
const STILL_MS = 60;
/** Déplacement sous lequel un appui reste un toucher. */
const TAP_SLOP = 6;
/** Au-delà des bouts, la roue résiste : plus grand, plus ferme. */
const RUBBER = 1.4;
/** Ouverture et repli : ressort, raideur et amortissement. */
const OPEN_STIFFNESS = 320;
const OPEN_DAMPING = 0.8;
const CLOSE_STIFFNESS = 200;
/** Au repos, les icônes suivent la lecture de la carte. */
const FOLLOW_STIFFNESS = 220;
/** La roue arrêtée reste ouverte ce temps sur le choix avant de se replier. */
const CLOSE_DELAY_MS = 200;
/** Battement de l'anneau quand la roue s'arrête sur un choix : durée, ampleur. */
const CONFIRM_MS = 280;
const CONFIRM_SCALE = 1.2;
/** Après un choix, la carte défile vers la section : les icônes ne suivent pas
 * les sections traversées, au plus ce temps. */
const PIN_MS = 1400;
/** Reste sous lequel l'élan est arrivé, en catégories. */
const LANDED = 0.06;
/** Défilement à la molette, roue ouverte : arrêt après ce silence. */
const WHEEL_IDLE_MS = 140;
/** Pendant que la page défile, les icônes au repos s'estompent ; elles
 * reviennent après ce silence. */
const SCROLL_REST_MS = 200;

type Phase = "rest" | "drag" | "coast" | "follow";

interface Geometry {
  cy: number;
  /** Centre de l'arc, hors écran à droite. */
  cx: number;
  radius: number;
  /** Angle entre deux catégories, en radians. */
  step: number;
  idleX: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Au-delà d'un bout, l'excédent s'amortit vers une limite. */
function rubberBand(raw: number, last: number) {
  if (raw < 0) return -(1 - 1 / (-raw * RUBBER + 1)) / RUBBER;
  if (raw > last) return last + (1 - 1 / ((raw - last) * RUBBER + 1)) / RUBBER;
  return raw;
}

/** Un pas de ressort amorti (Euler semi-implicite). */
function spring(x: number, v: number, target: number, stiffness: number, damping: number, dt: number) {
  const next = v + (-stiffness * (x - target) - 2 * damping * Math.sqrt(stiffness) * v) * dt;
  return { x: x + next * dt, v: next };
}

export function CategoryWheel({ categories }: { categories: CategoryLink[] }) {
  const { track } = useCart();
  const { activeId } = useActiveSection(categories, { withProgress: false });
  const activeIndex = Math.max(0, categories.findIndex(({ id }) => id === activeId));
  const icons = useMemo(() => categoryIcons(categories.map(({ name }) => name)), [categories]);
  const count = categories.length;

  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  // La carte à l'écran : la roue n'a rien à montrer sur le héros ni le pied.
  const [visible, setVisible] = useState(false);

  const motion = useRef({
    pos: activeIndex,
    vel: 0,
    openness: 0,
    opennessVel: 0,
    openTarget: 0,
    phase: "rest" as Phase,
    target: 0,
    // Vers la cible au ressort plutôt qu'à l'élan (voir COAST_TAU).
    glide: false,
    // Au bout de l'élan, la carte va à la catégorie (lancer, toucher d'un nom).
    choose: false,
    chosen: false,
    pinned: null as number | null,
    pinnedUntil: 0,
    activeIndex,
    nearest: -1,
    // Lignes cachées à l'image précédente : on n'y écrit plus.
    hidden: [] as boolean[],
    instant: false,
    frame: 0,
    last: 0,
    closeTimer: 0,
    wheelTimer: 0,
    drag: null as null | {
      id: number;
      startY: number;
      startPos: number;
      moved: boolean;
      // Ouverte par cet appui : relâchée sans tourner, elle reste ouverte.
      opened: boolean;
      samples: { t: number; pos: number }[];
    },
  });
  const geometry = useRef<Geometry | null>(null);

  const render = useCallback(() => {
    const g = geometry.current;
    if (!g) return;
    const m = motion.current;
    const o = Math.max(0, m.openness);
    // Le voile mène : il couvre la carte avant que les noms n'en sortent, et
    // la découvre après qu'ils y sont rentrés.
    const veil = 1 - (1 - clamp01(o)) ** 2;

    for (let index = 0; index < count; index++) {
      const row = rowRefs.current[index];
      if (!row) continue;
      const d = index - m.pos;
      const far = Math.abs(d);
      // Les plus proches s'ouvrent les premiers et se replient les derniers.
      const delay = STAGGER * Math.min(far, 3);
      const local = Math.max(0, (o - delay) / (1 - delay));
      const t = clamp01(local);
      const idleY = g.cy + d * IDLE_PITCH;
      const idleScale = lerp(IDLE_SCALE, IDLE_NEIGHBOUR_SCALE, clamp01(far));
      const idleAlpha = far <= 1 ? 1 - 0.4 * far : clamp01((1.6 - far) / 0.6) * 0.6;
      const angle = d * g.step;
      const wheelX = g.cx - g.radius * Math.cos(angle);
      const wheelY = g.cy + g.radius * Math.sin(angle);
      const wheelScale = lerp(OPEN_SCALE, 1, clamp01(far)) - 0.05 * Math.max(0, far - 1);
      const wheelAlpha = 1 - clamp01(Math.abs(angle) / FADE_ANGLE) ** 2;
      const alpha = lerp(idleAlpha, wheelAlpha, t);
      const hidden = alpha < 0.01;
      if (hidden && m.hidden[index]) continue;
      m.hidden[index] = hidden;
      // Les noms suivent l'arc comme des rayons.
      row.style.transform = `translate3d(${lerp(g.idleX, wheelX, local)}px, ${lerp(idleY, wheelY, local)}px, 0) rotate(${-angle * SPOKE_TILT * t}rad) scale(${lerp(idleScale, wheelScale, local)})`;
      row.style.opacity = String(alpha);
      row.style.visibility = hidden ? "hidden" : "";
      const near = clamp01(1 - far);
      const named = clamp01((Math.min(local, veil) - LABEL_DELAY) / (1 - LABEL_DELAY));
      const [disc, label] = row.children as unknown as [HTMLElement, HTMLElement];
      (disc.firstElementChild as HTMLElement).style.opacity = String(near);
      label.style.opacity = String(named * named * (0.7 + 0.3 * near));
      label.style.transform = `translate(${(1 - named) * 18}px, -50%)`;
    }

    const ring = ringRef.current;
    if (ring) {
      const x = lerp(g.idleX, g.cx - g.radius, o);
      ring.style.transform = `translate3d(${x}px, ${g.cy}px, 0) translate(-50%, -50%) scale(${lerp(IDLE_SCALE, OPEN_SCALE, o)})`;
      // Lancée, la roue défile sous un anneau qui s'efface : vide entre deux
      // catégories, il aurait l'air d'un défaut.
      ring.style.opacity = String(1 - 0.6 * clamp01(Math.abs(m.vel) / 6));
    }
    if (veilRef.current) veilRef.current.style.opacity = String(veil);
    if (arcRef.current) arcRef.current.style.opacity = String(veil);

    // Un cran se sent au doigt quand la roue passe une catégorie.
    const nearest = Math.min(count - 1, Math.max(0, Math.round(m.pos)));
    if (nearest !== m.nearest) {
      if (m.nearest !== -1 && m.openTarget === 1 && (m.phase === "drag" || m.phase === "coast")) {
        navigator.vibrate?.(4);
      }
      m.nearest = nearest;
    }
  }, [count]);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const width = root.clientWidth;
    const height = root.clientHeight;
    const radius = Math.min(height * RADIUS_VH, RADIUS_MAX);
    const cx = width - FOCUS_INSET + radius;
    const cy = height / 2;
    // Lignes remesurées : toutes se réécrivent à la prochaine image.
    motion.current.hidden = [];
    geometry.current = {
      cy,
      cx,
      radius,
      step: WHEEL_PITCH / radius,
      idleX: width - EDGE_GAP - (DISC * IDLE_SCALE) / 2,
    };
    const arc = arcRef.current;
    if (arc) {
      arc.setAttribute("cx", String(cx));
      arc.setAttribute("cy", String(cy));
      arc.setAttribute("r", String(radius));
    }
    // Les noms prennent la casse des titres de section (minuscules, capitales
    // selon l'établissement).
    const heading = document.getElementById(categories[0]?.id ?? "")?.querySelector("h2");
    if (heading) root.style.setProperty("--wheel-case", getComputedStyle(heading).textTransform);
    // Un nom tient entre la marge gauche et sa pastille, à l'échelle choisie.
    root.style.setProperty(
      "--wheel-label-max",
      `${(width - FOCUS_INSET - EDGE_GAP) / OPEN_SCALE - DISC / 2 - LABEL_GAP}px`
    );
    render();
  }, [render, categories]);

  const close = useCallback(() => {
    const m = motion.current;
    window.clearTimeout(m.closeTimer);
    window.clearTimeout(m.wheelTimer);
    m.openTarget = 0;
    m.drag = null;
    // Refermée en plein élan (Échap, focus parti) : la carte ne bouge plus, et
    // les icônes repartent de leur élan vers la section lue.
    m.choose = false;
    m.phase = "follow";
    setOpen(false);
  }, []);

  const settled = useCallback(
    (index: number) => {
      const m = motion.current;
      if (!m.choose || m.chosen) return;
      m.chosen = true;
      if (!m.instant) {
        ringRef.current?.firstElementChild?.animate(
          { scale: [1, CONFIRM_SCALE, 1] },
          { duration: CONFIRM_MS, easing: "cubic-bezier(0.3, 0, 0.2, 1)" }
        );
      }
      // Même la section en cours : la carte revient à son titre, comme la
      // barre du haut.
      m.pinned = index;
      m.pinnedUntil = performance.now() + PIN_MS;
      track("categorie");
      // La carte défile jusqu'à la section pendant que le voile se lève.
      jumpToSection(categories[index].id, true);
      m.closeTimer = window.setTimeout(close, CLOSE_DELAY_MS);
    },
    [categories, close, track]
  );

  /** Avance d'une image ; renvoie false une fois tout au repos. */
  const tick = useCallback(
    (now: number) => {
      const m = motion.current;
      const dt = Math.min(0.05, Math.max(0, now - m.last) / 1000);
      m.last = now;
      const instant = m.instant;

      if (m.phase === "coast") {
        if (instant) {
          m.pos = m.target;
        } else if (m.glide) {
          ({ x: m.pos, v: m.vel } = spring(m.pos, m.vel, m.target, FOLLOW_STIFFNESS, 1, dt));
        } else {
          const rest = (m.target - m.pos) * Math.exp(-dt / COAST_TAU);
          m.pos = m.target - rest;
          m.vel = rest / COAST_TAU;
        }
        const rest = m.target - m.pos;
        if (Math.abs(rest) < LANDED) settled(m.target);
        if (Math.abs(rest) < 0.001 && Math.abs(m.vel) < 0.01) {
          m.pos = m.target;
          m.vel = 0;
          m.phase = m.openTarget === 1 ? "rest" : "follow";
        }
      } else if (m.phase === "follow") {
        if (m.pinned !== null && (m.pinned === m.activeIndex || now > m.pinnedUntil)) m.pinned = null;
        const goal = m.pinned ?? m.activeIndex;
        if (instant) {
          m.pos = goal;
          m.vel = 0;
        } else {
          ({ x: m.pos, v: m.vel } = spring(m.pos, m.vel, goal, FOLLOW_STIFFNESS, 1, dt));
        }
        if (Math.abs(m.pos - goal) < 0.001 && Math.abs(m.vel) < 0.01 && m.pinned === null) {
          m.pos = goal;
          m.vel = 0;
          m.phase = "rest";
        }
      }

      if (instant) {
        m.openness = m.openTarget;
        m.opennessVel = 0;
      } else {
        const [stiffness, damping] = m.openTarget === 1 ? [OPEN_STIFFNESS, OPEN_DAMPING] : [CLOSE_STIFFNESS, 1];
        ({ x: m.openness, v: m.opennessVel } = spring(m.openness, m.opennessVel, m.openTarget, stiffness, damping, dt));
        if (Math.abs(m.openness - m.openTarget) < 0.001 && Math.abs(m.opennessVel) < 0.01) {
          m.openness = m.openTarget;
          m.opennessVel = 0;
        }
      }

      render();
      // Le doigt qui tire la roue la redessine lui-même (pointermove).
      return m.phase === "coast" || m.phase === "follow" || m.openness !== m.openTarget || m.opennessVel !== 0;
    },
    [render, settled]
  );

  /** Relance l'animation si elle dort ; elle s'arrête d'elle-même au repos. */
  const kick = useCallback(() => {
    const m = motion.current;
    if (m.frame) return;
    m.last = performance.now();
    m.instant = prefersReducedMotion();
    function loop(now: number) {
      m.frame = tick(now) ? requestAnimationFrame(loop) : 0;
    }
    m.frame = requestAnimationFrame(loop);
  }, [tick]);

  const openWheel = useCallback(() => {
    const m = motion.current;
    window.clearTimeout(m.closeTimer);
    m.openTarget = 1;
    m.pinned = null;
    setOpen(true);
    kick();
  }, [kick]);

  /** Mène la roue à une catégorie ; choose : la carte y va à l'arrivée ;
   * glide : au ressort, depuis l'arrêt, plutôt qu'à l'élan. */
  const settleTo = useCallback(
    (index: number, choose: boolean, glide: boolean) => {
      const m = motion.current;
      window.clearTimeout(m.closeTimer);
      m.target = Math.min(count - 1, Math.max(0, index));
      m.glide = glide;
      if (glide) m.vel = 0;
      m.phase = "coast";
      m.choose = choose;
      m.chosen = false;
      kick();
    },
    [count, kick]
  );

  // Les icônes suivent la lecture : elles tournent vers la section en cours.
  useEffect(() => {
    const m = motion.current;
    m.activeIndex = activeIndex;
    if (m.openTarget === 0 && m.phase !== "coast") {
      m.phase = "follow";
      kick();
    }
  }, [activeIndex, kick]);

  // Repliée ou rouverte : l'animation repart, même si plus rien ne tournait.
  useEffect(() => {
    kick();
  }, [open, kick]);

  // Pendant que la page défile, les icônes au repos s'estompent.
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      if (!fadeRef.current?.hasAttribute("data-scrolling")) fadeRef.current?.setAttribute("data-scrolling", "");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fadeRef.current?.removeAttribute("data-scrolling"), SCROLL_REST_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    const m = motion.current;
    return () => {
      cancelAnimationFrame(m.frame);
      m.frame = 0;
      window.clearTimeout(m.closeTimer);
      window.clearTimeout(m.wheelTimer);
    };
  }, []);

  useEffect(() => {
    const sections = categories.flatMap(({ id }) => document.getElementById(id) ?? []);
    const onScreen = new Set<Element>();
    // Une section compte une fois montée dans la moitié haute de l'écran : la
    // roue n'apparaît pas sur le héros, dès que la carte pointe en bas.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScreen.add(entry.target);
          else onScreen.delete(entry.target);
        }
        setVisible(onScreen.size > 0);
      },
      { rootMargin: "0px 0px -50% 0px" }
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [categories]);

  // Roue ouverte : Échap la replie, la molette la fait tourner (écouteur non
  // passif : la page ne défile pas dessous).
  useEffect(() => {
    if (!open) return;
    const m = motion.current;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close();
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      window.clearTimeout(m.wheelTimer);
      window.clearTimeout(m.closeTimer);
      m.phase = "drag";
      m.vel = 0;
      m.pos = rubberBand(m.pos + event.deltaY / WHEEL_PITCH, count - 1);
      render();
      m.wheelTimer = window.setTimeout(() => settleTo(Math.round(m.pos), true, true), WHEEL_IDLE_MS);
    };
    const root = rootRef.current;
    document.addEventListener("keydown", escape);
    root?.addEventListener("wheel", wheel, { passive: false });
    return () => {
      document.removeEventListener("keydown", escape);
      root?.removeEventListener("wheel", wheel);
    };
  }, [open, close, count, render, settleTo]);

  if (count < 2) return null;

  const itemAt = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-wheel-item]");
    return hit ? Number(hit.dataset.wheelItem) : null;
  };

  return (
    <>
      {/* Au clavier et au lecteur d'écran, les liens : la roue, dessinée
          pour le doigt, montre où le focus se trouve. */}
      <nav
        aria-label="Catégories"
        className="sr-only"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
        }}
      >
        <ul>
          {categories.map(({ id, name }, index) => (
            <li key={id}>
              <SectionLink
                sectionId={id}
                aria-current={id === activeId ? "location" : undefined}
                onFocus={() => {
                  openWheel();
                  settleTo(index, false, true);
                }}
                onJump={() => {
                  track("categorie");
                  motion.current.pinned = index;
                  motion.current.pinnedUntil = performance.now() + PIN_MS;
                  close();
                }}
              >
                {name}
              </SectionLink>
            </li>
          ))}
        </ul>
      </nav>
      <div
        ref={rootRef}
        aria-hidden
        data-category-wheel
        className={`fixed inset-0 select-none overflow-hidden [-webkit-touch-callout:none] ${
          open ? "z-[45] touch-none" : "pointer-events-none z-30"
        }`}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          const m = motion.current;
          const wasOpen = m.openTarget === 1;
          window.clearTimeout(m.closeTimer);
          event.currentTarget.setPointerCapture(event.pointerId);
          // La roue s'ouvre sur la catégorie lue, même si les icônes y
          // tournaient encore.
          if (!wasOpen && m.phase === "follow") m.pos = m.pinned ?? m.activeIndex;
          m.drag = {
            id: event.pointerId,
            startY: event.clientY,
            startPos: m.pos,
            moved: false,
            opened: !wasOpen,
            samples: [{ t: event.timeStamp, pos: m.pos }],
          };
          // Attrapée en plein élan, la roue s'arrête sous le doigt.
          m.phase = "drag";
          m.vel = 0;
          m.choose = false;
          if (!wasOpen) {
            navigator.vibrate?.(8);
            openWheel();
          }
        }}
        onPointerMove={(event) => {
          const m = motion.current;
          const drag = m.drag;
          if (!drag || drag.id !== event.pointerId) return;
          const dy = drag.startY - event.clientY;
          if (Math.abs(dy) > TAP_SLOP) drag.moved = true;
          if (!drag.moved) return;
          m.pos = rubberBand(drag.startPos + dy / WHEEL_PITCH, count - 1);
          drag.samples.push({ t: event.timeStamp, pos: m.pos });
          while (drag.samples.length > 2 && event.timeStamp - drag.samples[0].t > VELOCITY_WINDOW_MS) {
            drag.samples.shift();
          }
          render();
        }}
        onPointerUp={(event) => {
          const m = motion.current;
          const drag = m.drag;
          if (!drag || drag.id !== event.pointerId) return;
          m.drag = null;
          if (drag.moved) {
            const first = drag.samples[0];
            const last = drag.samples.at(-1) ?? first;
            const span = (last.t - first.t) / 1000;
            const still = event.timeStamp - last.t > STILL_MS;
            const velocity = span > 0 && !still ? (last.pos - first.pos) / span : 0;
            const projected = Math.round(m.pos + velocity * COAST_TAU);
            // Lâchée au-delà d'un bout, ou lancée plus loin : elle revient au
            // ressort, sans traîner sur la fin de l'élan.
            const beyond = m.pos < 0 || m.pos > count - 1 || projected < 0 || projected > count - 1;
            settleTo(projected, true, beyond);
            return;
          }
          // Un toucher : sur un nom ou une icône, la roue y va ; ailleurs, elle
          // se replie. Le toucher qui vient de l'ouvrir la laisse ouverte.
          const index = itemAt(event.clientX, event.clientY);
          if (drag.opened) settleTo(Math.round(m.pos), false, true);
          else if (index !== null) settleTo(index, true, true);
          else close();
        }}
        onPointerCancel={() => {
          const m = motion.current;
          if (!m.drag) return;
          m.drag = null;
          settleTo(Math.round(m.pos), false, true);
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        {/* Le voile aux couleurs de la page, plus dense du côté de la roue :
            à gauche, la carte se devine encore. */}
        <div
          ref={veilRef}
          className="absolute inset-0 bg-[linear-gradient(to_left,color-mix(in_srgb,var(--background)_86%,transparent),color-mix(in_srgb,var(--background)_72%,transparent)_55%,color-mix(in_srgb,var(--background)_46%,transparent))] opacity-0 backdrop-blur-[14px] backdrop-saturate-125"
        />
        <div
          ref={fadeRef}
          className={`absolute inset-0 transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${
            open ? "" : visible ? "data-[scrolling]:opacity-55" : "translate-x-4 opacity-0"
          }`}
        >
          {/* L'arc sur lequel tournent les pastilles, fondu vers ses bouts. */}
          <svg className="absolute inset-0 size-full [mask-image:linear-gradient(to_bottom,transparent_12%,black_38%,black_62%,transparent_88%)]">
            <circle
              ref={arcRef}
              fill="none"
              strokeWidth="1"
              className="stroke-[color-mix(in_srgb,var(--foreground)_16%,transparent)] opacity-0"
            />
          </svg>
          {/* La zone que le doigt saisit au repos : la colonne des icônes, pas
              plus large, pour laisser aux boutons d'ajout des plats tout leur
              bord droit. */}
          <div
            style={{ width: DISC * IDLE_SCALE + 2 * EDGE_GAP, height: 3 * IDLE_PITCH + DISC }}
            className={`absolute right-0 top-1/2 -translate-y-1/2 ${visible && !open ? "pointer-events-auto touch-none" : ""}`}
          />
          {categories.map(({ id, name }, index) => (
            <div
              key={id}
              ref={(element) => {
                rowRefs.current[index] = element;
              }}
              data-wheel-item={index}
              className="absolute left-0 top-0 will-change-transform"
            >
              <div
                style={{ width: DISC, height: DISC }}
                className="absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--ember-2)_35%,transparent)] bg-[color-mix(in_srgb,var(--background)_72%,transparent)] text-ember-2 shadow-[0_4px_14px_rgb(0_0_0/0.12)] backdrop-blur-md"
              >
                <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ember-2)_18%,transparent)] opacity-0" />
                <CategoryIcon icon={icons[index]} className="relative size-6" />
              </div>
              <div
                style={{ right: DISC / 2 + LABEL_GAP }}
                className="category-wheel-label font-display absolute top-0 line-clamp-2 w-max max-w-[var(--wheel-label-max)] py-[0.12em] text-right text-2xl font-medium leading-[1.1] tracking-tight text-balance text-foreground opacity-0 [text-transform:var(--wheel-case,none)]"
              >
                {name}
              </div>
            </div>
          ))}
          {/* L'anneau fixe : les catégories passent dessous, la roue s'arrête
              sur celle qu'il entoure. */}
          <div
            ref={ringRef}
            style={{ width: DISC + 10, height: DISC + 10 }}
            className="pointer-events-none absolute left-0 top-0"
          >
            <div className="size-full rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--ember-2)_75%,transparent)] shadow-[0_0_24px_color-mix(in_srgb,var(--ember-2)_30%,transparent)]" />
          </div>
        </div>
      </div>
    </>
  );
}
