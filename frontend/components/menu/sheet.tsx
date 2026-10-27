"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { LiquidOrigin, LiquidSheet } from "./liquid-sheet";
import "./panis-sheets.css";

/**
 * Le réglage de défilement du navigateur avant toute feuille, lu une fois :
 * une feuille ouverte pendant que la précédente se referme le lisait encore
 * à « manual », et l'y laissait en partant.
 */
let pageScrollRestoration: ScrollRestoration | null = null;

/**
 * Le « Retour » d'une feuille qui se referme, tant que son « popstate » n'est
 * pas revenu. Une feuille ouverte dans la foulée (le panier qui cède la place
 * au ticket) l'attend pour empiler son entrée : empilée avant, c'est elle que
 * ce retour dépilait, et elle se refermait aussitôt ouverte.
 */
let pendingBack: Promise<void> | null = null;

/**
 * Les feuilles montées, celles qui descendent comprises. Une feuille
 * empilée sur une autre qui part la verrait rendre en partant le défilement
 * et la page, elle encore ouverte : une feuille qui s'ouvre d'elle-même (le
 * salut du service, aperçu à table) attend qu'il n'y en ait plus.
 */
let mountedSheets = 0;
const sheetListeners = new Set<() => void>();

/** La hauteur de la dernière feuille montée : une feuille en relais (swap) en part. */
let lastSheetHeight: number | null = null;

/*
 * D'une vue à l'autre (la commande, le règlement, le paiement ; le ticket qui
 * prend le relais), la feuille changeait de hauteur d'un coup : son bord
 * sautait de 200 px. Un thème qui déclare --sheet-morph (une durée) et
 * --sheet-morph-easing la fait passer d'une hauteur à l'autre ; sans eux — les
 * autres thèmes, le mouvement réduit —, rien ne change.
 */
const SHEET_MORPH = "sheet-morph";

function morphHeight(panel: HTMLElement, from: number | null) {
  if (!from) return;
  const style = getComputedStyle(panel);
  // La minification réécrit les durées (380ms devient .38s) : l'unité est lue.
  const raw = style.getPropertyValue("--sheet-morph").trim();
  const duration = parseFloat(raw) * (raw.endsWith("ms") ? 1 : 1000);
  if (!duration) return;
  // Une vue qui change en plein glissement : la hauteur visée se mesure sans lui.
  for (const running of panel.getAnimations()) {
    if (running.id === SHEET_MORPH) running.cancel();
  }
  const to = panel.offsetHeight;
  if (to === from) return;
  // Le contenu, plus haut que la feuille le temps qu'elle grandisse, n'y fait
  // pas paraître de barre de défilement.
  const morph = panel.animate(
    [
      { height: `${from}px`, overflowY: "hidden" },
      { height: `${to}px`, overflowY: "hidden" },
    ],
    { duration, easing: style.getPropertyValue("--sheet-morph-easing").trim() || undefined }
  );
  morph.id = SHEET_MORPH;
}

function countSheet(delta: 1 | -1) {
  mountedSheets += delta;
  for (const listener of sheetListeners) listener();
}

const subscribeSheets = (listener: () => void) => {
  sheetListeners.add(listener);
  return () => {
    sheetListeners.delete(listener);
  };
};

/** Vrai quand aucune feuille n'est montée, ni ne descend. */
export function useNoSheet(): boolean {
  return useSyncExternalStore(
    subscribeSheets,
    () => mountedSheets === 0,
    () => true
  );
}

/**
 * Quitter la page en refermant la feuille (le panier vidé par une commande
 * d'aperçu) : le « Retour » qu'elle lance en se démontant annulait la
 * navigation partie avant lui. On part une fois la dernière feuille
 * démontée — son retour est alors lancé — et ce retour revenu.
 */
export function leaveAfterSheet(url: string) {
  const leave = async () => {
    if (mountedSheets > 0) return;
    sheetListeners.delete(leave);
    if (pendingBack) await pendingBack;
    window.location.assign(url);
  };
  sheetListeners.add(leave);
  void leave();
}

