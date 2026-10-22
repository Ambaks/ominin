"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SectionLink, jumpToSection } from "@/components/menu/section-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCart } from "@/lib/menu/cart";
import { CategoryIcon, categoryIcons } from "@/lib/menu/category-icons";
import { type CategoryLink, useActiveSection } from "@/lib/menu/use-active-section";
import { useQueryParam } from "@/lib/menu/use-query-param";

/*
 * Les catégories en rail vertical, à gauche de la carte (réglage
 * category_layout de l'établissement). Au repos, une colonne fine ne montre
 * que trois icônes : la catégorie en cours sur sa pastille, la précédente et
 * la suivante en retrait ; elles défilent à mesure qu'on lit la carte.
 * Toucher le rail l'ouvre en entier, icônes et noms, et pousse la carte à
 * droite : on touche une catégorie, on y est. Maintenir le doigt l'ouvre
 * aussi : on glisse jusqu'à la catégorie voulue et on relâche.
 *
 * Les lignes portent data-rail-item et non data-category : les thèmes des
 * établissements habillent les pastilles de la barre du haut par
 * [data-category], ils n'ont pas à toucher au rail.
 */

/** Durée d'appui qui ouvre le rail en mode glisser-relâcher. */
const LONG_PRESS_MS = 420;
/* Rail ouvert à l'appui long : près d'un bord de la liste, le doigt la fait
 * défiler, à cette vitesse en pixels par seconde. */
const EDGE_PX = 56;
const EDGE_PX_PER_S = 540;

