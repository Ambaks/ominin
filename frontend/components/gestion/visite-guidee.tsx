"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { GestionState } from "@/lib/gestion/types";
import {
  texte,
  type Visite,
  type VisiteId,
  type VisiteStep,
} from "@/lib/gestion/visites";
import { ChevronDownIcon, XIcon } from "./icons";

/*
 * La visite d'une page. Montée tant que la page en a une, elle surveille
 * quelles étapes ont leur cible à l'écran — et le dit au shell, qui n'affiche
 * le bouton « ? » qu'alors. Ouverte, c'est un dialogue modal natif (le reste
 * de la page devient inerte, Échap la passe) qui assombrit tout sauf la
 * cible, et pose la carte d'explication à côté d'elle. Le halo glisse d'une
 * cible à l'autre et suit la sienne quand la page défile ou se redimensionne,
 * puis se tient immobile.
 */

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

interface Spot {
  top: number;
  left: number;
}

/** Marge du halo autour de la cible, et écart entre le halo et la carte. */
const HALO_PX = 6;
const GAP_PX = 12;
/** Marge d'écran de la carte, sur ses côtés comme dans sa largeur. */
const EDGE_PX = 16;
/** Glissement du halo d'une cible à la suivante. */
const SLIDE_MS = 320;

/** Focus posé par la visite : sans faire défiler, sans anneau (Chrome et
 *  Firefox ; le type DOM de TypeScript ne connaît pas encore focusVisible). */
const QUIET_FOCUS = {
  preventScroll: true,
  focusVisible: false,
} as FocusOptions;

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1";
const TEXT_BUTTON_CLASS = `-mx-2 min-h-11 whitespace-nowrap rounded-full px-2 text-sm font-medium text-muted transition-colors hover:text-foreground lg:pointer-fine:min-h-9 ${FOCUS_RING}`;

const ease = (t: number) => 1 - (1 - t) ** 3;

/**
 * Premier élément marqué qui occupe de la place : la barre latérale et la
 * barre du bas portent les mêmes repères, une seule est affichée.
 */
function findTarget(key: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(
    `[data-visite~="${key}"]`
  )) {
    if (element.getClientRects().length > 0) return element;
  }
  return null;
}

/** Dans l'en-tête ou une barre fixe : toujours à l'écran, rien à faire défiler. */
function isPinned(element: HTMLElement): boolean {
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    const { position } = getComputedStyle(node);
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Bande d'écran libre entre l'en-tête collé et la barre du bas (marqués
 * data-visite-bord) : une cible qu'on fait défiler s'y arrête, jamais dessous.
 */
function freeBand(): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  for (const edge of document.querySelectorAll<HTMLElement>(
    "[data-visite-bord]"
  )) {
    if (edge.getClientRects().length === 0) continue;
    const rect = edge.getBoundingClientRect();
    if (edge.dataset.visiteBord === "haut") top = Math.max(top, rect.bottom);
    else bottom = Math.min(bottom, rect.top);
  }
  return { top, bottom };
}

/**
 * Défilement qui montre la cible avec, dessous, la place de la carte : le
 * bloc se centre entre l'en-tête et le bord d'écran. Trop haut pour y tenir,
 * la carte passe au-dessus, sur l'en-tête, si la cible tient entière dessous ;
 * sinon c'est la fin de la cible qui se montre — là où sont ses boutons —,
 * la carte se rangeant du côté où elle la couvre le moins.
 */
function fitDistance(target: HTMLElement, cardHeight: number): number {
  const rect = target.getBoundingClientRect();
  const band = freeBand();
  // La carte peut couvrir la barre du bas : la place se compte jusqu'au bord
  // d'écran, comme pour la poser (placeCard).
  const room = window.innerHeight - EDGE_PX - band.top;
  const block = rect.height + HALO_PX * 2 + GAP_PX + cardHeight;
  const underCard = EDGE_PX + cardHeight + GAP_PX + HALO_PX;
  const top =
    block <= room
      ? band.top + (room - block) / 2 + HALO_PX
      : underCard + rect.height + HALO_PX <= band.bottom
        ? underCard
        : band.bottom - HALO_PX - EDGE_PX - rect.height;
  return rect.top - top;
}