/**
 * Une page rechargée alors qu'une feuille était ouverte garde l'entrée
 * d'historique qu'elle avait empilée, en défilement manuel : on la rend
 * ordinaire, sans quoi le navigateur ne rend pas au lecteur sa place.
 */
export function useSheetHistoryReset() {
  useEffect(() => {
    if (!history.state?.ominninSheet) return;
    history.replaceState({ ...history.state, ominninSheet: undefined }, "");
    history.scrollRestoration = "auto";
  }, []);
}

/*
 * Feuille modale du menu — options d'un plat, panier. Pour le clavier et les
 * lecteurs d'écran, elle s'annonce comme dialogue, prend le focus, le garde,
 * le rend à son déclencheur en partant, se ferme par Échap et fige le
 * défilement derrière elle.
 *
 * Rendue à la racine du menu, hors des cartes : un ancêtre transformé (la
 * pression d'un bouton, une animation) deviendrait sinon le bloc conteneur
 * du position: fixed, et la feuille s'ouvrirait hors de l'écran. Pas dans
 * document.body pour autant : la racine porte la classe de thème et les
 * polices de l'établissement, que la feuille perdait.
 *
 * Le double-tap d'un pouce pressé : la feuille apparaît et disparaît sous le
 * doigt, et le second toucher tombait sur ce qu'il y avait dessous — une
 * option cochée en silence, un plat ajouté, le panier ouvert. Elle ignore
 * donc les clics tant qu'elle monte (.sheet-rise) et tant qu'elle descend
 * (.sheet-fall, elle reste montée jusqu'à la fin), ainsi que tout second clic
 * d'une rafale (event.detail > 1, compté par le navigateur) : aucun délai à
 * régler ici — sauf sur le contrôle qui vient d'accepter le premier clic : le
 * « + » du panier se tape en rafale. Mouvement réduit : les deux animations
 * deviennent des fondus de même durée, la garde tient.
 *
 * Ouverte depuis la pastille de fidélité (origin), elle en naît en liquide
 * et s'y vide en partant (liquid-sheet) : la garde tient le temps de la
 * croissance, le fond s'assombrit avec elle. Sans liquide prêt, la montée
 * ordinaire.
 *
 * Deux feuilles peuvent s'empiler (un article offert se compose depuis le
 * panier) : seule celle du dessus répond au clavier, et chacune ne se ferme
 * au « Retour » que si c'est sa propre entrée d'historique qui s'en va.
 */
