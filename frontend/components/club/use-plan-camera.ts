"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PLAN_CAMERA as CAM } from "@/components/club/timing";

/*
 * La caméra du plan : le dessin (le <svg>, à la largeur du cadre) se
 * déplace et s'agrandit par une transformation CSS, jamais par sa mise en
 * page. Glisser déplace (zoomé), pincer ou Ctrl/⌘ + molette agrandit autour
 * du point visé, double toucher zoome sur la table ; relâché, le plan glisse
 * et ralentit, et revient en ressort s'il a dépassé ses bords. À l'échelle 1,
 * un glissement vertical reste le défilement de la page (touch-action
 * pan-y) ; un glissement horizontal change de zone (onSwipe). Les gestes
 * sont lus au fil des évènements, appliqués une fois par image.
 *
 * Un toucher sans glissement est rendu par onTap (le plan choisit la table
 * la plus proche du doigt) ; les clics de pointeur qui suivent sont
 * absorbés. Mouvement réduit : ni élan, ni ressort, ni débordement.
 */

type Cam = { x: number; y: number; s: number };
type Point = { x: number; y: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function usePlanCamera({
  resetKey,
  onTap,
  onSwipe,
}: {
  /** Change (la zone) ⇒ retour instantané à la vue entière. */
  resetKey: string;
  onTap: (point: Point) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  /* Le cadre (gestes) et le calque transformé (le plan). */
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const cam = useRef<Cam>({ x: 0, y: 0, s: 1 });
  const handlers = useRef({ onTap, onSwipe });
  useEffect(() => {
    handlers.current = { onTap, onSwipe };
  }, [onTap, onSwipe]);
  const api = useRef<{
    recenter: () => void;
    zoomBy: (factor: number) => void;
  } | null>(null);

  useEffect(() => {
    const frame = viewport.current;
    const layer = content.current;
    if (!frame || !layer) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = cam.current;
    c.x = 0;
    c.y = 0;
    c.s = 1;

    let raf = 0;
    let motion: "idle" | "drag" | "pinch" | "glide" | "spring" = "idle";
    let target: Cam = { x: 0, y: 0, s: 1 };
    const velocity = { x: 0, y: 0, s: 0 };
    let last = 0;

    const bounds = (s: number) => {
      const w = frame.clientWidth;
      const h = layer.offsetHeight;
      return { minX: w - w * s, minY: h - h * s };
    };
    const soft = (value: number, min: number) => {
      if (value > 0) return reduced ? 0 : value * CAM.rubber;
      if (value < min) return reduced ? min : min + (value - min) * CAM.rubber;
      return value;
    };
    const inBounds = (cam: Cam): Cam => {
      const s = clamp(cam.s, CAM.min, CAM.max);
      const { minX, minY } = bounds(s);
      return { s, x: clamp(cam.x, minX, 0), y: clamp(cam.y, minY, 0) };
    };

    let wasZoomed = false;
    const paint = () => {
      layer.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.s})`;
      const isZoomed = c.s > CAM.min + 0.001;
      if (isZoomed === wasZoomed) return;
      wasZoomed = isZoomed;
      frame.style.touchAction = isZoomed ? "none" : "pan-y";
      frame.toggleAttribute("data-zoomed", isZoomed);
      setZoomed(isZoomed);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const settle = (to: Cam) => {
      target = inBounds(to);
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

    /* ---------- Gestes ---------- */
    const pointers = new Map<number, Point>();
    let start: { cam: Cam; point: Point; time: number } | null = null;
    let pinch: { cam: Cam; distance: number; mid: Point } | null = null;
    let moved = false;
    let lastTap: { point: Point; time: number } | null = null;
    let sample: { point: Point; time: number } | null = null;

    const local = (event: { clientX: number; clientY: number }): Point => {
      const box = frame.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const twoFingers = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, local(event));
      // Le geste reste au plan même s'il en sort ; un pointeur déjà relâché ne se capture pas.
      try {
        frame.setPointerCapture(event.pointerId);
      } catch {}
      motion = "idle";
      cancelAnimationFrame(raf);
      raf = 0;
      if (pointers.size === 1) {
        start = { cam: { ...c }, point: local(event), time: event.timeStamp };
        sample = { point: local(event), time: event.timeStamp };
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
      const dx = point.x - start.point.x;
      const dy = point.y - start.point.y;
      if (!moved && Math.hypot(dx, dy) > CAM.tapSlop) {
        moved = true;
        // À l'échelle 1, un glissement vertical appartient à la page.
        if (c.s > CAM.min + 0.001) motion = "drag";
      }
      if (motion === "drag") {
        if (sample) {
          const dt = Math.max(event.timeStamp - sample.time, 1);
          velocity.x = (point.x - sample.point.x) / dt;
          velocity.y = (point.y - sample.point.y) / dt;
        }
        sample = { point, time: event.timeStamp };
        kick();
      }
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
      if (!moved) {
        const now = event.timeStamp;
        const double =
          lastTap && now - lastTap.time < CAM.doubleTapMs && Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < CAM.doubleTapSlop;
        if (double) {
          lastTap = null;
          zoomAt(point, c.s > CAM.min + 0.001 ? CAM.min : CAM.doubleZoom);
        } else {
          lastTap = { point, time: now };
          handlers.current.onTap({ x: event.clientX, y: event.clientY });
        }
      } else if (motion === "drag") {
        const fresh = sample && event.timeStamp - sample.time < 80;
        if (!reduced && fresh && Math.hypot(velocity.x, velocity.y) > CAM.minSpeed) {
          motion = "glide";
          last = 0;
          kick();
        } else settle(c);
      } else if (c.s <= CAM.min + 0.001 && Math.abs(dx) > CAM.swipe && Math.abs(dx) > Math.abs(dy) * 1.5) {
        handlers.current.onSwipe(dx < 0 ? 1 : -1);
      }
      start = null;
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

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomAt(local(event), c.s * Math.exp(-event.deltaY * CAM.wheel), true);
    };

    function zoomAt(point: Point, scale: number, instant = false) {
      const s = clamp(scale, CAM.min, CAM.max);
      const ratio = s / c.s;
      const next = { s, x: point.x - (point.x - c.x) * ratio, y: point.y - (point.y - c.y) * ratio };
      if (instant || reduced) {
        Object.assign(c, inBounds(next));
        paint();
      } else settle(next);
    }

    /* ---------- Une image ---------- */
    function step(now: number) {
      raf = 0;
      const dt = last ? Math.min(now - last, 32) : 16;
      last = now;
      if (motion === "pinch" && pinch && pointers.size === 2) {
        const { distance, mid } = twoFingers();
        const s = clamp((pinch.cam.s * distance) / pinch.distance, CAM.min * 0.85, CAM.max * 1.15);
        const anchor = { x: (pinch.mid.x - pinch.cam.x) / pinch.cam.s, y: (pinch.mid.y - pinch.cam.y) / pinch.cam.s };
        c.s = s;
        c.x = mid.x - anchor.x * s;
        c.y = mid.y - anchor.y * s;
      } else if (motion === "drag" && start && pointers.size === 1) {
        const point = [...pointers.values()][0];
        const { minX, minY } = bounds(c.s);
        c.x = soft(start.cam.x + point.x - start.point.x, minX);
        c.y = soft(start.cam.y + point.y - start.point.y, minY);
      } else if (motion === "glide") {
        const decay = CAM.friction ** (dt / 16);
        c.x += velocity.x * dt;
        c.y += velocity.y * dt;
        velocity.x *= decay;
        velocity.y *= decay;
        const { minX, minY } = bounds(c.s);
        const out = c.x > 0 || c.x < minX || c.y > 0 || c.y < minY;
        if (out || Math.hypot(velocity.x, velocity.y) < CAM.minSpeed) {
          paint();
          settle(c);
          return;
        }
        raf = requestAnimationFrame(step);
      } else if (motion === "spring") {
        const t = dt / 1000;
        let rest = true;
        for (const key of ["x", "y", "s"] as const) {
          const force = -CAM.stiffness * (c[key] - target[key]) - CAM.damping * velocity[key];
          velocity[key] += force * t;
          c[key] += velocity[key] * t;
          const scale = key === "s" ? 0.001 : 0.1;
          if (Math.abs(c[key] - target[key]) > scale || Math.abs(velocity[key]) > scale) rest = false;
        }
        if (rest) {
          Object.assign(c, target);
          velocity.x = velocity.y = velocity.s = 0;
          motion = "idle";
        } else raf = requestAnimationFrame(step);
      }
      paint();
    }

    layer.style.transform = "";
    frame.style.touchAction = "pan-y";
    frame.removeAttribute("data-zoomed");
    api.current = {
      recenter: () => settle({ x: 0, y: 0, s: CAM.min }),
      zoomBy: (factor) => zoomAt({ x: frame.clientWidth / 2, y: layer.offsetHeight / 2 }, c.s * factor),
    };

    frame.addEventListener("pointerdown", onDown);
    frame.addEventListener("pointermove", onMove);
    frame.addEventListener("pointerup", onUp);
    frame.addEventListener("pointercancel", onCancel);
    frame.addEventListener("click", onClick, true);
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      api.current = null;
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onCancel);
      frame.removeEventListener("click", onClick, true);
      frame.removeEventListener("wheel", onWheel);
      layer.style.transform = "";
    };
  }, [resetKey]);

  const recenter = useCallback(() => api.current?.recenter(), []);
  const zoomBy = useCallback((factor: number) => api.current?.zoomBy(factor), []);
  return { viewport, content, zoomed, recenter, zoomBy };
}
