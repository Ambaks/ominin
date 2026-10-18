"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { FloorPlan, tablesBounds, type TableState } from "@/components/club/floor-plan";
import { CLUB_TIMING, PLAN_CAMERA, PLAN_FIT, PLAN_POINTER } from "@/components/club/timing";
import { usePlanCamera, type FitRect, type PlanCamera } from "@/components/club/use-plan-camera";
import { clubToken, finePointer, prefersReducedMotion } from "@/lib/club/media";
import type { ClubTable, ZoneLayout } from "@/lib/club/types";

/*
 * Le plan d'une zone, à manipuler : la caméra (use-plan-camera) le cadre
 * sur ses tables, le déplace et l'agrandit ; un toucher choisit la table la
 * plus proche du doigt (cible de 2 × tapRadius). L'étoile libre se creuse
 * sous le doigt et s'embrase au choix ; une table prise ou fermée refuse
 * d'un mouvement de tête et le dit — au toucher comme au clavier. Au
 * bureau : la lumière suit le curseur, éclaire les étoiles voisines, et une
 * infobulle dit la table survolée. D'une zone à l'autre, les deux plans se
 * croisent en fondu dans un cadre de hauteur fixe.
 */

export type PlanZone = { id: string; name: string; layout: ZoneLayout; tables: ClubTable[] };
type Point = { x: number; y: number };

/* Pastille des places sur le plan client, et pas des boutons de zoom. */
const SEAT_BADGE = 10;
const ZOOM_STEP = 1.5;
/* Place (px) qu'il faut au-dessus d'une table pour y poser l'infobulle. */
const TOOLTIP_ROOM = 64;

