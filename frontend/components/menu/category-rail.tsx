"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
 * les noms : on glisse jusqu'à la catégorie voulue, on relâche, on y est. Le
 * bouton du pied du rail l'élargit aussi, au clic ou au clavier.
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
/* Rail élargi : près d'un bord de la liste, le doigt la fait défiler, à
 * cette vitesse en pixels par seconde. */
const EDGE_PX = 56;
const EDGE_PX_PER_S = 540;

/** Une ligne ne se redessine que si son état change, pas à chaque
 * mouvement du doigt sur le rail élargi. */
const RailIcon = memo(CategoryIcon);

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
  // Appui en cours : son minuteur, s'il a ouvert le rail, la hauteur du
  // doigt (défilement près des bords).
  const press = useRef<{ timer: number; opened: boolean; y: number } | null>(null);
  // Après un appui long, le clic que le navigateur synthétise au relâché ne
  // doit pas suivre le lien de départ : marqué jusqu'au prochain appui.
  const swallowClick = useRef(false);
  // La catégorie sous le doigt, lue au relâché depuis les écouteurs posés
  // hors du rendu : l'état React y serait périmé.
  const hoveredRef = useRef<string | null>(null);
  const activeIndex = Math.max(0, categories.findIndex(({ id }) => id === activeId));

  const hover = (id: string | null) => {
    hoveredRef.current = id;
    setHovered(id);
  };

  const itemAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-rail-item]")?.dataset.railItem ?? null;

  /** Referme le rail élargi ; choose : la carte va à la catégorie sous le
   * doigt (relâché d'un appui long). */
  const close = useCallback(
    (choose: boolean) => {
      const target = hoveredRef.current;
      if (choose && target) {
        track("categorie");
        jumpToSection(target, true);
      }
      setOpen(false);
      hoveredRef.current = null;
      setHovered(null);
      press.current = null;
    },
    [track]
  );

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

  // Au doigt, le geste se suit en évènements tactiles, posés sur le rail dès
  // le départ : Safari et Chrome décident au premier contact si un
  // touchmove pourra être annulé, et ne laissent bloquer le défilement qu'à
  // un écouteur non passif déjà présent. Une fois le rail élargi, le doigt
  // qui glisse désigne la ligne au lieu de faire défiler, et le relâcher
  // choisit — même si le navigateur a entre-temps annulé le pointeur.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const move = (event: TouchEvent) => {
      if (!press.current?.opened) return;
      event.preventDefault();
      const touch = event.touches[0];
      press.current.y = touch.clientY;
      hover(itemAt(touch.clientX, touch.clientY));
    };
    const end = () => {
      if (press.current?.opened) close(true);
    };
    nav.addEventListener("touchmove", move, { passive: false });
    nav.addEventListener("touchend", end);
    return () => {
      nav.removeEventListener("touchmove", move);
      nav.removeEventListener("touchend", end);
    };
  }, [close]);

  // Rail élargi : Échap referme, et près d'un bord la liste défile seule,
  // à vitesse constante quelle que soit la fréquence de l'écran.
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && close(false);
    document.addEventListener("keydown", escape);
    let frame = 0;
    let last = performance.now();
    const drift = (now: number) => {
      const list = listRef.current;
      const y = press.current?.y;
      const step = (EDGE_PX_PER_S * (now - last)) / 1000;
      last = now;
      if (list && y != null) {
        const box = list.getBoundingClientRect();
        if (y < box.top + EDGE_PX) list.scrollTop -= step;
        else if (y > box.bottom - EDGE_PX) list.scrollTop += step;
      }
      frame = requestAnimationFrame(drift);
    };
    frame = requestAnimationFrame(drift);
    return () => {
      document.removeEventListener("keydown", escape);
      cancelAnimationFrame(frame);
    };
  }, [open, close]);

  return (
    <>
      <div
        aria-hidden
        onClick={() => close(false)}
        className={`fixed inset-0 z-[45] bg-black/45 transition-opacity duration-200 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <nav
        ref={navRef}
        aria-label="Catégories"
        data-category-rail
        className={`sticky flex w-16 shrink-0 flex-col self-start ${open ? "z-50" : "z-20"} ${
          embedded ? "top-12 h-[calc(100dvh-3rem)]" : "top-0 h-dvh"
        }`}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          swallowClick.current = false;
          const target = event.currentTarget;
          const { pointerId, clientX, clientY } = event;
          const timer = window.setTimeout(() => {
            press.current = { timer: 0, opened: true, y: clientY };
            swallowClick.current = true;
            setBubble(null);
            setOpen(true);
            hover(itemAt(clientX, clientY));
            navigator.vibrate?.(8);
            // Le relâché revient au rail même hors de lui. Un pointeur déjà
            // annulé refuse la capture : le suivi tactile prend le relais.
            try {
              target.setPointerCapture(pointerId);
            } catch {}
          }, LONG_PRESS_MS);
          press.current = { timer, opened: false, y: clientY };
        }}
        onPointerMove={(event) => {
          if (!press.current?.opened || event.pointerType === "touch") return;
          press.current.y = event.clientY;
          hover(itemAt(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          if (!press.current) return;
          window.clearTimeout(press.current.timer);
          if (!press.current.opened) press.current = null;
          // Au doigt, c'est touchend qui choisit (voir plus haut).
          else if (event.pointerType !== "touch") close(true);
        }}
        onPointerCancel={() => {
          // Annulé avant l'ouverture : un défilement, pas un appui long.
          if (press.current && !press.current.opened) {
            window.clearTimeout(press.current.timer);
            press.current = null;
          }
        }}
        onClickCapture={(event) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        <ul
          ref={listRef}
          className={`no-scrollbar relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto border-r border-hairline bg-background pt-3 select-none [-webkit-touch-callout:none] transition-[width,border-radius,box-shadow] duration-200 motion-reduce:transition-none ${
            open ? "w-64 touch-none rounded-r-3xl shadow-[12px_0_40px_rgb(0_0_0/0.35)]" : "w-16"
          }`}
        >
          <li
            aria-hidden
            data-rail-pill
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
                  aria-current={active ? "location" : undefined}
                  draggable={false}
                  onJump={() => {
                    track("categorie");
                    if (open) close(false);
                    else placeBubble(id);
                  }}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) placeBubble(id);
                  }}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse" && !open) placeBubble(id);
                  }}
                  className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-ember-2 transition-colors motion-reduce:transition-none ${
                    highlighted ? "bg-[color-mix(in_srgb,var(--ember-2)_28%,transparent)]" : ""
                  }`}
                >
                  <RailIcon
                    name={name}
                    className={`size-6 shrink-0 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
                      active || highlighted ? "scale-[1.18] opacity-100" : "opacity-80"
                    }`}
                  />
                  {open && (
                    <span
                      className={`rail-name truncate text-[15px] ${
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
          {/* Toutes les catégories d'un coup, au clic ou au clavier : le
              même rail élargi que l'appui long, qui se signale ainsi. */}
          <li className="mb-28 mt-1 px-2">
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "Replier les catégories" : "Toutes les catégories"}
              onClick={() => (open ? close(false) : setOpen(true))}
              className="flex h-10 w-full items-center justify-center rounded-2xl text-muted transition-colors hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" className={`size-5 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 6l6 6-6 6M13 6l6 6-6 6" />
              </svg>
            </button>
          </li>
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
            className="rail-bubble ember-gradient pointer-events-none absolute left-full z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold text-background shadow-lg before:absolute before:-left-1 before:top-1/2 before:size-2.5 before:-translate-y-1/2 before:rotate-45 before:rounded-[2px] before:bg-[var(--ember-1)]"
            style={{ top: bubble.top }}
          >
            {categories.find(({ id }) => id === bubble.id)?.name}
          </span>
        )}
      </nav>
    </>
  );
}
