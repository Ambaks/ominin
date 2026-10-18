"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SectionLink } from "@/components/menu/section-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCart } from "@/lib/menu/cart";
import { scrollBehavior } from "@/lib/menu/scroll";
import { useQueryParam } from "@/lib/menu/use-query-param";

interface CategoryLink {
  id: string;
  name: string;
}

/** Ligne qu'un titre de section doit passer pour allumer sa catégorie, en part de la hauteur d'écran. */
const ACTIVE_LINE = 0.4;

/** Pas d'une flèche du rail, en part de sa largeur visible. */
const RAIL_STEP = 0.75;

export function CategoryNav({
  categories,
  themeLocked,
}: {
  categories: CategoryLink[];
  /** Palette d'établissement verrouillée (.theme-<slug>) : le basculement
      clair/sombre n'aurait aucun effet visible, on n'affiche pas le bouton. */
  themeLocked?: boolean;
}) {
  const { track } = useCart();
  // Menu montré dans une iframe de la page d'accueil (?embed=1).
  const embedded = useQueryParam("embed") === "1";
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  // La catégorie allumée et la jauge, relues à chaque défilement : la
  // dernière section dont le titre a passé la ligne des 40 % de l'écran, la
  // première tant qu'aucun ne l'a passée. (Un observateur d'intersection à
  // bande haute laissait allumée la section du dessous quand on remontait :
  // deux sections y tenaient à la fois, celle du dessus n'y rentrait jamais.)
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
        const line = window.innerHeight * ACTIVE_LINE;
        let active = categories[0]?.id;
        for (const { id } of categories) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= line) active = id;
        }
        setActiveId(active);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [categories]);

  // Keep the active pill visible in the horizontal rail.
  useEffect(() => {
    const rail = railRef.current;
    const pill = rail?.querySelector<HTMLElement>(`[data-category="${activeId}"]`);
    if (rail && pill) centerInRail(rail, pill);
  }, [activeId]);

  // Le trait de l'onglet courant, là où un thème le dessine (::after du
  // rail, globals.css) : posé sous la pastille allumée, il glisse de l'une à
  // l'autre au lieu de sauter. Reposé quand la pastille change de taille (la
  // police de la marque, chargée après).
  useEffect(() => {
    const rail = railRef.current;
    const pill = rail?.querySelector<HTMLElement>(`[data-category="${activeId}"]`);
    if (!rail || !pill || getComputedStyle(rail, "::after").content === "none") return;
    const place = () => {
      rail.style.setProperty("--rail-x", `${pill.offsetLeft + pill.clientLeft}px`);
      rail.style.setProperty("--rail-y", `${pill.offsetTop + pill.clientTop + pill.clientHeight}px`);
      rail.style.setProperty("--rail-w", String(pill.clientWidth));
    };
    place();
    if (!rail.hasAttribute("data-placed")) {
      // Relu avant de pouvoir glisser : le premier placement ne part pas du
      // bord du rail.
      rail.getBoundingClientRect();
      rail.setAttribute("data-placed", "");
    }
    const resize = new ResizeObserver(place);
    resize.observe(pill);
    return () => resize.disconnect();
  }, [activeId]);

  // Les pastilles cachées de chaque côté du rail : un thème y élargit le
  // fondu et montre ses flèches (globals.css).
  // La première ou la dernière pastille entamée par le bord du rail : un
  // observateur, sans écouter le défilement (le pixel de marge absorbe les
  // arrondis d'une pastille posée pile au bord).
  const [masked, setMasked] = useState({ start: false, end: false });
  useEffect(() => {
    const rail = railRef.current;
    const first = rail?.firstElementChild;
    const last = rail?.lastElementChild;
    if (!rail || !first || !last) return;
    const observer = new IntersectionObserver(
      (entries) =>
        setMasked((current) => {
          const next = { ...current };
          for (const entry of entries) {
            const cut = entry.intersectionRatio < 1;
            if (entry.target === first) next.start = cut;
            if (entry.target === last) next.end = cut;
          }
          return next.start === current.start && next.end === current.end ? current : next;
        }),
      { root: rail, rootMargin: "0px 1px", threshold: 1 }
    );
    observer.observe(first);
    observer.observe(last);
    return () => observer.disconnect();
  }, [categories]);

  // Au repos, une pastille entamée par une flèche s'efface (data-clipped,
  // globals.css) : « Pl » ou « ls » dépassaient à côté d'elle. Seulement là
  // où un thème montre les flèches ; le défilement rend les pastilles.
  const arrows = useRef<Record<"start" | "end", HTMLButtonElement | null>>({
    start: null,
    end: null,
  });
  useEffect(() => {
    const rail = railRef.current;
    const { start, end } = arrows.current;
    if (!rail || !start || !end || getComputedStyle(start).display === "none") return;
    const pills = [...rail.children] as HTMLElement[];
    const unmark = () => {
      for (const pill of pills) pill.removeAttribute("data-clipped");
    };
    const mark = () => {
      const box = rail.getBoundingClientRect();
      const left = masked.start ? start.getBoundingClientRect().right : box.left;
      const right = masked.end ? end.getBoundingClientRect().left : box.right;
      for (const pill of pills) {
        const { left: pillLeft, right: pillRight } = pill.getBoundingClientRect();
        pill.toggleAttribute("data-clipped", pillLeft < left - 1 || pillRight > right + 1);
      }
    };
    mark();
    rail.addEventListener("scroll", unmark, { passive: true });
    rail.addEventListener("scrollend", mark);
    const resize = new ResizeObserver(mark);
    for (const element of [rail, ...pills]) resize.observe(element);
    return () => {
      rail.removeEventListener("scroll", unmark);
      rail.removeEventListener("scrollend", mark);
      resize.disconnect();
      unmark();
    };
  }, [masked, categories]);

  // Une flèche arrivée au bout s'efface : le focus passe à l'autre plutôt
  // que de tomber sur la page. Avant que la page se repeigne : une fois la
  // flèche cachée, le navigateur lui a déjà retiré le focus.
  useLayoutEffect(() => {
    const { start, end } = arrows.current;
    if (!masked.start && document.activeElement === start) end?.focus();
    if (!masked.end && document.activeElement === end) start?.focus();
  }, [masked]);

  // Toujours rendues, cachées hors des thèmes qui les montrent : montées après
  // la mesure, elles décaleraient les pastilles une fois la page peinte.
  const arrow = (side: "start" | "end") => (
    <button
      ref={(element) => {
        arrows.current[side] = element;
      }}
      type="button"
      data-side={side}
      data-idle={!masked[side] || undefined}
      aria-label={side === "start" ? "Catégories précédentes" : "Catégories suivantes"}
      onClick={() => {
        const rail = railRef.current;
        if (!rail) return;
        rail.scrollBy({
          left: (side === "start" ? -1 : 1) * rail.clientWidth * RAIL_STEP,
          behavior: scrollBehavior(),
        });
      }}
      className="rail-arrow hidden size-11 shrink-0 place-items-center rounded-full border border-hairline text-muted transition-colors hover:text-foreground"
    >
      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
        <path d={side === "start" ? "M10 4l-4 4 4 4" : "M6 4l4 4-4 4"} />
      </svg>
    </button>
  );

  return (
    <nav aria-label="Catégories" data-category-nav className={`sticky z-20 border-b border-hairline bg-background ${embedded ? "top-12" : "top-0"}`}>
      <div className="rail-row mx-auto flex max-w-2xl items-center gap-2 px-5 lg:max-w-5xl lg:gap-3 lg:px-10">
        {arrow("start")}
        {/* Le fondu des bords signale le défilement ; la marge intérieure qui
            l'égale garde la première et la dernière pastille hors du fondu
            tant que le rail est au repos. À droite, le rail ne déborde pas
            sous le bouton clair/sombre quand il est là. */}
        <div
          ref={railRef}
          data-more-start={masked.start || undefined}
          data-more-end={masked.end || undefined}
          className={`category-rail no-scrollbar ${themeLocked ? "-mx-3" : "-ml-3"} flex flex-1 gap-2 overflow-x-auto px-3 py-1.5 lg:gap-3 lg:py-4 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]`}
        >
          {categories.map(({ id, name }) => {
            const active = id === activeId;
            return (
              <SectionLink
                key={id}
                sectionId={id}
                data-category={id}
                aria-current={active ? "location" : undefined}
                onJump={() => track("categorie")}
                // Au clavier, la pastille atteinte vient au milieu du rail.
                onFocus={(event) => railRef.current && centerInRail(railRef.current, event.currentTarget)}
                // Une bordure des deux côtés, transparente sur la pastille
                // active : sans elle, chaque changement de section décalait
                // les voisines de 2 px. bg-origin-border : le dégradé passe
                // sous la bordure au lieu d'y répéter son autre bout.
                className={`min-h-11 shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition-all max-[359px]:px-3 max-[359px]:text-[13px] max-[339px]:px-2.5 lg:px-5 lg:py-3 lg:text-base ${
                  active
                    ? "ember-gradient border-transparent bg-origin-border text-background shadow-[0_0_18px_color-mix(in_srgb,var(--ember-2)_35%,transparent)]"
                    : "border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                }`}
              >
                {name}
              </SectionLink>
            );
          })}
        </div>
        {arrow("end")}
        {/* Au téléphone, il passe en pied de page (MenuFooter) : ici il
            rognait les pastilles. */}
        {!themeLocked && <ThemeToggle className="shrink-0 max-sm:hidden" />}
      </div>
      <div
        aria-hidden
        className="rail-progress ember-gradient h-0.5 origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  );
}

/** Amène une pastille au milieu du rail, sans toucher au défilement de la page. */
function centerInRail(rail: HTMLElement, pill: HTMLElement) {
  /*
   * scrollIntoView ferait défiler TOUS les conteneurs défilables, document
   * compris : pendant un saut d'ancre, le scroll-spy s'allume à chaque
   * section traversée et chacun de ces appels annulait le saut en cours —
   * on n'arrivait jamais plus loin que la catégorie voisine. Ici on ne
   * touche qu'au défilement horizontal du rail.
   */
  const railBox = rail.getBoundingClientRect();
  const pillBox = pill.getBoundingClientRect();
  const offset =
    pillBox.left - railBox.left - (railBox.width - pillBox.width) / 2;
  rail.scrollTo({ left: rail.scrollLeft + offset, behavior: "smooth" });
}
