"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PLAN_CAMERA as CAM } from "@/components/club/timing";
import { prefersReducedMotion } from "@/lib/club/media";

/*
 * La caméra d'un plan de salle, partagée par la page du club et l'espace de
 * gestion. Le dessin (le calque `content`, à la largeur du cadre
 * `viewport`) se déplace et s'agrandit par une transformation CSS, jamais
 * par sa mise en page.
 *
 * Au repos, la caméra cadre `fit` (fractions du calque : la salle utile,
 * sans le vide autour) dans le cadre. Glisser déplace (zoomé), pincer ou
 * Ctrl/⌘ + molette agrandit autour du point visé, double toucher zoome
 * (doubleTapZoom) ; relâché, le plan glisse, ralentit, et revient en ressort
 * s'il a dépassé ses bords. Au repos, un glissement vertical reste le
 * défilement de la page (touch-action pan-y) — sauf à deux doigts, qui
 * pincent ; un glissement horizontal est rendu par onSwipe. Le focus
 * clavier d'un élément hors cadre l'y ramène.
 *
 * Un toucher sans glissement est rendu tout de suite par onTap (point écran,
 * cadre), qui dit s'il a touché quelque chose ; avec doubleTapZoom, deux
 * touchers rapprochés dans le vide (onTap rend false) zooment. Les clics de pointeur sont absorbés ; ceux du
 * clavier et des lecteurs d'écran passent. Mouvement réduit : ni élan, ni
 * ressort, ni débordement.
 */

export type PlanCamera = { x: number; y: number; s: number };
/** Un rectangle en fractions du calque (0 à 1). */
export type FitRect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/* Écart d'échelle sous lequel deux caméras sont confondues. */
const EPSILON = 0.001;

