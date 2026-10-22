"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SectionLink, jumpToSection } from "@/components/menu/section-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCart } from "@/lib/menu/cart";
import { CategoryIcon } from "@/lib/menu/category-icons";
import { scrollBehavior } from "@/lib/menu/scroll";
import { type CategoryLink, useActiveSection } from "@/lib/menu/use-active-section";
import { useQueryParam } from "@/lib/menu/use-query-param";

/*
 * Les catégories en rail vertical, à gauche de la carte (réglage
 * category_layout de l'établissement) : une icône par catégorie, au trait, à
 * la couleur d'accent. Une pastille glisse derrière celle de la section en
 * cours. Toucher une icône y emmène et montre son nom dans une bulle ;
 * maintenir le doigt élargit le rail par-dessus la carte voilée, avec tous
 * les noms : on glisse jusqu'à la catégorie voulue, on relâche, on y est.
 *
 * Les lignes portent data-rail-item et non data-category : les thèmes des
 * établissements habillent les pastilles de la barre du haut par
 * [data-category], ils n'ont pas à toucher au rail.
 */

/** Durée d'appui qui élargit le rail, et vie de la bulle d'une icône touchée. */
const LONG_PRESS_MS = 420;
const BUBBLE_MS = 1300;
/* Géométrie de la liste, celle des classes ci-dessous (pt-3, h-12, gap-1) :
 * la pastille se place par le rang de la ligne, dès le rendu serveur. */
const LIST_PADDING = 12;
const ROW_PITCH = 52;
/* Rail élargi : près d'un bord de la liste, le doigt la fait défiler. */
const EDGE_PX = 56;
const EDGE_SPEED = 9;

