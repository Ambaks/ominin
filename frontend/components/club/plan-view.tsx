"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { FloorPlan, type TableState } from "@/components/club/floor-plan";
import { CLUB_SPRING, CLUB_TIMING, PLAN_POINTER } from "@/components/club/timing";
import { usePlanCamera } from "@/components/club/use-plan-camera";
import type { ClubTable, ZoneLayout } from "@/lib/club/types";

/*
 * Le plan d'une zone, à manipuler : la caméra (use-plan-camera) le déplace
 * et l'agrandit ; un toucher choisit la table la plus proche du doigt
 * (cible de 2 × tapRadius, même quand le dessin est petit). L'étoile se
 * creuse sous le doigt, s'embrase au choix ; une table prise refuse d'un
 * mouvement de tête et le dit. Au bureau : la lumière suit le curseur,
 * éclaire les étoiles voisines, et une infobulle dit la table survolée.
 * D'une zone à l'autre, les deux plans se croisent en fondu.
 */

export type PlanZone = { id: string; name: string; layout: ZoneLayout; tables: ClubTable[] };

/* Pastille des places sur le plan client, et pas des boutons de zoom. */
const SEAT_BADGE = 10;
const ZOOM_STEP = 1.5;
/* Place (px) qu'il faut au-dessus d'une table pour y poser l'infobulle. */
const TOOLTIP_ROOM = 64;

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const [toast, setToast] = useState<{ id: number; text: string; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<{ table: ClubTable; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), CLUB_TIMING.toast);
    return () => clearTimeout(timer);
  }, [toast]);

  /* La table la plus proche d'un point de l'écran, à portée de doigt. */
  const nearest = useCallback(
    (x: number, y: number, reach: number) => {
      const card = cardRef.current;
      if (!card) return null;
      let best: { node: SVGGElement; table: ClubTable; distance: number } | null = null;
      for (const node of card.querySelectorAll<SVGGElement>(".club-plan-current .plan-table")) {
        const box = node.getBoundingClientRect();
        const distance = Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2));
        const table = zone.tables.find((candidate) => candidate.id === node.dataset.id);
        if (table && distance <= reach && (!best || distance < best.distance)) best = { node, table, distance };
      }
      return best;
    },
    [zone.tables]
  );

  const onTap = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      if (!interactive) return;
      const hit = nearest(x, y, PLAN_POINTER.tapRadius);
      const card = cardRef.current;
      if (!hit || !card) return;
      const state = states[hit.table.id] ?? "libre";
      const reduced = reducedMotion();
      setHover(null);
      if (state === "libre") {
        navigator.vibrate?.(10);
        onSelect(hit.table);
        if (!reduced) {
          hit.node.querySelector(".plan-halo")?.animate(
            [{ transform: "scale(0.4)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }],
            { duration: CLUB_TIMING.ignite, easing: CLUB_SPRING }
          );
        }
        return;
      }
      if (!reduced) {
        hit.node.animate(
          [{ translate: "0 0" }, { translate: "-4px 0" }, { translate: "4px 0" }, { translate: "-2px 0" }, { translate: "0 0" }],
          { duration: CLUB_TIMING.shake, easing: "ease-in-out" }
        );
      }
      const box = hit.node.getBoundingClientRect();
      const origin = card.getBoundingClientRect();
      setToast({
        id: performance.now(),
        text: refusal(hit.table, state),
        x: box.left + box.width / 2 - origin.left,
        y: box.top - origin.top,
      });
    },
    [interactive, nearest, states, onSelect, refusal]
  );

  const { viewport, content, zoomed, recenter, zoomBy } = usePlanCamera({ resetKey: shown.id, onTap, onSwipe });

  /* ---------- Sous le doigt, sous la souris ---------- */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const reduced = reducedMotion();
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    let pressed: SVGGElement | null = null;
    const release = () => {
      pressed?.removeAttribute("data-pressed");
      pressed = null;
    };
    const onDown = (event: PointerEvent) => {
      if (!interactive) return;
      const hit = nearest(event.clientX, event.clientY, PLAN_POINTER.tapRadius);
      if (hit && !reduced) {
        pressed = hit.node;
        pressed.setAttribute("data-pressed", "");
      }
    };

    // Bureau : la lumière rejoint le curseur (lerp), les étoiles voisines s'éclairent, l'infobulle attend un instant.
    let raf = 0;
    let target = { x: 0, y: 0 };
    const light = { x: 0, y: 0 };
    let inside = false;
    let hoverTimer = 0;
    const frame = () => {
      raf = 0;
      const box = card.getBoundingClientRect();
      light.x += (target.x - light.x) * PLAN_POINTER.lerp;
      light.y += (target.y - light.y) * PLAN_POINTER.lerp;
      card.style.setProperty("--mx", `${light.x - box.left}px`);
      card.style.setProperty("--my", `${light.y - box.top}px`);
      for (const node of card.querySelectorAll<SVGGElement>(".club-plan-current .plan-table")) {
        const star = node.getBoundingClientRect();
        const distance = Math.hypot(target.x - (star.left + star.width / 2), target.y - (star.top + star.height / 2));
        const near = inside ? Math.max(0, 1 - distance / PLAN_POINTER.proximity) : 0;
        node.style.setProperty("--near", near.toFixed(2));
      }
      if (Math.hypot(target.x - light.x, target.y - light.y) > 0.5) raf = requestAnimationFrame(frame);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target = { x: event.clientX, y: event.clientY };
      if (!inside) Object.assign(light, target);
      inside = true;
      if (!raf) raf = requestAnimationFrame(frame);
      clearTimeout(hoverTimer);
      const hit = event.buttons ? null : nearest(event.clientX, event.clientY, PLAN_POINTER.tapRadius);
      if (!hit) {
        setHover(null);
        return;
      }
      hoverTimer = window.setTimeout(() => {
        const box = hit.node.getBoundingClientRect();
        const origin = card.getBoundingClientRect();
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
      clearTimeout(hoverTimer);
      setHover(null);
      if (!raf) raf = requestAnimationFrame(frame);
    };

    card.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    if (fine && !reduced) {
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
    }
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hoverTimer);
      card.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [interactive, nearest]);

  /* Les animations sans fin (scintillement, pulsation) s'arrêtent hors de l'écran. */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => card.toggleAttribute("data-offscreen", !entry.isIntersecting));
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const plan = (target: PlanZone) => (
    <FloorPlan
      layout={target.layout}
      tables={target.tables}
      states={states}
      selectedId={selectedId}
      onSelect={interactive ? onSelect : undefined}
      describe={describe}
      label={`Plan : ${target.name}`}
      badge={SEAT_BADGE}
      className="club-plan"
    />
  );

  return (
    <div ref={cardRef} className="club-plan-card" style={{ "--dir": direction } as CSSProperties}>
      <div ref={viewport} className="club-plan-viewport">
        <div ref={content} className="club-plan-layer">
          {leaving && (
            <div key={leaving.id} className="club-plan-leaving" aria-hidden inert>
              {plan(leaving)}
            </div>
          )}
          <div key={shown.id} className="club-plan-current" data-entering={leaving ? "" : undefined}>
            {plan(shown)}
          </div>
        </div>
      </div>

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
