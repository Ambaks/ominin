"use client";

import { useEffect, useRef, useState } from "react";
import { focusSectionHeading } from "@/components/menu/carte-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useCart } from "@/lib/menu/cart";
import { typographie } from "@/lib/menu-data";

interface CategoryLink {
  id: string;
  name: string;
}

export function CategoryNav({
  categories,
  embedded,
  themeLocked,
}: {
  categories: CategoryLink[];
  embedded?: boolean;
  /** Palette d'établissement verrouillée (.theme-<slug>) : le basculement
      clair/sombre n'aurait aucun effet visible, on n'affiche pas le bouton. */
  themeLocked?: boolean;
}) {
  const { track } = useCart();
  // Aucun onglet en cours tant que la carte n'a pas commencé (l'affiche, les
  // offres) : « À partager » souligné au-dessus d'elles disait faux.
  const [activeId, setActiveId] = useState<string>();
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  /*
   * L'onglet de la section en cours : la dernière dont le haut a franchi une
   * bande fine sous la barre. Pas seulement celle qui traverse la bande : un
   * saut (touche Fin, recherche dans la page, défilement restauré) passe
   * par-dessus les sections, et en bas de page le pied occupe seul la bande —
   * il est observé aussi, pour que ce saut-là soit vu. Avant la première
   * section, aucune.
   */
  useEffect(() => {
    const sections = categories
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const line = entries[0].rootBounds?.bottom ?? 0;
        const current = [...sections]
          .reverse()
          .find((el) => el.getBoundingClientRect().top <= line);
        setActiveId(current?.id);
      },
      { rootMargin: "-15% 0px -80% 0px" }
    );
    for (const el of sections) observer.observe(el);
    const footer = railRef.current?.closest("[data-menu-root]")?.querySelector("footer");
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [categories]);

  // Gradient progress bar tracking page scroll
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /*
   * Centre une pastille dans le rail. scrollIntoView ferait défiler TOUS les
   * conteneurs défilables, document compris : pendant un saut d'ancre, le
   * scroll-spy s'allume à chaque section traversée et chacun de ces appels
   * annulait le saut en cours — on n'arrivait jamais plus loin que la
   * catégorie voisine. Ici on ne touche qu'au défilement horizontal du rail.
   */
  const centerInRail = (pill: HTMLElement) => {
    const rail = railRef.current;
    if (!rail) return;
    const railBox = rail.getBoundingClientRect();
    const pillBox = pill.getBoundingClientRect();
    const offset =
      pillBox.left - railBox.left - (railBox.width - pillBox.width) / 2;
    rail.scrollTo({
      left: rail.scrollLeft + offset,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  /*
   * Le rail déborde (douze onglets sur un portable) : à la souris, sans barre
   * de défilement ni geste de balayage, les derniers restaient hors d'atteinte
   * — les chichas, en bout de carte. Une flèche de chaque côté où il reste des
   * onglets cachés ; au doigt, le rail se balaie, elles n'y paraissent pas.
   */
  const [hidden, setHidden] = useState({ start: false, end: false });
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const update = () =>
      setHidden({
        start: rail.scrollLeft > 1,
        end: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 1,
      });
    update();
    rail.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // La flèche amène au centre le premier onglet caché de son côté.
  const reveal = (side: "start" | "end") => {
    const rail = railRef.current;
    if (!rail) return;
    const box = rail.getBoundingClientRect();
    const links = [...rail.querySelectorAll<HTMLElement>("a[data-category]")];
    const target =
      side === "end"
        ? links.find((link) => link.getBoundingClientRect().right > box.right + 1)
        : links.findLast((link) => link.getBoundingClientRect().left < box.left - 1);
    if (target) centerInRail(target);
  };

  // Keep the active pill visible in the horizontal rail.
  useEffect(() => {
    const pill = activeId
      ? railRef.current?.querySelector<HTMLElement>(`[data-category="${activeId}"]`)
      : null;
    if (pill) centerInRail(pill);
  }, [activeId]);

  return (
    <nav
      aria-label="Catégories de la carte"
      className={`sticky z-20 border-b border-hairline bg-background ${embedded ? "top-12" : "top-0"}`}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-5 lg:max-w-5xl lg:gap-3 lg:px-10">
        {/* Le fondu des bords signale le défilement ; la marge intérieure qui
            l'égale garde la première et la dernière pastille hors du fondu
            tant que le rail est au repos. À droite, le rail ne déborde pas
            sous le bouton clair/sombre quand il est là. */}
        <div className="relative flex min-w-0 flex-1">
          <div
            ref={railRef}
            className={`category-rail no-scrollbar ${themeLocked ? "-mx-3" : "-ml-3"} flex flex-1 gap-2 overflow-x-auto px-3 py-1.5 lg:gap-3 lg:py-4 [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)]`}
          >
            {categories.map(({ id, name }) => {
              const active = id === activeId;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  data-category={id}
                  aria-current={active ? "location" : undefined}
                  // Au clavier, l'onglet atteint vient au centre du rail : sous
                  // le fondu des bords, il restait à moitié caché.
                  onFocus={(event) => centerInRail(event.currentTarget)}
                  onClick={(event) => {
                    track("categorie");
                    const section = document.getElementById(id);
                    if (!section) return;
                    /*
                     * Pas de navigation d'ancre native : elle empilait une entrée
                     * d'historique sans état, sur laquelle le « Retour » d'une
                     * feuille (voir Sheet) faisait recharger la page — le panier
                     * ouvert disparaissait. On défile, et le focus suit la section
                     * (son titre), comme l'aurait fait l'ancre. L'adresse ne garde
                     * aucune ancre : une restauration de défilement y ramènerait.
                     */
                    event.preventDefault();
                    section.scrollIntoView({
                      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                        ? "auto"
                        : "smooth",
                    });
                    focusSectionHeading(section);
                  }}
                  className={`min-h-11 shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition-all max-[359px]:px-3 max-[359px]:text-[13px] max-[339px]:px-2.5 lg:px-5 lg:py-3 lg:text-base ${
                    active
                      ? "ember-gradient text-background shadow-[0_0_18px_color-mix(in_srgb,var(--ember-2)_35%,transparent)]"
                      : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
                  }`}
                >
                  {typographie(name)}
                </a>
              );
            })}
          </div>
          {(["start", "end"] as const).map(
            (side) =>
              hidden[side] && (
                <button
                  key={side}
                  type="button"
                  // Au clavier, la tabulation parcourt déjà les onglets.
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => reveal(side)}
                  className={`absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-background text-muted shadow-md transition-colors hover:text-foreground pointer-fine:flex ${
                    side === "start" ? "-left-3" : "-right-3"
                  }`}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`size-4 ${side === "start" ? "rotate-180" : ""}`}
                  >
                    <path d="M6 3.5 10.5 8 6 12.5" />
                  </svg>
                </button>
              )
          )}
        </div>
        {/* Au téléphone, il passe en pied de page (MenuFooter) : ici il
            rognait les pastilles. */}
        {!themeLocked && <ThemeToggle className="shrink-0 max-sm:hidden" />}
      </div>
      <div
        aria-hidden
        className="ember-gradient h-0.5 origin-left transition-transform duration-150 ease-out"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  );
}