export function CategoryRail({
  categories,
  themeLocked,
}: {
  categories: CategoryLink[];
  /** Palette d'établissement verrouillée : pas de bouton clair/sombre. */
  themeLocked?: boolean;
}) {
  const { track } = useCart();
  const embedded = useQueryParam("embed") === "1";
  const { activeId } = useActiveSection(categories);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [bubble, setBubble] = useState<{ id: string; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const press = useRef<{ timer: number; opened: boolean; y: number } | null>(null);
  const activeIndex = Math.max(0, categories.findIndex(({ id }) => id === activeId));

  const itemAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-rail-item]")?.dataset.railItem ?? null;

  // La catégorie sous le doigt, lue au relâché depuis les écouteurs du
  // document : l'état React y serait celui du rendu qui les a posés.
  const hoveredRef = useRef<string | null>(null);
  const hover = (id: string | null) => {
    hoveredRef.current = id;
    setHovered(id);
  };

  const close = useCallback(() => {
    setOpen(false);
    hoveredRef.current = null;
    setHovered(null);
    press.current = null;
  }, []);

  /** Relâché d'un appui long : la carte va à la catégorie sous le doigt. */
  const release = useCallback(() => {
    const target = hoveredRef.current;
    if (target) {
      track("categorie");
      jumpToSection(target, true);
    }
    setOpen(false);
    hoveredRef.current = null;
    setHovered(null);
    // Le clic qui suit un appui long ne doit pas suivre le lien dessous.
    window.setTimeout(() => (press.current = null), 0);
  }, [track]);

  // La liste défile pour garder visible l'icône de la section en cours.
  useEffect(() => {
    const list = listRef.current;
    if (!list || open) return;
    const top = LIST_PADDING + activeIndex * ROW_PITCH;
    if (top < list.scrollTop || top + ROW_PITCH > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 2, behavior: scrollBehavior() });
    }
  }, [activeIndex, open]);

  // La bulle suit son icône, même si la liste défile sous elle.
  const placeBubble = useCallback((id: string) => {
    const nav = navRef.current;
    const item = nav?.querySelector<HTMLElement>(`[data-rail-item="${id}"]`);
    if (!nav || !item) return;
    const box = item.getBoundingClientRect();
    setBubble({ id, top: box.top - nav.getBoundingClientRect().top + box.height / 2 });
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!bubble || !list) return;
    const follow = () => placeBubble(bubble.id);
    list.addEventListener("scroll", follow, { passive: true });
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => {
      list.removeEventListener("scroll", follow);
      window.clearTimeout(timer);
    };
  }, [bubble, placeBubble]);

  // Rail élargi : au doigt, on suit les évènements tactiles — le navigateur
  // a pu annuler le pointeur en croyant à un défilement. Le doigt qui glisse
  // ne fait pas défiler la page (écouteur non passif, seul moyen d'annuler
  // le défilement sur Safari) ; le relâcher choisit. Échap referme, et près
  // d'un bord la liste défile seule.
  useEffect(() => {
    if (!open) return;
    const move = (event: TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch || !press.current) return;
      press.current.y = touch.clientY;
      hover(itemAt(touch.clientX, touch.clientY));
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", release);
    document.addEventListener("keydown", escape);
    let frame = 0;
    const drift = () => {
      const list = listRef.current;
      const y = press.current?.y;
      if (list && y != null) {
        const box = list.getBoundingClientRect();
        if (y < box.top + EDGE_PX) list.scrollTop -= EDGE_SPEED;
        else if (y > box.bottom - EDGE_PX) list.scrollTop += EDGE_SPEED;
      }
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    return () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", release);
      document.removeEventListener("keydown", escape);
      cancelAnimationFrame(frame);
    };
  }, [open, close, release]);

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-30 bg-black/45 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <nav
        ref={navRef}
        aria-label="Catégories"
        data-category-rail
        className={`sticky z-40 flex w-16 shrink-0 flex-col self-start ${embedded ? "top-12 h-[calc(100dvh-3rem)]" : "top-0 h-dvh"}`}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          const target = event.currentTarget;
          const { pointerId, clientX, clientY } = event;
          const timer = window.setTimeout(() => {
            press.current = { timer: 0, opened: true, y: clientY };
            setBubble(null);
            setOpen(true);
            hover(itemAt(clientX, clientY));
            navigator.vibrate?.(8);
            // Le relâché revient au rail même hors de lui : il referme. Un
            // pointeur déjà relâché refuse la capture ; le voile referme alors.
            try {
              target.setPointerCapture(pointerId);
            } catch {}
          }, LONG_PRESS_MS);
          press.current = { timer, opened: false, y: clientY };
        }}
        onPointerMove={(event) => {
          if (!press.current?.opened) return;
          press.current.y = event.clientY;
          hover(itemAt(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          if (!press.current) return;
          window.clearTimeout(press.current.timer);
          if (!press.current.opened) press.current = null;
          // Au doigt, c'est touchend qui choisit (voir plus haut).
          else if (event.pointerType !== "touch") release();
        }}
        onPointerCancel={() => {
          // Annulé avant l'ouverture : un défilement, pas un appui long.
          // Après : le suivi tactile du rail élargi prend le relais.
          if (press.current && !press.current.opened) {
            window.clearTimeout(press.current.timer);
            press.current = null;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (press.current?.opened) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <ul
          ref={listRef}
          className={`no-scrollbar relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto border-r border-hairline bg-background pb-28 pt-3 select-none [-webkit-touch-callout:none] transition-[width,border-radius,box-shadow] duration-200 motion-reduce:transition-none ${
            open ? "w-64 rounded-r-3xl shadow-[12px_0_40px_rgb(0_0_0/0.35)]" : "w-16"
          }`}
        >
          <li
            aria-hidden
            className={`pointer-events-none absolute inset-x-2 top-0 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--ember-2)_24%,transparent)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
              open ? "opacity-0" : "opacity-100"
            }`}
            style={{ transform: `translateY(${LIST_PADDING + activeIndex * ROW_PITCH}px)` }}
          />
          {categories.map(({ id, name }) => {
            const active = id === activeId;
            const highlighted = open && id === hovered;
            return (
              <li key={id} data-rail-item={id} className="relative px-2">
                <SectionLink
                  sectionId={id}
                  aria-label={name}
                  title={name}
                  draggable={false}
                  aria-current={active ? "location" : undefined}
                  onJump={() => {
                    track("categorie");
                    placeBubble(id);
                  }}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) placeBubble(id);
                  }}
                  className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-ember-2 transition-colors motion-reduce:transition-none ${
                    highlighted ? "bg-[color-mix(in_srgb,var(--ember-2)_28%,transparent)]" : ""
                  }`}
                >
                  <CategoryIcon
                    name={name}
                    className={`size-6 shrink-0 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
                      active || highlighted ? "scale-[1.18] opacity-100" : "opacity-75"
                    }`}
                  />
                  {open && (
                    <span
                      className={`truncate text-[15px] ${
                        highlighted ? "font-semibold text-foreground" : "font-medium text-muted"
                      }`}
                    >
                      {name}
                    </span>
                  )}
                </SectionLink>
              </li>
            );
          })}
        </ul>
        {!themeLocked && (
          <div className="flex justify-center border-r border-hairline bg-background py-3 max-sm:hidden">
            <ThemeToggle />
          </div>
        )}
        {bubble && !open && (
          <span
            key={bubble.id}
            aria-hidden
            className="rail-bubble pointer-events-none absolute left-full z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-3.5 py-1.5 text-sm font-semibold text-background shadow-lg before:absolute before:-left-1 before:top-1/2 before:size-2.5 before:-translate-y-1/2 before:rotate-45 before:rounded-[2px] before:bg-foreground"
            style={{ top: bubble.top }}
          >
            {categories.find(({ id }) => id === bubble.id)?.name}
          </span>
        )}
      </nav>
    </>
  );
}
