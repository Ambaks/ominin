"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { scrollBehavior } from "@/lib/menu/scroll";

/**
 * Lien vers une section de la carte, rejointe sans ancre dans l'historique :
 * la feuille d'un plat se referme par un retour (history.back), et Chrome
 * rejouait alors le saut vers la section touchée — le plat commandé partait
 * hors de l'écran. Le focus va au titre de la section (l'ancre y portait au
 * moins le départ de Tab) : sans lui, Tab repartait de la barre des
 * catégories, et le lecteur d'écran y restait. Le href reste pour un nouvel
 * onglet.
 */
export function SectionLink({
  sectionId,
  onJump,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  sectionId: string;
  onJump?: () => void;
}) {
  const jump = (event: MouseEvent<HTMLAnchorElement>) => {
    onJump?.();
    if (!document.getElementById(sectionId) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    jumpToSection(sectionId, event.detail > 0);
  };
  return <a {...props} href={`#${sectionId}`} onClick={jump} />;
}

/** Va à une section et pose le focus sur son titre. behavior : la roue des
 * catégories y saute d'un coup, cachée sous son voile. byPointer : au clavier,
 * l'anneau dit où l'on arrive ; après un toucher, aucun — Safari cerclait le
 * titre à chaque catégorie touchée (globals.css). La marque part avec ce
 * focus : revenu plus tard au clavier, le titre retrouve son anneau. */
export function jumpToSection(sectionId: string, byPointer: boolean, behavior = scrollBehavior()) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({ behavior, block: "start" });
  const heading = section.querySelector<HTMLElement>("h2");
  if (!heading) return;
  heading.tabIndex = -1;
  if (byPointer) {
    heading.setAttribute("data-pointer-focus", "");
    heading.addEventListener("blur", () => heading.removeAttribute("data-pointer-focus"), {
      once: true,
    });
  }
  heading.focus({ preventScroll: true });
}
