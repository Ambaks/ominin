"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CategoryLink } from "@/components/menu/category-nav";
import { SectionLink, jumpToSection } from "@/components/menu/section-link";
import { useCart } from "@/lib/menu/cart";
import { CategoryIcon } from "@/lib/menu/category-icons";
import { useActiveSection } from "@/lib/menu/use-active-section";
import { useQueryParam } from "@/lib/menu/use-query-param";

/*
 * Les catégories en rail vertical, à gauche de la carte (réglage
 * category_layout de l'établissement) : une icône par catégorie, au trait, à
 * la couleur d'accent. Une pastille glisse derrière celle de la section en
 * cours. Toucher une icône y emmène et montre son nom dans une bulle ;
 * maintenir le doigt élargit le rail avec tous les noms, on glisse jusqu'à
 * la catégorie voulue et on relâche.
 */

/** Durée d'appui qui élargit le rail, et vie de la bulle d'une icône touchée. */
const LONG_PRESS_MS = 420;
const BUBBLE_MS = 1300;

export function CategoryRail({ categories }: { categories: CategoryLink[] }) {
  const { track } = useCart();
  const embedded = useQueryParam("embed") === "1";
  const { activeId } = useActiveSection(categories);
  const listRef = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number } | null>(null);
  // La bulle vit hors de la liste : celle-ci défile, elle couperait tout ce
  // qui dépasse sur le côté.
  const [bubble, setBubble] = useState<{ name: string; top: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const press = useRef<{ timer: number; opened: boolean } | null>(null);

  // La pastille suit l'icône de la section en cours ; la liste défile pour
  // la garder visible quand la carte a beaucoup de catégories.
  useLayoutEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-category="${activeId}"]`);
    if (!list || !item) return;
    setPill({ top: item.offsetTop, height: item.offsetHeight });
    const below = item.offsetTop + item.offsetHeight - (list.scrollTop + list.clientHeight);
    const above = item.offsetTop - list.scrollTop;
    if (below > 0 || above < 0) {
      list.scrollTo({ top: item.offsetTop - list.clientHeight / 2, behavior: "smooth" });
    }
  }, [activeId, open]);

  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  // Rail élargi : le doigt qui glisse ne doit pas faire défiler la page (un
  // écouteur non passif, seul moyen d'annuler le défilement sur Safari).
  useEffect(() => {
    if (!open) return;
    const block = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [open]);

  const categoryAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-category]")?.dataset.category ?? null;

  const close = () => {
    setOpen(false);
    setHovered(null);
  };

  return (
    <nav
      aria-label="Catégories"
      data-category-rail
      className={`sticky z-20 w-16 shrink-0 self-start ${embedded ? "top-12 h-[calc(100dvh-3rem)]" : "top-0 h-dvh"}`}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        const timer = window.setTimeout(() => {
          press.current = { timer: 0, opened: true };
          setOpen(true);
          setHovered(categoryAt(event.clientX, event.clientY));
        }, LONG_PRESS_MS);
        press.current = { timer, opened: false };
      }}
      onPointerMove={(event) => {
        if (open) setHovered(categoryAt(event.clientX, event.clientY));
      }}
      onPointerUp={() => {
        if (!press.current) return;
        window.clearTimeout(press.current.timer);
        if (press.current.opened && hovered) {
          track("categorie");
          jumpToSection(hovered, true);
        }
        if (press.current.opened) close();
        // Le relâché d'un appui long ne doit pas déclencher le lien dessous.
        else press.current = null;
      }}
      onPointerCancel={() => {
        if (press.current) window.clearTimeout(press.current.timer);
        press.current = null;
        close();
      }}
      onClickCapture={(event) => {
        if (press.current?.opened) {
          event.preventDefault();
          event.stopPropagation();
          press.current = null;
        }
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <ul
        ref={listRef}
        className={`no-scrollbar relative flex h-full flex-col gap-1 overflow-y-auto border-r border-hairline bg-background pb-28 pt-3 select-none [-webkit-touch-callout:none] transition-[width,box-shadow] duration-200 ${
          open ? "w-60 shadow-[8px_0_32px_rgb(0_0_0/0.18)]" : "w-16"
        }`}
      >
        {pill && (
          <li
            aria-hidden
            className="pointer-events-none absolute inset-x-2 top-0 rounded-2xl bg-[color-mix(in_srgb,var(--ember-2)_16%,transparent)] transition-[transform,height] duration-300 ease-out"
            style={{ transform: `translateY(${pill.top}px)`, height: pill.height }}
          />
        )}
        {categories.map(({ id, name }) => {
          const active = id === activeId;
          const highlighted = open && id === hovered;
          return (
            <li key={id} data-category={id} className="relative px-2">
              <SectionLink
                sectionId={id}
                aria-label={name}
                aria-current={active ? "location" : undefined}
                onJump={(event) => {
                  track("categorie");
                  const item = event.currentTarget.parentElement;
                  const list = listRef.current;
                  if (item && list) {
                    setBubble({
                      name,
                      top: list.offsetTop + item.offsetTop - list.scrollTop + item.offsetHeight / 2,
                    });
                  }
                }}
                className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-ember-2 transition-colors ${
                  highlighted ? "bg-[color-mix(in_srgb,var(--ember-2)_24%,transparent)]" : ""
                }`}
              >
                <CategoryIcon
                  name={name}
                  className={`size-6 shrink-0 transition-[transform,opacity] duration-300 ${
                    active ? "scale-110 opacity-100" : "opacity-60"
                  }`}
                />
                {open && (
                  <span className="truncate text-sm font-medium text-foreground">{name}</span>
                )}
              </SectionLink>
            </li>
          );
        })}
      </ul>
      {bubble && !open && (
        <span
          role="status"
          className="pointer-events-none absolute left-full ml-1 -translate-y-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-lg"
          style={{ top: bubble.top }}
        >
          {bubble.name}
        </span>
      )}
    </nav>
  );
}