/**
 * Halo de la cible, rentré dans la bande visible : l'écran pour une cible
 * collée (en-tête, barres), la bande libre sous l'en-tête pour une cible de
 * la page — trop grande, elle n'en éclaire pas les boutons par-dessus. Une
 * bande de toute la largeur (une rangée de pastilles qui déborde et défile)
 * est cernée au ras de ses côtés, et la barre du bas, collée, au ras de tous
 * ses bords : une marge y montrerait la page qui défile dessous. Un repère
 * posé sur une enveloppe sans coins prend ceux de la carte qu'il enveloppe.
 */
function haloOf(element: HTMLElement, pinned: boolean): Box {
  const child =
    element.childElementCount === 1 ? element.firstElementChild : null;
  const strip =
    child instanceof HTMLElement && child.scrollWidth > child.clientWidth
      ? child
      : element;
  const rect = strip.getBoundingClientRect();
  const viewport = document.documentElement.clientWidth;
  const band = pinned ? { top: 0, bottom: window.innerHeight } : freeBand();
  const pad = rect.width >= viewport ? 0 : HALO_PX;
  const padY = pad || pinned ? pad : HALO_PX;
  const corner = (node: Element) =>
    parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
  const radius = pad
    ? (corner(element) || (child ? corner(child) : 0)) + pad
    : 0;
  const top = Math.max(rect.top - padY, band.top);
  // Le cerne et sa lueur restent à l'écran, sauf pour une bande de bord à bord.
  const edge = pad ? EDGE_PX - HALO_PX : 0;
  const left = Math.max(rect.left - pad, edge);
  const bottom = Math.min(rect.bottom + padY, band.bottom);
  const right = Math.min(rect.right + pad, viewport - edge);
  const width = Math.max(right - left, 0);
  const height = Math.max(bottom - top, 0);
  // Rayon borné à la demi-taille du halo : une pilule (rounded-full) donne un
  // rayon démesuré, qui gonflerait le halo en dôme pendant le glissement, et
  // un halo rentré dans la bande peut être plus petit que sa cible.
  return {
    top,
    left,
    width,
    height,
    radius: Math.min(radius, width / 2, height / 2),
  };
}

/** Point au centre d'une boîte (de l'écran par défaut) : le voile couvre tout. */
const centre = (
  box: Box = {
    top: 0,
    left: 0,
    width: document.documentElement.clientWidth,
    height: window.innerHeight,
    radius: 0,
  }
): Box => ({
  top: box.top + box.height / 2,
  left: box.left + box.width / 2,
  width: 0,
  height: 0,
  radius: 0,
});

const mix = (a: Box, b: Box, t: number): Box => ({
  top: a.top + (b.top - a.top) * t,
  left: a.left + (b.left - a.left) * t,
  width: a.width + (b.width - a.width) * t,
  height: a.height + (b.height - a.height) * t,
  radius: a.radius + (b.radius - a.radius) * t,
});

const sameBox = (a: Box, b: Box) =>
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height &&
  a.radius === b.radius;

/**
 * Halo rogné là où une carte, faute de place à côté, se pose sur la cible :
 * le cerne ne passe jamais sous la carte.
 */