export function usePlanCamera({
  resetKey,
  fit = null,
  fitHeight = false,
  maxZoom = CAM.max,
  doubleTapZoom = true,
  onTap,
  onSwipe,
  onChange,
}: {
  /** Change (la zone) ⇒ retour instantané au cadrage de repos. */
  resetKey: string;
  fit?: FitRect | null;
  /**
   * Le cadre prend la hauteur de `fit` à pleine largeur, bornée par sa
   * feuille de style (min-height, max-height) ; une transition de hauteur
   * la fait glisser d'un cadrage à l'autre.
   */
  fitHeight?: boolean;
  /** Agrandissement maximal, relatif au cadrage de repos. */
  maxZoom?: number;
  doubleTapZoom?: boolean;
  /** Un toucher : le point (écran) et le cadre à cet instant ; true s'il a touché un élément (pas de double toucher). */
  onTap?: (point: Point, frame: DOMRect) => boolean | void;
  onSwipe?: (direction: 1 | -1) => void;
  /** Après chaque image où la caméra a bougé. */
  onChange?: (camera: PlanCamera) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const cam = useRef<PlanCamera>({ x: 0, y: 0, s: 1 });
  const handlers = useRef({ onTap, onSwipe, onChange });
  useEffect(() => {
    handlers.current = { onTap, onSwipe, onChange };
  }, [onTap, onSwipe, onChange]);
  const fitKey = fit ? `${fit.x}:${fit.y}:${fit.w}:${fit.h}` : "";
  const fitRef = useRef(fit);
  // Avant tout autre effet : le cadrage et la hauteur lisent le `fit` de ce rendu.
  useLayoutEffect(() => {
    fitRef.current = fit;
  }, [fit]);
  const api = useRef<{ recenter: () => void; zoomBy: (factor: number) => void } | null>(null);

  useLayoutEffect(() => {
    const frame = viewport.current;
    const layer = content.current;
    if (!fitHeight || !frame || !layer) return;
    const size = () => {
      const f = fitRef.current ?? { x: 0, y: 0, w: 1, h: 1 };
      frame.style.height = `${(f.h * layer.offsetHeight) / f.w}px`;
    };
    size();
    // La largeur du calque suit celle du cadre : sa hauteur dit la nouvelle proportion.
    const observer = new ResizeObserver(size);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [fitHeight, fitKey]);

  useEffect(() => {
    const frame = viewport.current;
    const layer = content.current;
    if (!frame || !layer) return;
    const reduced = prefersReducedMotion();
    const c = cam.current;

    /* ---------- Cadrage ---------- */
    const focusRect = () => {
      const w = layer.offsetWidth;
      const h = layer.offsetHeight;
      const f = fitRef.current ?? { x: 0, y: 0, w: 1, h: 1 };
      return { x: f.x * w, y: f.y * h, w: f.w * w, h: f.h * h };
    };
    const home = (): PlanCamera => {
      const r = focusRect();
      const vw = frame.clientWidth;
      const vh = frame.clientHeight;
      const s = Math.min(vw / r.w, vh / r.h);
      return { s, x: vw / 2 - (r.x + r.w / 2) * s, y: vh / 2 - (r.y + r.h / 2) * s };
    };
    let rest = home();
    const range = () => ({ min: rest.s, max: rest.s * maxZoom });
    /* Bornes d'une caméra d'échelle s : la salle utile reste à l'écran, centrée si elle y tient. */
    const limits = (s: number) => {
      const r = focusRect();
      const axis = (start: number, size: number, view: number) => {
        if (size * s <= view) {
          const centred = view / 2 - (start + size / 2) * s;
          return { min: centred, max: centred };
        }
        return { min: view - (start + size) * s, max: -start * s };
      };
      return { x: axis(r.x, r.w, frame.clientWidth), y: axis(r.y, r.h, frame.clientHeight) };
    };
    const soft = (value: number, { min, max }: { min: number; max: number }) => {
      if (value > max) return reduced ? max : max + (value - max) * CAM.rubber;
      if (value < min) return reduced ? min : min + (value - min) * CAM.rubber;
      return value;
    };
    const inBounds = (next: PlanCamera): PlanCamera => {
      const { min, max } = range();
      const s = clamp(next.s, min, max);
      const { x, y } = limits(s);
      return { s, x: clamp(next.x, x.min, x.max), y: clamp(next.y, y.min, y.max) };
    };

    /* ---------- Rendu ---------- */
    let raf = 0;
    let motion: "idle" | "drag" | "pinch" | "glide" | "spring" = "idle";
    let target: PlanCamera = { ...rest };
    const velocity = { x: 0, y: 0, s: 0 };
    let last = 0;
    let wasZoomed: boolean | null = null;

    const paint = () => {
      layer.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.s})`;
      handlers.current.onChange?.({ ...c });
      const isZoomed = c.s > rest.s * (1 + EPSILON);
      if (isZoomed === wasZoomed) return;
      wasZoomed = isZoomed;
      frame.style.touchAction = isZoomed ? "none" : "pan-y";
      frame.toggleAttribute("data-zoomed", isZoomed);
      setZoomed(isZoomed);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      motion = "idle";
    };
    const zeroVelocity = () => {
      velocity.x = velocity.y = velocity.s = 0;
    };
    /* Vers une caméra, en ressort ; carry : l'élan d'un glissement s'y prolonge. */
    const settle = (to: PlanCamera, carry = false) => {
      target = inBounds(to);
      if (!carry) zeroVelocity();
      if (reduced) {
        Object.assign(c, target);
        motion = "idle";
        paint();
        return;
      }
      motion = "spring";
      last = 0;
      kick();
    };
    function zoomAt(point: Point, scale: number, from: PlanCamera = c) {
      const { min, max } = range();
      const s = clamp(scale, min, max);
      const ratio = s / from.s;
      settle({ s, x: point.x - (point.x - from.x) * ratio, y: point.y - (point.y - from.y) * ratio });
    }

    /* ---------- Gestes ---------- */
    const pointers = new Map<number, Point>();
    let start: { cam: PlanCamera; point: Point } | null = null;
    let pinch: { cam: PlanCamera; distance: number; mid: Point } | null = null;
    let moved = false;
    let lastTap: { point: Point; time: number } | null = null;
    // Un toucher qui a arrêté un ressort ou un élan : la caméra doit se reposer ensuite.
    let interrupted = false;
    /* Les dernières positions du doigt : la vitesse se lit sur sampleMs, pas sur un seul évènement. */
    let samples: { x: number; y: number; t: number }[] = [];

    const local = (event: { clientX: number; clientY: number }): Point => {
      const box = frame.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const twoFingers = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };
    const zoomedNow = () => c.s > rest.s * (1 + EPSILON);

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, local(event));
      // Le geste reste au plan même s'il en sort ; un pointeur déjà relâché ne se capture pas.
      try {
        frame.setPointerCapture(event.pointerId);
      } catch {}
      interrupted = motion === "spring" || motion === "glide";
      stop();
      zeroVelocity();
      if (pointers.size === 1) {
        start = { cam: { ...c }, point: local(event) };
        samples = [{ ...local(event), t: event.timeStamp }];
        moved = false;
      } else if (pointers.size === 2) {
        const { distance, mid } = twoFingers();
        pinch = { cam: { ...c }, distance, mid };
        moved = true;
        motion = "pinch";
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const point = local(event);
      pointers.set(event.pointerId, point);
      if (pinch && pointers.size === 2) {
        kick();
        return;
      }
      if (!start) return;
      if (!moved && Math.hypot(point.x - start.point.x, point.y - start.point.y) > CAM.tapSlop) {
        moved = true;
        // Au repos, un glissement vertical appartient à la page.
        if (zoomedNow()) motion = "drag";
      }
      if (motion === "drag") {
        samples.push({ ...point, t: event.timeStamp });
        while (samples.length > 2 && event.timeStamp - samples[0].t > CAM.sampleMs) samples.shift();
        kick();
      }
    };

    const fling = (now: number) => {
      const first = samples[0];
      const latest = samples[samples.length - 1];
      if (!first || !latest || now - latest.t > CAM.sampleMs) return null;
      const dt = Math.max(latest.t - first.t, 1);
      return { x: (latest.x - first.x) / dt, y: (latest.y - first.y) / dt };
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const point = local(event);
      pointers.delete(event.pointerId);
      if (pinch) {
        if (pointers.size < 2) {
          pinch = null;
          start = null;
          settle(c);
        }
        return;
      }
      if (!start) return;
      const dx = point.x - start.point.x;
      const dy = point.y - start.point.y;
      start = null;
      if (!moved) {
        if (interrupted) settle(c);
        const hit = handlers.current.onTap?.({ x: event.clientX, y: event.clientY }, frame.getBoundingClientRect());
        if (hit || !doubleTapZoom || event.pointerType === "mouse") {
          lastTap = null;
          return;
        }
        const now = event.timeStamp;
        const double =
          lastTap &&
          now - lastTap.time < CAM.doubleTapMs &&
          Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < CAM.doubleTapSlop;
        if (double) {
          lastTap = null;
          zoomAt(point, zoomedNow() ? rest.s : rest.s * CAM.doubleZoom);
        } else lastTap = { point, time: now };
        return;
      }
      if (motion === "drag") {
        const speed = fling(event.timeStamp);
        if (!reduced && speed && Math.hypot(speed.x, speed.y) > CAM.minSpeed) {
          velocity.x = speed.x;
          velocity.y = speed.y;
          motion = "glide";
          last = 0;
          kick();
        } else settle(c);
        return;
      }
      if (!zoomedNow() && Math.abs(dx) > CAM.swipe && Math.abs(dx) > Math.abs(dy) * CAM.swipeRatio) {
        handlers.current.onSwipe?.(dx < 0 ? 1 : -1);
      }
    };

    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      pinch = null;
      start = null;
      settle(c);
    };

    const onClick = (event: MouseEvent) => {
      // Les clics de pointeur passent par onTap ; ceux du clavier ou d'un lecteur d'écran (detail 0) restent.
      if (event.detail === 0) return;
      event.stopPropagation();
      event.preventDefault();
    };

    // Deux doigts au repos : c'est un pincement, pas le défilement de la page.
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2) event.preventDefault();
    };

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      // Molette continue : chaque cran part de la cible en cours, le ressort suit.
      const from = motion === "spring" ? target : c;
      zoomAt(local(event), from.s * Math.exp(-event.deltaY * CAM.wheel), from);
    };

    // Un élément focalisé hors du cadre (Tab) y revient, sans défiler le cadre lui-même.
    const onFocusIn = (event: FocusEvent) => {
      const element = event.target as Element;
      if (!layer.contains(element)) return;
      const box = element.getBoundingClientRect();
      const view = frame.getBoundingClientRect();
      const inside =
        box.left >= view.left && box.right <= view.right && box.top >= view.top && box.bottom <= view.bottom;
      if (inside) return;
      settle({
        s: c.s,
        x: c.x + (view.left + view.width / 2 - (box.left + box.width / 2)),
        y: c.y + (view.top + view.height / 2 - (box.top + box.height / 2)),
      });
    };

    /* ---------- Une image ---------- */
    function step(now: number) {
      raf = 0;
      const dt = last ? Math.min(now - last, CAM.maxStep) : CAM.frameMs;
      last = now;
      if (motion === "pinch" && pinch && pointers.size === 2) {
        const { distance, mid } = twoFingers();
        const { min, max } = range();
        const s = clamp((pinch.cam.s * distance) / pinch.distance, min * CAM.pinchSlack[0], max * CAM.pinchSlack[1]);
        const anchor = { x: (pinch.mid.x - pinch.cam.x) / pinch.cam.s, y: (pinch.mid.y - pinch.cam.y) / pinch.cam.s };
        c.s = s;
        c.x = mid.x - anchor.x * s;
        c.y = mid.y - anchor.y * s;
      } else if (motion === "drag" && start && pointers.size === 1) {
        const point = [...pointers.values()][0];
        const { x, y } = limits(c.s);
        c.x = soft(start.cam.x + point.x - start.point.x, x);
        c.y = soft(start.cam.y + point.y - start.point.y, y);
      } else if (motion === "glide") {
        // Vitesse en px/ms, freinée par image de frameMs.
        const decay = CAM.friction ** (dt / CAM.frameMs);
        c.x += velocity.x * dt;
        c.y += velocity.y * dt;
        velocity.x *= decay;
        velocity.y *= decay;
        const { x, y } = limits(c.s);
        const out = c.x > x.max || c.x < x.min || c.y > y.max || c.y < y.min;
        if (out || Math.hypot(velocity.x, velocity.y) < CAM.minSpeed) {
          // Le ressort compte en px/s : l'élan lui est passé converti.
          velocity.x *= 1000;
          velocity.y *= 1000;
          paint();
          settle(c, true);
          return;
        }
        raf = requestAnimationFrame(step);
      } else if (motion === "spring") {
        const t = dt / 1000;
        let resting = true;
        for (const key of ["x", "y", "s"] as const) {
          const force = -CAM.stiffness * (c[key] - target[key]) - CAM.damping * velocity[key];
          velocity[key] += force * t;
          c[key] += velocity[key] * t;
          const tolerance = key === "s" ? EPSILON : CAM.restPx;
          if (Math.abs(c[key] - target[key]) > tolerance || Math.abs(velocity[key]) > tolerance) resting = false;
        }
        if (resting) {
          Object.assign(c, target);
          zeroVelocity();
          motion = "idle";
        } else raf = requestAnimationFrame(step);
      }
      paint();
    }

    // Le cadrage de repos, à l'arrivée (zone changée) et à chaque nouveau gabarit du cadre.
    const reframe = () => {
      const atRest = wasZoomed !== true;
      rest = home();
      Object.assign(c, atRest ? rest : inBounds(c));
      paint();
    };
    reframe();
    const resize = new ResizeObserver(() => {
      if (motion === "idle") reframe();
    });
    resize.observe(frame);

    api.current = {
      recenter: () => settle(rest),
      zoomBy: (factor) => {
        const from = motion === "spring" ? target : c;
        zoomAt({ x: frame.clientWidth / 2, y: frame.clientHeight / 2 }, from.s * factor, from);
      },
    };

    frame.addEventListener("pointerdown", onDown);
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerup", onUp);
    frame.addEventListener("pointercancel", onCancel);
    frame.addEventListener("click", onClick, true);
    frame.addEventListener("touchstart", onTouchStart, { passive: false });
    frame.addEventListener("wheel", onWheel, { passive: false });
    frame.addEventListener("focusin", onFocusIn);
    return () => {
      cancelAnimationFrame(raf);
      resize.disconnect();
      api.current = null;
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onCancel);
      frame.removeEventListener("click", onClick, true);
      frame.removeEventListener("touchstart", onTouchStart);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("focusin", onFocusIn);
    };
  }, [resetKey, fitKey, maxZoom, doubleTapZoom]);

  const recenter = useCallback(() => api.current?.recenter(), []);
  const zoomBy = useCallback((factor: number) => api.current?.zoomBy(factor), []);
  /** La caméra du moment (calque en px du cadre) : pour projeter un point du plan à l'écran. */
  const camera = useCallback((): PlanCamera => ({ ...cam.current }), []);
  return { viewport, content, zoomed, recenter, zoomBy, camera };
}
