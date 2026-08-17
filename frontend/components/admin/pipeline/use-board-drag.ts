"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Glisser-déposer maison en pointer events (~100 lignes) : pas de dépendance
 * pour un besoin aussi étroit — pas de tri intra-colonne, la seule question
 * pendant un drag est « quelle colonne est sous le pointeur ». Souris et
 * tactile ; au tactile, les cartes gardent touch-action: pan-y, donc un geste
 * vertical fait défiler la colonne et seul un geste horizontal saisit la
 * carte. Échap annule. Le menu de statut reste le chemin sans drag.
 */

/** Distance (px) avant qu'un appui devienne un drag et non un clic. */
const DRAG_THRESHOLD_PX = 6;
/** Zone (px) près des bords du plateau qui déclenche l'auto-défilement. */
const EDGE_SCROLL_ZONE_PX = 48;
const EDGE_SCROLL_STEP_PX = 14;

export interface DragState {
  restaurantId: string;
  x: number;
  y: number;
  width: number;
}

export function useBoardDrag(
  onDrop: (restaurantId: string, columnId: string) => void
) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const columnEls = useRef(new Map<string, HTMLElement>());
  const boardEl = useRef<HTMLElement | null>(null);
  const start = useRef<{ x: number; y: number; restaurantId: string } | null>(
    null
  );
  const dragRef = useRef<DragState | null>(null);
  const overRef = useRef<string | null>(null);
  const suppressClick = useRef(false);

  const setDragBoth = (value: DragState | null) => {
    dragRef.current = value;
    setDrag(value);
  };
  const setOverBoth = (value: string | null) => {
    overRef.current = value;
    setOverColumn(value);
  };

  useEffect(() => {
    const columnAt = (x: number, y: number): string | null => {
      for (const [id, el] of columnEls.current) {
        const rect = el.getBoundingClientRect();
        if (
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom
        ) {
          return id;
        }
      }
      return null;
    };

    const onMove = (event: PointerEvent) => {
      const origin = start.current;
      if (!origin) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (!dragRef.current) {
        // Geste vertical : c'est un défilement, on lâche prise.
        if (Math.abs(dy) > DRAG_THRESHOLD_PX && Math.abs(dy) > Math.abs(dx)) {
          start.current = null;
          return;
        }
        if (Math.abs(dx) <= DRAG_THRESHOLD_PX) return;
        suppressClick.current = true;
        setDragBoth({
          restaurantId: origin.restaurantId,
          x: event.clientX,
          y: event.clientY,
          width: 272,
        });
      } else {
        setDragBoth({ ...dragRef.current, x: event.clientX, y: event.clientY });
      }
      setOverBoth(columnAt(event.clientX, event.clientY));
      const board = boardEl.current;
      if (board) {
        const rect = board.getBoundingClientRect();
        if (event.clientX < rect.left + EDGE_SCROLL_ZONE_PX) {
          board.scrollLeft -= EDGE_SCROLL_STEP_PX;
        } else if (event.clientX > rect.right - EDGE_SCROLL_ZONE_PX) {
          board.scrollLeft += EDGE_SCROLL_STEP_PX;
        }
      }
    };

    const finish = (drop: boolean) => {
      const current = dragRef.current;
      const target = overRef.current;
      if (drop && current && target) onDrop(current.restaurantId, target);
      start.current = null;
      setDragBoth(null);
      setOverBoth(null);
      // Un drop hors de la carte d'origine ne produit aucun événement click :
      // le clic navigateur éventuel part avant les timers, on peut donc
      // désarmer juste après sans avaler le clic suivant.
      if (current) {
        setTimeout(() => {
          suppressClick.current = false;
        }, 0);
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
    };
  }, [onDrop]);

  return {
    drag,
    overColumn,
    cardHandlers: (restaurantId: string) => ({
      onPointerDown: (event: React.PointerEvent) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        start.current = {
          x: event.clientX,
          y: event.clientY,
          restaurantId,
        };
      },
    }),
    registerColumn: (id: string) => (el: HTMLElement | null) => {
      if (el) columnEls.current.set(id, el);
      else columnEls.current.delete(id);
    },
    registerBoard: (el: HTMLElement | null) => {
      boardEl.current = el;
    },
    /** Avale le clic qui suit un drag (sinon il ouvrirait la fiche). */
    guardClick: (fn: () => void) => () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      fn();
    },
  };
}
