"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
 * Deux feuilles peuvent s'empiler (un article offert se compose depuis le
 * panier) : seule celle du dessus répond au clavier, et chacune ne se ferme
 * au « Retour » que si c'est sa propre entrée d'historique qui s'en va.
 */
export function Sheet({
  onClosed,
  backdropCloses,
  labelledBy,
  label,
  children,
}: {
  /** Appelé une fois la feuille descendue. */
  onClosed: () => void;
  /** Toucher le fond ferme-t-il la feuille ? */
  backdropCloses: boolean;
  labelledBy?: string;
  label?: string;
  /** Reçoit la fermeture animée, à brancher sur Annuler, ×, la validation. */
  children: (close: () => void) => ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const settled = useRef(false);
  // Le contrôle du dernier clic accepté : une rafale sur lui-même (« + » du
  // panier tapé trois fois) passe, une rafale qui glisse ailleurs non.
  const lastAccepted = useRef<Element | null>(null);
  const [closing, setClosing] = useState(false);
  // Le parent recrée souvent son rappel : le lire dans une ref évite de
  // relancer les effets (et de renvoyer le focus au déclencheur) à chaque rendu.
  const onClosedRef = useRef(onClosed);
  useEffect(() => {
    onClosedRef.current = onClosed;
  });

  const close = () => setClosing(true);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    settled.current = getComputedStyle(panel).animationName === "none";
    const opener = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    panel.focus();
    document.body.style.overflow = "hidden";

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
        ...panel.querySelectorAll<HTMLElement>("button, input, [href]"),
      ].filter((el) => !el.hasAttribute("disabled"));
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
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      // Le focus peut être sur la feuille elle-même (à l'ouverture), ou
      // perdu hors d'elle (la ligne du panier qui le portait a disparu).
      const active = document.activeElement;
      const inside = active !== panel && panel.contains(active);
      if (event.shiftKey && (!inside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
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
    const restoration = history.scrollRestoration;
    const push = setTimeout(() => {
      history.scrollRestoration = "manual";
      history.pushState({ ...history.state, ominninSheet: sheetId }, "");
      pushed = true;
    });
    const onPopState = () => {
      if (history.state?.ominninSheet === sheetId) return;
      popped = true;
      setClosing(true);
    };
    window.addEventListener("popstate", onPopState);

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(push);
      window.removeEventListener("popstate", onPopState);
      if (pushed && !popped && history.state?.ominninSheet === sheetId) {
        window.addEventListener(
          "popstate",
          () => {
            history.scrollRestoration = restoration;
          },
          { once: true }
        );
        history.back();
      } else if (pushed) {
        history.scrollRestoration = restoration;
      }
      document.removeEventListener("keydown", onKeyDown);
      for (const el of behind) el.inert = false;
      document.body.style.overflow = bodyOverflow;
      // Le déclencheur a pu disparaître (la barre du panier, panier vidé) :
      // le focus reste alors dans la carte au lieu de tomber sur <body>.
      if (opener?.isConnected) {
        opener.focus();
      } else {
        const main = root?.querySelector("main");
        if (main) {
          main.tabIndex = -1;
          main.focus({ preventScroll: true });
        }
      }
    };
  }, [sheetId]);

  // Sans animation de sortie (CSS absent), rien à attendre.
  useEffect(() => {
    const panel = panelRef.current;
    if (closing && panel && getComputedStyle(panel).animationName === "none") {
      onClosedRef.current();
    }
  }, [closing]);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${
        closing ? "opacity-0" : ""
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
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={label}
        className={`${closing ? "sheet-fall" : "sheet-rise"} flex max-h-[88dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-3xl border border-hairline bg-surface sm:rounded-3xl`}
        onClick={(event) => event.stopPropagation()}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          if (closing) onClosedRef.current();
          else settled.current = true;
        }}
      >
        {children(close)}
      </div>
    </div>,
    document.querySelector("[data-menu-root]") ?? document.body
  );
}