/** Une ligne ne se redessine que si son état change, pas à chaque
 * mouvement du doigt sur le rail ouvert. */
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
  // Rail ouvert, et par quoi : l'appui long (le doigt désigne, la liste ne
  // défile qu'aux bords) ou un toucher (la liste défile au doigt).
  const [openedBy, setOpenedBy] = useState<"press" | "tap" | null>(null);
  const open = openedBy !== null;
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
  const icons = useMemo(() => categoryIcons(categories.map(({ name }) => name)), [categories]);
  const activeIndex = Math.max(0, categories.findIndex(({ id }) => id === activeId));

  const hover = (id: string | null) => {
    hoveredRef.current = id;
    setHovered(id);
  };

  const itemAt = (x: number, y: number) =>
    document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-rail-item]")?.dataset.railItem ?? null;

  /** Referme le rail ; choose : la carte va à la catégorie sous le doigt
   * (relâché d'un appui long). */
  const close = useCallback(
    (choose: boolean) => {
      const target = hoveredRef.current;
      if (choose && target) {
        track("categorie");
        jumpToSection(target, true);
      }
      setOpenedBy(null);
      hoveredRef.current = null;
      setHovered(null);
      press.current = null;
    },
    [track]
  );

  // Fermé, la liste glisse pour poser la catégorie en cours au milieu de la
  // fenêtre de trois lignes (mesurée : la hauteur des lignes est en rem, elle
  // suit la taille de texte du téléphone). Ouvert, elle reprend sa place et
  // défile jusqu'à elle. La carte glisse à droite avec le rail (globals.css).
  useLayoutEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-rail-item="${activeId}"]`);
    navRef.current?.parentElement?.toggleAttribute("data-rail-open", open);
    if (!list || !item) return;
    if (open) {
      list.style.transform = "";
      list.scrollTo({ top: item.offsetTop - list.clientHeight / 2, behavior: "instant" });
      return;
    }
    list.scrollTop = 0;
    list.style.transform = `translateY(${item.offsetHeight - item.offsetTop}px)`;
  }, [activeId, open]);

  // Au doigt, le geste se suit en évènements tactiles, posés sur le rail dès
  // le départ : Safari et Chrome décident au premier contact si un
  // touchmove pourra être annulé, et ne laissent bloquer le défilement qu'à
  // un écouteur non passif déjà présent. Une fois le rail ouvert par l'appui,
  // le doigt qui glisse désigne la ligne au lieu de faire défiler, et le
  // relâcher choisit — même si le navigateur a entre-temps annulé le pointeur.
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
    // Geste interrompu par le système (appel, geste de bord) : rien n'est choisi.
    const cancel = () => {
      if (press.current?.opened) close(false);
    };
    nav.addEventListener("touchmove", move, { passive: false });
    nav.addEventListener("touchend", end);
    nav.addEventListener("touchcancel", cancel);
    return () => {
      nav.removeEventListener("touchmove", move);
      nav.removeEventListener("touchend", end);
      nav.removeEventListener("touchcancel", cancel);
    };
  }, [close]);

  // Rail ouvert : Échap referme, et près d'un bord la liste défile seule sous
  // le doigt de l'appui long, à vitesse constante quelle que soit la
  // fréquence de l'écran.
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
        className={`fixed inset-0 z-[45] bg-black/30 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <nav
        ref={navRef}
        aria-label="Catégories"
        data-category-rail
        className={`sticky flex w-12 shrink-0 flex-col self-start ${
          open ? `z-50 ${embedded ? "h-[calc(100dvh-3rem)]" : "h-dvh"}` : "z-20"
        } ${embedded ? "top-12" : "top-0"}`}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          swallowClick.current = false;
          const target = event.currentTarget;
          const { pointerId, clientX, clientY } = event;
          const timer = window.setTimeout(() => {
            press.current = { timer: 0, opened: true, y: clientY };
            swallowClick.current = true;
            setOpenedBy("press");
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
          // Le clic qui suit un appui long, ou un toucher sur le rail fermé :
          // il ouvre le rail au lieu de suivre le lien.
          if (swallowClick.current || !open) {
            event.preventDefault();
            event.stopPropagation();
          }
          if (swallowClick.current) swallowClick.current = false;
          else if (!open) setOpenedBy("tap");
        }}
        onDragStart={(event) => event.preventDefault()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {/* Fermé : la fenêtre de trois lignes, la pastille fixe au milieu ;
            les icônes défilent derrière elle. Ouvert : le panneau déborde de
            la colonne, qui garde sa largeur — la carte glisse sans se
            remettre en page. */}
        <div
          className={`relative flex min-h-0 flex-col overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none ${
            open ? "w-60 flex-1 rounded-r-3xl bg-background shadow-[12px_0_40px_rgb(0_0_0/0.35)]" : "mt-3 h-36 w-12"
          }`}
        >
          {!open && (
            <span
              aria-hidden
              data-rail-pill
              className="pointer-events-none absolute inset-x-1 top-12 h-12 rounded-2xl bg-[color-mix(in_srgb,var(--ember-2)_24%,transparent)]"
            />
          )}
          <ul
            ref={listRef}
            className={`no-scrollbar relative flex min-h-0 flex-1 flex-col select-none [-webkit-touch-callout:none] ${
              open
                ? `overflow-y-auto py-3 ${openedBy === "press" ? "touch-none" : ""}`
                : "transition-transform duration-300 ease-out motion-reduce:transition-none"
            }`}
          >
            {categories.map(({ id, name }, index) => {
              const active = id === activeId;
              const highlighted = open && (openedBy === "press" ? id === hovered : active);
              const distance = Math.abs(index - activeIndex);
              return (
                <li
                  key={id}
                  data-rail-item={id}
                  className={`relative px-1 transition-opacity duration-300 motion-reduce:transition-none ${
                    open || distance === 0 ? "" : distance === 1 ? "opacity-40" : "invisible opacity-0"
                  }`}
                >
                  <SectionLink
                    sectionId={id}
                    aria-label={name}
                    aria-current={active ? "location" : undefined}
                    tabIndex={open || distance <= 1 ? undefined : -1}
                    draggable={false}
                    onJump={() => {
                      track("categorie");
                      close(false);
                    }}
                    className={`flex h-12 items-center gap-3 rounded-2xl px-2.5 text-ember-2 transition-colors motion-reduce:transition-none ${
                      highlighted ? "bg-[color-mix(in_srgb,var(--ember-2)_24%,transparent)]" : ""
                    }`}
                  >
                    <RailIcon
                      icon={icons[index]}
                      className={`size-6 shrink-0 transition-transform duration-300 motion-reduce:transition-none ${
                        open || active ? "" : "scale-90"
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
            {open && !themeLocked && (
              <li className="mb-24 mt-3 flex justify-center">
                <ThemeToggle />
              </li>
            )}
          </ul>
        </div>
      </nav>
    </>
  );
}