export function Sheet({
  onClosed,
  backdropCloses,
  labelledBy,
  label,
  enter = "rise",
  origin,
  card = false,
  morphKey,
  children,
}: {
  /** Appelé une fois la feuille descendue. */
  onClosed: () => void;
  /**
   * « swap » : elle remplace une feuille qui vient de partir (le panier cède
   * la place au ticket) — pleine d'emblée, elle ne fait que se poser ; en
   * fondu, le fond restait seul un instant entre les deux. Lu à l'ouverture
   * seulement : changée ensuite, la classe relançait l'entrée.
   */
  enter?: "rise" | "swap";
  /**
   * D'où elle naît et où elle se vide (la pastille), lu à l'ouverture ;
   * fourni seulement quand le liquide est prêt (chargé à part).
   */
  origin?: LiquidOrigin | null;
  /** Toucher le fond ferme-t-il la feuille ? */
  backdropCloses: boolean;
  /**
   * Une fiche posée au milieu de l'écran, téléphone compris, sur un fond à
   * peine voilé : on lit le plat sans perdre la carte de vue.
   */
  card?: boolean;
  /** La vue montrée (étape, paiement) : quand elle change, la hauteur glisse (morphHeight). */
  morphKey?: string;
  labelledBy?: string;
  label?: string;
  /**
   * Reçoit la fermeture animée, à brancher sur Annuler, ×, la validation ;
   * et closing, vrai dès qu'elle descend : ce qu'elle jouait s'arrête là.
   */
  children: (close: () => void, closing: boolean) => ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const settled = useRef(false);
  // Le contrôle du dernier clic accepté : une rafale sur lui-même (« + » du
  // panier tapé trois fois) passe, une rafale qui glisse ailleurs non.
  const lastAccepted = useRef<Element | null>(null);
  const [closing, setClosing] = useState(false);
  const [entrance] = useState(enter);
  const [growth] = useState(origin);
  // Le liquide qui ne démarre pas (contexte perdu entre-temps, pastille disparue) rend la montée ordinaire.
  const [liquid, setLiquid] = useState(growth != null);
  const liquidRef = useRef<LiquidSheet | null>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  // Le parent recrée souvent son rappel : le lire dans une ref évite de
  // relancer les effets (et de renvoyer le focus au déclencheur) à chaque rendu.
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  const close = () => setClosing(true);

  // Sa hauteur au dernier rendu, tenue à jour hors des changements de vue :
  // lue avant que la nouvelle vue ne soit mesurée.
  const height = useRef<number | null>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(() => {
      // Retirée de la page, elle mesure 0 : pas une hauteur d'où partir.
      if (!panel.offsetHeight) return;
      height.current = panel.offsetHeight;
      lastSheetHeight = height.current;
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  // En relais, elle part de la hauteur de celle qu'elle remplace.
  useLayoutEffect(() => {
    if (entrance === "swap" && panelRef.current) morphHeight(panelRef.current, lastSheetHeight);
  }, [entrance]);

  const morphed = useRef(morphKey);
  useLayoutEffect(() => {
    if (morphed.current === morphKey) return;
    morphed.current = morphKey;
    if (panelRef.current) morphHeight(panelRef.current, height.current);
  }, [morphKey]);

  // Avant la peinture : le premier état du liquide est posé, la feuille ne paraît pas pleine un instant.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const dim = dimRef.current;
    if (!growth || !panel || !dim) return;
    // Levée par le liquide, parfois dès son premier état (il tombe) : posée avant.
    settled.current = false;
    let run: LiquidSheet | null = null;
    try {
      run = growth.grow({
        panel,
        dim,
        source: growth.source,
        onOpened: () => {
          settled.current = true;
        },
      });
    } catch {}
    // Avant la peinture : la feuille monte alors comme les autres.
    if (!run) setLiquid(false);
    liquidRef.current = run;
    return () => {
      run?.dispose();
      liquidRef.current = null;
    };
  }, [growth]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    countSheet(1);
    // Née de la pastille, la garde suit le liquide, ou la montée ordinaire s'il n'a pas démarré.
    if (!growth) settled.current = getComputedStyle(panel).animationName === "none";
    const opener = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    panel.focus();
    document.body.style.overflow = "hidden";
    // Un saut de catégorie encore en cours (défilement doux) continuait
    // derrière la feuille : le plat touché n'était plus là à la fermeture.
    window.scrollTo({ top: window.scrollY, behavior: "instant" });

    // aria-modal ne suffit qu'à VoiceOver : pour TalkBack, NVDA et JAWS, la
    // page derrière reste parcourable. On la rend inerte le temps de la feuille.
    const overlay = panel.parentElement;
    const root = overlay?.parentElement;
    // Sauf la zone d'annonces du panier : un ajout fait depuis la feuille
    // doit encore être entendu.
    const behind = root
      ? [...root.children].filter(
          (el): el is HTMLElement =>
            el instanceof HTMLElement &&
            el !== overlay &&
            !el.inert &&
            el.getAttribute("role") !== "status"
        )
      : [];
    for (const el of behind) el.inert = true;

    // Dans un groupe de radios, un seul est dans l'ordre de tabulation :
    // celui qui est coché, ou le premier si aucun ne l'est.
    const tabbables = () => {
      const all = [
        ...panel.querySelectorAll<HTMLElement>("button, input, [href], [tabindex]"),
      ].filter((el) => el.tabIndex >= 0 && !el.hasAttribute("disabled"));
      const seen = new Set<string>();
      return all.filter((el) => {
        if (!(el instanceof HTMLInputElement) || el.type !== "radio") return true;
        if (el.checked) return true;
        if (seen.has(el.name)) return false;
        const group = panel.querySelectorAll<HTMLInputElement>(
          `input[name="${el.name}"]`
        );
        seen.add(el.name);
        return ![...group].some((radio) => radio.checked);
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // Une feuille empilée par-dessus l'a rendue inerte : à elle le clavier.
      if (overlay?.inert) return;
      if (event.key === "Escape") {
        setClosing(true);
        return;
      }
      if (event.key !== "Tab") return;
      const stops = tabbables();
      // Rien à atteindre (un paiement en cours) : le focus reste dans la
      // feuille. Jamais repris du dehors : la vérification 3DS de Stripe
      // s'ouvre dans un cadre ajouté au body, que le clavier doit atteindre.
      if (stops.length === 0) {
        if (panel.contains(document.activeElement)) event.preventDefault();
        return;
      }
      const first = stops[0];
      const last = stops[stops.length - 1];
      // Le focus peut être sur la feuille elle-même (à l'ouverture), ou
      // perdu hors d'elle (la ligne du panier qui le portait a disparu).
      const active = document.activeElement;
      const inside = active !== panel && panel.contains(active);
      // Un groupe de radios sans choix s'entre par son dernier quand on remonte :
      // tout le groupe est un seul arrêt — sinon le focus sortait de la feuille.
      const at = (stop: HTMLElement) =>
        active === stop ||
        (active instanceof HTMLInputElement &&
          stop instanceof HTMLInputElement &&
          active.type === "radio" &&
          stop.type === "radio" &&
          active.name === stop.name);
      if (event.shiftKey && (!inside || at(first))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || at(last))) {
        event.preventDefault();
        first.focus();
      }
    };

    /*
     * « Retour » d'Android (ou le geste du bord) ferme la feuille au lieu de
     * quitter la carte — et d'y perdre le panier. On empile une copie de
     * l'entrée courante, celle du routeur Next qu'il reconnaîtra en revenant
     * dessus ; fermée autrement, la feuille la dépile. Empilée au tour
     * suivant : le double montage du mode strict ne laisse pas d'entrée
     * orpheline. L'entrée porte l'identifiant de la feuille : revenir sur
     * elle (la feuille du dessus s'en va), ce n'est pas la quitter.
     */
    let pushed = false;
    let popped = false;
    // Revenir sur l'entrée faisait restaurer au navigateur le défilement
    // mémorisé à l'ouverture : la page sautait sous le doigt. Défilement
    // manuel le temps de la feuille, rétabli une fois l'entrée dépilée.
    pageScrollRestoration ??= history.scrollRestoration;
    const restoration = pageScrollRestoration;
    let unmounted = false;
    const push = setTimeout(async () => {
      if (pendingBack) await pendingBack;
      if (unmounted) return;
      history.scrollRestoration = "manual";
      history.pushState({ ...history.state, ominninSheet: sheetId }, "");
      pushed = true;
    });
    const onPopState = () => {
      // Avant sa propre entrée, un « popstate » vient d'une feuille qui se
      // referme juste avant celle-ci (son history.back()) : pas le sien.
      if (!pushed) return;
      if (history.state?.ominninSheet === sheetId) return;
      popped = true;
      setClosing(true);
    };
    window.addEventListener("popstate", onPopState);

    document.addEventListener("keydown", onKeyDown);
    return () => {
      unmounted = true;
      clearTimeout(push);
      window.removeEventListener("popstate", onPopState);
      if (pushed && !popped && history.state?.ominninSheet === sheetId) {
        pendingBack = new Promise((resolve) =>
          window.addEventListener(
            "popstate",
            () => {
              pendingBack = null;
              resolve();
              history.scrollRestoration = restoration;
            },
            { once: true }
          )
        );
        history.back();
      } else if (pushed) {
        history.scrollRestoration = restoration;
      }
      // Décomptée une fois son retour lancé : qui attend qu'il n'y ait plus de
      // feuille (leaveAfterSheet) trouve pendingBack déjà posé.
      countSheet(-1);
      document.removeEventListener("keydown", onKeyDown);
      for (const el of behind) el.inert = false;
      document.body.style.overflow = bodyOverflow;
      // Le déclencheur a pu disparaître (la barre du panier, panier vidé) : le
      // focus reste alors dans la carte, là où en est le client — le nom du
      // restaurant, le titre de la section ou la carte d'un plat entiers à
      // l'écran, sinon ce qui en occupe le plus (le haut de la page, un plat
      // plus haut que l'écran, le pied de page) —, jamais sous la barre des
      // catégories ni sous le bas de page fixé. Jamais un bouton ni un lien :
      // un Entrée réflexe ajoutait un plat, appelait le restaurant ou ouvrait
      // son plan. Depuis <main>, la tabulation repartait du premier plat, tout
      // en haut.
      // preventScroll : la page n'a pas bougé sous la feuille ; un déclencheur
      // passé sous la barre des catégories la faisait sauter en revenant.
      if (opener?.isConnected) {
        opener.focus({ preventScroll: true });
      } else {
        const main = root?.querySelector<HTMLElement>("main");
        // Entier à l'écran : ses bords haut et bas, pas seulement son milieu.
        const shown = (el: HTMLElement) => {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height) return false;
          const x = box.left + box.width / 2;
          return [box.top + 1, box.bottom - 1].every((y) => {
            const hit = document.elementFromPoint(x, y);
            return hit !== null && el.contains(hit);
          });
        };
        const seen = (el: HTMLElement) => {
          const box = el.getBoundingClientRect();
          return Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
        };
        const all = (selector: string) => [
          ...(root?.querySelectorAll<HTMLElement>(selector) ?? []),
        ];
        const here =
          all(":scope > header h1, main h2, main article").find(shown) ??
          all(":scope > header, main article, footer").reduce<HTMLElement | undefined>(
            (best, el) => (seen(el) > (best ? seen(best) : 0) ? el : best),
            undefined
          ) ??
          main;
        if (here) {
          here.tabIndex = -1;
          here.focus({ preventScroll: true });
        }
      }
    };
  }, [sheetId, growth]);

  // Sans animation de sortie (CSS absent, liquide tombé), rien à attendre.
  useEffect(() => {
    if (!closing) return;
    const run = liquidRef.current;
    if (run) {
      let mounted = true;
      const closed = () => {
        if (mounted) onClosedRef.current();
      };
      run.close().then(closed, closed);
      return () => {
        mounted = false;
      };
    }
    const panel = panelRef.current;
    if (liquid || (panel && getComputedStyle(panel).animationName === "none")) {
      onClosedRef.current();
    }
  }, [closing, liquid]);

  return createPortal(
    <div
      className={`sheet-overlay fixed inset-0 z-50 flex justify-center ${card ? "items-center p-4" : "items-end sm:items-center sm:p-4"} ${
        liquid
          ? ""
          : `${card ? "bg-black/40 backdrop-blur-[6px]" : "bg-black/60 backdrop-blur-sm"} transition-opacity duration-200 ${closing ? "opacity-0" : ""}`
      }`}
      onClickCapture={(event) => {
        const control =
          event.target instanceof Element
            ? event.target.closest("button, label")
            : null;
        const repeat =
          event.detail > 1 &&
          (control === null || control !== lastAccepted.current);
        if (settled.current && !closing && !repeat) {
          lastAccepted.current = control;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={backdropCloses ? close : undefined}
    >
      {liquid && <div ref={dimRef} aria-hidden="true" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={`${liquid ? "relative" : closing ? "sheet-fall" : `sheet-${entrance}`} flex max-h-(--sheet-max) w-full max-w-md flex-col overflow-y-auto overscroll-contain border border-hairline bg-surface ${card ? "rounded-3xl" : "rounded-t-3xl sm:rounded-3xl"}`}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (closing) onClosedRef.current();
          else settled.current = true;
        }}
      >
        {children(close, closing)}
      </div>
    </div>,
    // Pas une copie encore masquée de la page (rendu en flux), que React
    // retire en la révélant : la feuille partait avec, la page restait figée.
    [...document.querySelectorAll("[data-menu-root]")].find(
      (root) => !root.closest("[hidden]")
    ) ?? document.body
  );
}