export function PlanView({
  zone,
  direction,
  states,
  selectedId,
  interactive,
  describe,
  tooltip,
  refusal,
  onSelect,
  onSwipe,
}: {
  zone: PlanZone;
  /** Sens du dernier changement de zone (1 : suivante). */
  direction: 1 | -1;
  states: Record<string, TableState>;
  selectedId: string | null;
  interactive: boolean;
  describe: (table: ClubTable, state: TableState) => string;
  /** Les deux lignes de l'infobulle au survol. */
  tooltip: (table: ClubTable) => [string, string];
  /** Ce que dit la bulle quand la table touchée n'est pas libre. */
  refusal: (table: ClubTable, state: TableState) => string;
  onSelect: (table: ClubTable) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(zone);
  const [leaving, setLeaving] = useState<PlanZone | null>(null);
  if (zone.id !== shown.id) {
    setLeaving(shown);
    setShown(zone);
  }
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), CLUB_TIMING.crossfade);
    return () => clearTimeout(timer);
  }, [leaving]);

  const [toast, setToast] = useState<{ id: number; text: string } & Point | null>(null);
  const [hover, setHover] = useState<{ table: ClubTable; below: boolean } & Point | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), CLUB_TIMING.toast);
    return () => clearTimeout(timer);
  }, [toast]);

  /* Le cadrage de repos : les tables, pas le vide autour. */
  const fit = useMemo<FitRect | null>(() => {
    const bounds = tablesBounds(shown.tables, { scale: PLAN_FIT.tableScale, badge: SEAT_BADGE, margin: PLAN_FIT.margin });
    if (!bounds) return null;
    const { w, h } = shown.layout;
    const x = Math.max(bounds.x, 0) / w;
    const y = Math.max(bounds.y, 0) / h;
    return { x, y, w: Math.min(bounds.x + bounds.w, w) / w - x, h: Math.min(bounds.y + bounds.h, h) / h - y };
  }, [shown]);

  /* ---------- Projection des tables à l'écran (sans lire le DOM table par table) ---------- */
  const cameraRef = useRef<() => PlanCamera>(() => ({ x: 0, y: 0, s: 1 }));
  const viewportBox = useRef<DOMRect | null>(null);
  const project = useCallback(
    (table: ClubTable): Point | null => {
      const frame = viewportBox.current;
      if (!frame) return null;
      const { x, y, s } = cameraRef.current();
      const k = frame.width / shown.layout.w;
      return { x: frame.left + x + table.x * k * s, y: frame.top + y + table.y * k * s };
    },
    [shown.layout.w]
  );
  const nearest = useCallback(
    (point: Point, reach: number) => {
      let best: { table: ClubTable; distance: number; at: Point } | null = null;
      for (const table of shown.tables) {
        const at = project(table);
        if (!at) continue;
        const distance = Math.hypot(point.x - at.x, point.y - at.y);
        if (distance <= reach && (!best || distance < best.distance)) best = { table, distance, at };
      }
      return best;
    },
    [shown.tables, project]
  );
  const nodeOf = (id: string) =>
    cardRef.current?.querySelector<SVGGElement>(`.club-plan-current .plan-table[data-id="${id}"]`) ?? null;

  /* ---------- Choisir (toucher, clic, clavier) ---------- */
  const attempt = useCallback(
    (table: ClubTable) => {
      if (!interactive) return;
      const node = nodeOf(table.id);
      const card = cardRef.current;
      const state = states[table.id] ?? "libre";
      const reduced = prefersReducedMotion();
      setHover(null);
      if (state === "libre") {
        navigator.vibrate?.(10);
        onSelect(table);
        if (node && !reduced) {
          node.querySelector(".plan-halo")?.animate(
            [{ transform: "scale(0.4)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }],
            { duration: CLUB_TIMING.ignite, easing: clubToken("--c-spring") }
          );
        }
        return;
      }
      if (node && !reduced) {
        node.animate(
          [{ translate: "0 0" }, { translate: "-4px 0" }, { translate: "4px 0" }, { translate: "-2px 0" }, { translate: "0 0" }],
          { duration: CLUB_TIMING.shake, easing: "ease-in-out" }
        );
      }
      if (!node || !card) return;
      const box = node.getBoundingClientRect();
      const origin = card.getBoundingClientRect();
      setToast({
        id: performance.now(),
        text: refusal(table, state),
        x: box.left + box.width / 2 - origin.left,
        y: box.top - origin.top,
      });
    },
    [interactive, states, onSelect, refusal]
  );

  const onTap = useCallback(
    (point: Point, frame: DOMRect) => {
      viewportBox.current = frame;
      const hit = nearest(point, PLAN_POINTER.tapRadius);
      if (hit) attempt(hit.table);
    },
    [nearest, attempt]
  );

  const { viewport, content, zoomed, recenter, zoomBy, camera } = usePlanCamera({
    resetKey: shown.id,
    fit,
    fitHeight: true,
    onTap,
    onSwipe,
  });
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  /* ---------- Sous le doigt, sous la souris ---------- */
  useEffect(() => {
    const card = cardRef.current;
    const frame = viewport.current;
    if (!card || !frame) return;
    const reduced = prefersReducedMotion();
    let pressed: { node: SVGGElement; from: Point } | null = null;
    const release = () => {
      pressed?.node.removeAttribute("data-pressed");
      pressed = null;
    };
    const onDown = (event: PointerEvent) => {
      release();
      if (!interactive || reduced || !event.isPrimary) return;
      viewportBox.current = frame.getBoundingClientRect();
      const hit = nearest({ x: event.clientX, y: event.clientY }, PLAN_POINTER.tapRadius);
      if (!hit || (states[hit.table.id] ?? "libre") !== "libre") return;
      const node = nodeOf(hit.table.id);
      if (!node) return;
      node.setAttribute("data-pressed", "");
      pressed = { node, from: { x: event.clientX, y: event.clientY } };
    };
    const onPressMove = (event: PointerEvent) => {
      // Un glissement n'est pas un appui : l'étoile se relâche.
      if (pressed && Math.hypot(event.clientX - pressed.from.x, event.clientY - pressed.from.y) > PLAN_CAMERA.tapSlop) release();
      if (!event.isPrimary) release();
    };

    // Bureau : la lumière rejoint le curseur (lerp), les étoiles voisines s'éclairent, l'infobulle attend un instant.
    let raf = 0;
    let target: Point = { x: 0, y: 0 };
    const light: Point = { x: 0, y: 0 };
    let inside = false;
    let hoverTimer = 0;
    let lastHit: string | null = null;
    const frameStep = () => {
      raf = 0;
      // Lectures d'abord…
      const box = card.getBoundingClientRect();
      viewportBox.current = frame.getBoundingClientRect();
      light.x += (target.x - light.x) * PLAN_POINTER.lerp;
      light.y += (target.y - light.y) * PLAN_POINTER.lerp;
      const nodes = card.querySelectorAll<SVGGElement>(".club-plan-current .plan-table");
      const near = [...nodes].map((node) => {
        const table = shown.tables.find((candidate) => candidate.id === node.dataset.id);
        const at = table ? project(table) : null;
        return at && inside ? Math.max(0, 1 - Math.hypot(target.x - at.x, target.y - at.y) / PLAN_POINTER.proximity) : 0;
      });
      // … écritures ensuite.
      card.style.setProperty("--mx", `${light.x - box.left}px`);
      card.style.setProperty("--my", `${light.y - box.top}px`);
      nodes.forEach((node, index) => node.style.setProperty("--near", near[index].toFixed(2)));
      if (Math.hypot(target.x - light.x, target.y - light.y) > 0.5) raf = requestAnimationFrame(frameStep);
    };
    const onHover = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target = { x: event.clientX, y: event.clientY };
      if (!inside) Object.assign(light, target);
      inside = true;
      if (!raf) raf = requestAnimationFrame(frameStep);
      if (event.buttons) return;
      viewportBox.current = frame.getBoundingClientRect();
      const hit = nearest(target, PLAN_POINTER.tapRadius);
      if (hit?.table.id === lastHit) return;
      lastHit = hit?.table.id ?? null;
      clearTimeout(hoverTimer);
      setHover(null);
      if (!hit) return;
      hoverTimer = window.setTimeout(() => {
        const origin = card.getBoundingClientRect();
        const node = nodeOf(hit.table.id);
        if (!node) return;
        const box = node.getBoundingClientRect();
        // Trop près du haut du plan : l'infobulle passe sous la table.
        const below = box.top - origin.top < TOOLTIP_ROOM;
        setHover({
          table: hit.table,
          x: box.left + box.width / 2 - origin.left,
          y: below ? box.bottom - origin.top : box.top - origin.top,
          below,
        });
      }, CLUB_TIMING.hover);
    };
    const onLeave = () => {
      inside = false;
      lastHit = null;
      clearTimeout(hoverTimer);
      setHover(null);
      if (!raf) raf = requestAnimationFrame(frameStep);
    };

    frame.addEventListener("pointerdown", onDown);
    frame.addEventListener("pointermove", onPressMove);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    if (finePointer() && !reduced) {
      card.addEventListener("pointermove", onHover);
      card.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hoverTimer);
      release();
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointermove", onPressMove);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      card.removeEventListener("pointermove", onHover);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive, nearest, project, states, shown.tables, viewport]);

  /* Les animations sans fin (scintillement, pulsation) s'arrêtent hors de l'écran. */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => card.toggleAttribute("data-offscreen", !entry.isIntersecting));
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const plan = (target: PlanZone, keyboard: boolean) => (
    <FloorPlan
      layout={target.layout}
      tables={target.tables}
      states={states}
      selectedId={selectedId}
      onSelect={keyboard && interactive ? attempt : undefined}
      describe={describe}
      label={`Plan : ${target.name}`}
      badge={SEAT_BADGE}
      scale={PLAN_FIT.tableScale}
      className="club-plan"
    />
  );

  return (
    <div
      ref={cardRef}
      className="club-plan-card"
      style={{ "--dir": direction, "--toast-ms": `${CLUB_TIMING.toast}ms` } as CSSProperties}
    >
      <div className="club-plan-tools">
        {zoomed && (
          <button type="button" className="club-chip-button" onClick={recenter}>
            Recentrer
          </button>
        )}
        <div className="club-segmented" role="group" aria-label="Zoom du plan">
          <button type="button" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Réduire le plan" disabled={!zoomed}>
            −
          </button>
          <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Agrandir le plan">
            +
          </button>
        </div>
      </div>
      <div ref={viewport} className="club-plan-viewport">
        <div ref={content} className="club-plan-layer">
          {leaving && (
            <div key={leaving.id} className="club-plan-leaving" aria-hidden inert>
              {plan(leaving, false)}
            </div>
          )}
          <div key={shown.id} className="club-plan-current" data-entering={leaving ? "" : undefined}>
            {plan(shown, true)}
          </div>
        </div>
      </div>

      {hover && (
        <div
          className="club-tooltip"
          role="tooltip"
          data-below={hover.below || undefined}
          style={{ "--x": `${hover.x}px`, "--y": `${hover.y}px` } as CSSProperties}
        >
          {tooltip(hover.table).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
      {toast && (
        <p
          key={toast.id}
          className="club-toast"
          role="status"
          style={{ "--x": `${toast.x}px`, "--y": `${toast.y}px` } as CSSProperties}
        >
          {toast.text}
        </p>
      )}
      <svg width="0" height="0" className="club-defs" aria-hidden>
        <defs>
          <radialGradient id="club-star-glow">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0.95" />
            <stop offset="0.3" stopColor="#e2c48f" stopOpacity="0.45" />
            <stop offset="1" stopColor="#e2c48f" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}