function clipUnder(box: Box, cardTop: number, cardHeight: number): Box {
  const cardBottom = cardTop + cardHeight;
  const bottom = box.top + box.height;
  const cardAbove = cardTop + cardHeight / 2 < box.top + box.height / 2;
  const top = cardAbove ? Math.max(box.top, cardBottom + GAP_PX) : box.top;
  const end = cardAbove ? bottom : Math.min(bottom, cardTop - GAP_PX);
  const height = Math.max(end - top, 0);
  return {
    ...box,
    top,
    height,
    radius: Math.min(box.radius, box.width / 2, height / 2),
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Place la carte (w × h) près du halo : dessous ou dessus d'abord — à droite
 * d'abord pour la barre latérale. Sinon elle se range en haut ou en bas de
 * l'écran, là où elle couvre le moins la cible.
 */
function placeCard(
  halo: Box | null,
  w: number,
  h: number,
  side?: boolean
): Spot & { docked: boolean } {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  if (!halo) return { top: (vh - h) / 2, left: (vw - w) / 2, docked: false };

  const centeredLeft = clamp(
    halo.left + (halo.width - w) / 2,
    EDGE_PX,
    vw - EDGE_PX - w
  );
  const centeredTop = clamp(
    halo.top + (halo.height - h) / 2,
    EDGE_PX,
    vh - EDGE_PX - h
  );
  const below = {
    top: halo.top + halo.height + GAP_PX,
    left: centeredLeft,
    docked: false,
  };
  // Posée sur l'en-tête collé, la carte le couvre jusqu'au bord d'écran
  // plutôt que d'en laisser dépasser la moitié d'une ligne.
  const aboveTop = halo.top - GAP_PX - h;
  const above = {
    top: aboveTop >= EDGE_PX && aboveTop < freeBand().top ? EDGE_PX : aboveTop,
    left: centeredLeft,
    docked: false,
  };
  const right = {
    top: centeredTop,
    left: halo.left + halo.width + GAP_PX,
    docked: false,
  };
  const left = {
    top: centeredTop,
    left: halo.left - GAP_PX - w,
    docked: false,
  };
  const fits = (spot: Spot) =>
    spot.top >= EDGE_PX &&
    spot.top + h <= vh - EDGE_PX &&
    spot.left >= EDGE_PX &&
    spot.left + w <= vw - EDGE_PX;

  const overlap = (top: number) =>
    Math.max(
      0,
      Math.min(top + h, halo.top + halo.height) - Math.max(top, halo.top)
    );
  const docked = [EDGE_PX, vh - EDGE_PX - h].reduce((best, top) =>
    overlap(top) < overlap(best) ? top : best
  );
  return (
    (side ? [right, below, above, left] : [below, above, right, left]).find(
      fits
    ) ?? {
      top: docked,
      left: (vw - w) / 2,
      docked: true,
    }
  );
}

/**
 * Fin d'une visite : vue (suivie jusqu'au bout, ou passée), toutes (la
 * visite d'accueil passée coupe aussi celles des pages), ou plus tard (le
 * geste montré a été fait depuis la carte, ou l'accueil remis d'une croix :
 * la visite reviendra à la prochaine ouverture de l'espace).
 */
type VisiteFin = "vue" | "toutes" | "plus-tard";

export function VisiteGuidee({
  visite,
  state,
  open,
  auto,
  onShown,
  onClose,
}: {
  visite: Visite;
  state: GestionState;
  open: boolean;
  /** Ouverte d'elle-même : la passer rappelle où la relancer. */
  auto: boolean;
  /** Visite affichable (une étape au moins à l'écran), ou null. */
  onShown: (id: VisiteId | null) => void;
  onClose: (fin: VisiteFin) => void;
}) {
  const toast = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  // Dernier halo dessiné : la cible suivante part de là.
  const drawnRef = useRef<Box | null>(null);
  // À l'ouverture : où rendre le focus et le défilement en sortant.
  const returnRef = useRef<{ opener: Element | null; scrollY: number } | null>(
    null
  );
  const openRef = useRef(open);
  const stateRef = useRef(state);
  // Fermeture voulue par la visite, et non imposée par le navigateur.
  const closingRef = useRef(false);
  // Étapes dont la cible est à l'écran, relues à chaque changement de la
  // page : une cible peut arriver après coup (le bandeau Stripe attend la
  // réponse de Stripe, l'équipe se charge) ou changer d'élément (rotation
  // d'une tablette : la barre latérale cède la place à celle du bas).
  const [present, setPresent] = useState<VisiteStep[]>([]);
  // Étapes dont le geste est faisable : l'élément qu'il clique est là.
  const [doable, setDoable] = useState<VisiteStep[]>([]);
  // Un contenu encore en chargement dont une étape dépend (le statut Stripe)
  // pose data-visite-attente : la visite ne s'ouvre pas avant.
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState<VisiteStep | null>(null);
  // Étape dont la carte est posée : avant, elle reste masquée.
  const [placed, setPlaced] = useState<VisiteStep | null>(null);

  useEffect(() => {
    openRef.current = open;
    stateRef.current = state;
  }, [open, state]);

  // Avant peinture : à l'arrivée sur une page, son « ? » paraît dans la même
  // image que celui de la page quittée disparaît.
  useLayoutEffect(() => {
    const read = () => {
      const next = visite.steps.filter(
        (step) => !step.target || findTarget(step.target) !== null
      );
      const withAction = next.filter(
        (step) => step.action && findTarget(step.action.target) !== null
      );
      const pending = document.querySelector("[data-visite-attente]") !== null;
      const keep = (previous: VisiteStep[], list: VisiteStep[]) =>
        previous.length === list.length &&
        previous.every((step, i) => step === list[i])
          ? previous
          : list;
      setPresent((previous) => keep(previous, next));
      setDoable((previous) => keep(previous, withAction));
      setWaiting(pending);
      const applicable = next.filter(
        (step) => !step.when || step.when(stateRef.current)
      );
      // L'étape d'arrivée est fixée dès l'ouverture : une cible venue plus
      // tard ne la fait pas reculer.
      if (openRef.current && !pending)
        setCurrent((step) => step ?? applicable[0] ?? null);
      // En attente, le « ? » ne s'offre pas : il ne pourrait rien ouvrir.
      onShown(applicable.length > 0 && !pending ? visite.id : null);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
      onShown(null);
    };
  }, [visite, onShown]);

  const applicable = present.filter(
    (candidate) => !candidate.when || candidate.when(state)
  );
  const step =
    open && (current || !waiting) ? (current ?? applicable[0]) : undefined;
  const steps = visite.steps.filter(
    (candidate) => candidate === step || applicable.includes(candidate)
  );
  const index = step ? steps.indexOf(step) : -1;
  const action = step && doable.includes(step) ? step.action : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!step || !dialog || dialog.open) return;
    // Ouverte d'elle-même à l'arrivée, elle rend le haut de la page : le
    // défilement lu ici peut encore être celui de la page quittée (la
    // navigation défile en douceur).
    returnRef.current = {
      opener: document.activeElement,
      scrollY: auto ? 0 : window.scrollY,
    };
    closingRef.current = false;
    dialog.showModal();
  }, [step, auto]);

  // Le halo va à la cible puis la suit, image par image, tant que quelque
  // chose bouge (défilement, redimensionnement) ; immobile, la boucle
  // s'arrête jusqu'au prochain mouvement. Les positions s'écrivent
  // directement sur les éléments, dans l'image même où elles sont mesurées.
  //
  // Une cible déjà en place (visible, la carte trouvant sa place à côté)
  // reçoit le halo qui glisse. Sinon il se referme sur lui-même, la page
  // saute sous le voile, et il se rouvre depuis le centre de la cible : rien
  // d'autre n'est éclairé en chemin. La carte paraît le halo ouvert.
  useEffect(() => {
    if (!step) return;
    // Carte encore masquée : le dialogue garde le focus, les flèches du
    // clavier ne se perdent pas.
    dialogRef.current?.focus(QUIET_FOCUS);
    if (haloRef.current) haloRef.current.style.cursor = "";
    let target = step.target ? findTarget(step.target) : null;
    let pinned = target !== null && isPinned(target);
    const slide = prefersReducedMotion() ? 0 : SLIDE_MS;
    let phase: "depart" | "fermeture" | "ouverture" | "suivi" = "depart";
    let from = drawnRef.current ?? centre();
    let start = 0;
    // Position de la cible dans la page au départ (le défilement ne la change
    // pas) : si la mise en page la déplace ensuite — un bandeau qui part, un
    // contenu qui arrive —, l'étape se recale, une fois.
    // Un écran qui tourne ou se redimensionne en accorde un de plus.
    // La page est verrouillée pendant la visite : un défilement qui n'est pas
    // le sien (le retour en haut d'une navigation) la recale aussi.
    let pageTop: number | null = null;
    let ownScrollY = window.scrollY;
    let refitted = false;
    // Recalage en cours, carte affichée : elle ne se masque que si la page
    // doit sauter.
    let refitting = false;
    let frame = 0;
    const resized = new ResizeObserver(() => wake());
    const tick = (now: number) => {
      frame = 0;
      const card = cardRef.current;
      const haloElement = haloRef.current;
      if (!card || !haloElement) {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (
        step.target &&
        (!target?.isConnected || target.getClientRects().length === 0)
      ) {
        const found = findTarget(step.target);
        if (found !== target) {
          if (target) resized.unobserve(target);
          if (found) resized.observe(found);
          target = found;
          pinned = found !== null && isPinned(found);
        }
      }
      // La page saute sous le voile ; le halo se rouvrira depuis la cible.
      const jump = () => {
        if (target) {
          window.scrollBy({
            top: fitDistance(target, card.offsetHeight),
            behavior: "instant",
          });
          ownScrollY = window.scrollY;
          from = centre(haloOf(target, pinned));
        } else {
          from = centre(from);
        }
        start = now;
        phase = "ouverture";
      };
      if (phase === "depart") {
        start = now;
        const rect = target?.getBoundingClientRect();
        pageTop = rect ? rect.top + window.scrollY : null;
        ownScrollY = window.scrollY;
        const band = freeBand();
        const inPlace =
          !target ||
          pinned ||
          (rect !== undefined &&
            rect.top - HALO_PX >= band.top &&
            rect.bottom + HALO_PX <= band.bottom &&
            !placeCard(
              haloOf(target, pinned),
              card.offsetWidth,
              card.offsetHeight,
              step.side
            ).docked);
        if (!inPlace && refitting) setPlaced(null);
        refitting = false;
        if (inPlace) phase = "ouverture";
        else if (slide && from.width > 0 && from.height > 0)
          phase = "fermeture";
        else jump();
      }
      const progressAt = () => (slide ? Math.min((now - start) / slide, 1) : 1);
      if (phase === "fermeture" && progressAt() === 1) jump();
      const progress = progressAt();
      const end = target ? haloOf(target, pinned) : null;
      const goal = phase === "fermeture" ? centre(from) : (end ?? centre());
      const spot = placeCard(
        end,
        card.offsetWidth,
        card.offsetHeight,
        step.side
      );
      const shape = phase === "suivi" ? goal : mix(from, goal, ease(progress));
      const halo =
        spot.docked && end && phase !== "fermeture"
          ? clipUnder(shape, spot.top, card.offsetHeight)
          : shape;
      const drawn = drawnRef.current;
      drawnRef.current = halo;
      Object.assign(haloElement.style, {
        top: `${halo.top}px`,
        left: `${halo.left}px`,
        width: `${halo.width}px`,
        height: `${halo.height}px`,
        borderRadius: `${halo.radius}px`,
      });
      // Sans cible, ou halo réduit à un trait (cible passée sous l'en-tête) :
      // le voile seul, sans braise.
      haloElement.toggleAttribute(
        "data-centre",
        end === null || halo.width < 1 || halo.height < 1
      );
      card.style.top = `${spot.top}px`;
      card.style.left = `${spot.left}px`;
      const rect = target && !pinned ? target.getBoundingClientRect() : null;
      if (
        !refitted &&
        phase !== "fermeture" &&
        rect !== null &&
        pageTop !== null &&
        (Math.round(rect.top + window.scrollY) !== Math.round(pageTop) ||
          Math.round(window.scrollY) !== Math.round(ownScrollY))
      ) {
        refitted = true;
        refitting = true;
        phase = "depart";
        from = halo;
      }
      if (phase === "ouverture" && progress === 1) {
        phase = "suivi";
        setPlaced(step);
      }
      if (phase !== "suivi" || !drawn || !sameBox(drawn, halo)) {
        frame = requestAnimationFrame(tick);
      }
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const viewportChanged = () => {
      refitted = false;
      wake();
    };
    wake();
    // Le corps grandit avec le contenu (html, lui, a la hauteur de l'écran) :
    // une image ou une police qui pousse la page réveille la boucle.
    resized.observe(document.body);
    if (target) resized.observe(target);
    if (cardRef.current) resized.observe(cardRef.current);
    const mutated = new MutationObserver(wake);
    mutated.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", wake, { capture: true, passive: true });
    window.addEventListener("resize", viewportChanged);
    return () => {
      cancelAnimationFrame(frame);
      resized.disconnect();
      mutated.disconnect();
      window.removeEventListener("scroll", wake, { capture: true });
      window.removeEventListener("resize", viewportChanged);
    };
  }, [step]);

  // Une carte masquée ne prend pas le focus : on attend qu'elle soit posée.
  // Sans anneau à l'arrivée (focusVisible, Chrome et Firefox) : la souris
  // n'en a pas besoin, le clavier le retrouve à la touche suivante.
  const isPlaced = step !== undefined && placed === step;
  useEffect(() => {
    if (isPlaced) primaryRef.current?.focus(QUIET_FOCUS);
  }, [isPlaced, step]);

  if (!step) return null;

  const last = index === steps.length - 1;
  // Défilement et focus rendus, sauf quand un geste emmène ailleurs.
  const close = (fin: VisiteFin, restore = true) => {
    closingRef.current = true;
    dialogRef.current?.close();
    const back = returnRef.current;
    if (restore && back) {
      window.scrollTo({ top: back.scrollY, behavior: "instant" });
      // Ouverte d'elle-même, la visite n'avait pas d'origine : le focus va au
      // « ? » qui la relance.
      const opener =
        back.opener instanceof HTMLElement && back.opener !== document.body
          ? back.opener
          : findTarget("aide");
      opener?.focus({ preventScroll: true });
    }
    setCurrent(null);
    setPlaced(null);
    drawnRef.current = null;
    onClose(fin);
  };
  // Passer : la dernière étape atteinte, c'est une visite vue jusqu'au bout.
  // Sur la première carte de l'accueil, « Passer les visites » ne veut d'aucune
  // visite ; la croix ou Échap remettent seulement à plus tard.
  const skip = (all = false) => {
    if (last) {
      close("vue");
    } else if (auto && visite.id === "bienvenue" && index === 0) {
      if (!all) {
        close("plus-tard");
        return;
      }
      toast.success(
        "Visites guidées désactivées. Le bouton « ? » en haut de l’écran relance celle de la page où vous êtes."
      );
      close("toutes");
    } else {
      if (auto) {
        toast.success(
          "Visite passée. Le bouton « ? » en haut de l’écran la relance à tout moment."
        );
      }
      close("vue");
    }
  };
  const refocus = () =>
    requestAnimationFrame(() => {
      if (document.activeElement === document.body)
        dialogRef.current?.focus(QUIET_FOCUS);
    });
  const go = (delta: 1 | -1) => {
    const next = steps[index + delta];
    if (next) {
      setCurrent(next);
      setPlaced(null);
    } else if (delta === 1) {
      close("vue");
    }
  };
  // Le geste montré, fait depuis la carte ou sur l'élément éclairé : la page
  // redevient active, puis l'élément marqué reçoit le focus — c'est lui qui
  // le retrouve quand la feuille qu'il ouvre se ferme — et le clic. Fait en
  // cours de visite, il la remet à la session suivante ; à la dernière carte,
  // la visite est vue. L'élément parti entre-temps, la visite continue.
  const act = (target: string) => {
    const element = findTarget(target);
    if (!element) {
      go(1);
      return;
    }
    close(last ? "vue" : "plus-tard", false);
    element.focus(QUIET_FOCUS);
    element.click();
  };
  // L'élément éclairé du geste se touche comme le bouton de la carte.
  const overAction = (event: React.MouseEvent) => {
    if (!action) return false;
    const rect = findTarget(action.target)?.getBoundingClientRect();
    return Boolean(
      rect &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="visite-titre"
      aria-describedby="visite-texte"
      onCancel={(event) => {
        event.preventDefault();
        skip();
      }}
      // Une fermeture que la visite n'a pas demandée — le navigateur peut
      // fermer sans annulation possible, faute de geste depuis le dernier
      // Échap — reste une visite passée.
      onClose={() => {
        if (!closingRef.current) skip();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(1);
        if (event.key === "ArrowLeft") go(-1);
      }}
      // Un appui abandonné sur le bouton du geste (lâché ailleurs, ou un
      // glissé) le laisse sans focus : le dialogue le reprend, pour le clavier.
      onPointerUp={refocus}
      onPointerCancel={refocus}
      tabIndex={-1}
      className="visite fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-transparent p-0 text-foreground outline-none backdrop:bg-transparent"
    >
      {/* Sans cible au départ : la boucle pose la suite directement. */}
      <div
        ref={haloRef}
        aria-hidden
        data-centre=""
        className="visite-halo absolute"
        onPointerMove={(event) => {
          event.currentTarget.style.cursor = overAction(event) ? "pointer" : "";
        }}
        onClick={(event) => {
          if (action && overAction(event)) act(action.target);
        }}
      />

      <div
        key={visite.steps.indexOf(step)}
        ref={cardRef}
        className={`absolute flex touch-pan-y flex-col gap-3 overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-surface-raised p-5 shadow-2xl [@media(max-height:44rem)]:gap-2 [@media(max-height:44rem)]:p-4 [@media(max-height:30rem)]:gap-1.5 [@media(max-height:30rem)]:p-3 ${
          isPlaced ? "visite-card" : ""
        }`}
        style={{
          width: `min(22rem, calc(100vw - ${EDGE_PX * 2}px))`,
          maxHeight: `calc(100dvh - ${EDGE_PX * 2}px)`,
          visibility: isPlaced ? undefined : "hidden",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p
              id="visite-etape"
              className="ember-text text-[10px] font-semibold uppercase tracking-[0.28em]"
            >
              Visite guidée
              <span className="sr-only">
                , étape {index + 1} sur {steps.length}
              </span>
            </p>
            {steps.length > 1 && (
              <span aria-hidden className="flex items-center gap-1">
                {steps.map((dot, i) => (
                  <span
                    key={visite.steps.indexOf(dot)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? "w-4 bg-ember-2"
                        : i < index
                          ? "w-1.5 bg-ember-2/50"
                          : "w-1.5 bg-muted/35"
                    }`}
                  />
                ))}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => skip()}
            aria-label="Fermer la visite"
            className={`-m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-foreground lg:pointer-fine:size-9 ${FOCUS_RING}`}
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <h2
          id="visite-titre"
          className="font-display text-lg font-medium leading-snug [@media(max-height:30rem)]:text-base"
        >
          {texte(step.title, state)}
        </h2>
        <p
          id="visite-texte"
          className="whitespace-pre-line text-sm leading-relaxed text-muted"
        >
          {texte(step.body, state)}
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          {action ? (
            <button
              type="button"
              onClick={last ? () => close("vue") : () => go(1)}
              className={TEXT_BUTTON_CLASS}
            >
              {last ? "Terminer" : "Pas maintenant"}
            </button>
          ) : last ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={() => skip(true)}
              className={TEXT_BUTTON_CLASS}
            >
              {auto && visite.id === "bienvenue" && index === 0
                ? "Passer les visites"
                : "Passer la visite"}
            </button>
          )}
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Étape précédente"
                className={`flex size-11 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-ember-2/40 hover:text-foreground lg:pointer-fine:size-9 ${FOCUS_RING}`}
              >
                <ChevronDownIcon className="size-4 rotate-90" />
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              // Focalisé par la visite, le bouton ne garderait pas trace d'un
              // appui : Chrome mettrait alors un anneau sur la feuille que
              // son geste ouvre. Lâché à l'appui, il reprend un focus de
              // pointeur.
              onPointerDown={
                action ? (event) => event.currentTarget.blur() : undefined
              }
              // Le focus qui arrive sur le bouton coupe la lecture : il porte
              // lui-même le numéro, le titre et le texte de l'étape.
              aria-describedby="visite-etape visite-titre visite-texte"
              onClick={action ? () => act(action.target) : () => go(1)}
              className={`ember-gradient min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-semibold text-background lg:pointer-fine:min-h-9 ${FOCUS_RING}`}
            >
              {action?.label ??
                (last ? "Terminer" : step.target ? "Suivant" : "C’est parti")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
