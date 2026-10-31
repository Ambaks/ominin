"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TOAST_DURATION_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";

/** Ce qu'une annonce propose d'un appui : sa bulle devient un bouton (« Voir la table »). */
interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastEntry {
  id: number;
  kind: "success" | "notice" | "error";
  message: string;
  action?: ToastAction;
}

interface ToastApi {
  success: (message: string) => void;
  /** Ce que l'écran annonce de lui-même (une table qui commande) : une confirmation ne l'efface pas. */
  notice: (message: string, action?: ToastAction) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
// À part de l'API : un message qui passe ne refait pas le rendu des écrans qui en envoient.
const ToastListContext = createContext<{
  toasts: ToastEntry[];
  dismiss: (id: number) => void;
  /** Le message survolé ou au focus, dont le temps s'arrête (outlet). */
  hold: (id: number | null) => void;
}>({ toasts: [], dismiss: () => {}, hold: () => {} });

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast doit être utilisé sous <ToastProvider>.");
  return api;
}

/*
 * Exécute une mutation en signalant l'erreur éventuelle via un toast (et un
 * toast de succès facultatif). Évite de répéter le même try/catch autour de
 * chaque appel à l'API de gestion.
 */
export function useRunMutation() {
  const toast = useToast();
  return useCallback(
    async (action: () => Promise<unknown>, success?: string) => {
      try {
        await action();
        if (success) toast.success(success);
      } catch (error) {
        toast.error(describeError(error).message);
      }
    },
    [toast]
  );
}

export function ToastProvider({
  children,
  placement = "bottom",
}: {
  children: React.ReactNode;
  /**
   * En haut, sous un en-tête collé, quand le bas de l'écran porte des boutons (l'écran du comptoir, dont l'en-tête prend deux lignes sous lg) ; à droite dès md : au centre, il couvrait le numéro d'une carte.
   * outlet : là où l'écran pose <ToastOutlet>, dans son en-tête, quand aucun coin ne reste libre de ses cartes ; un message à la fois.
   */
  placement?: "bottom" | "top" | "outlet";
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [held, setHeld] = useState<number | null>(null);
  const nextId = useRef(0);
  const single = placement === "outlet";

  const push = useCallback(
    (kind: ToastEntry["kind"], message: string, action?: ToastAction) => {
      const entry = { id: nextId.current++, kind, message, action };
      // Une confirmation à la fois : la plus récente remplace la précédente,
      // au lieu d'empiler des bulles sur le contenu. Une annonce ou une
      // erreur, elle, reste son temps : un « Table 4 servie. » ne doit pas
      // effacer un paiement refusé.
      if (single) {
        // Une seule place : la confirmation d'un geste passe tout de suite ;
        // une annonce ou une erreur attend son tour, et reprend entière après
        // la confirmation qui l'a interrompue (son temps court une fois montrée).
        setToasts((current) =>
          kind === "success"
            ? [entry, ...current.filter((toast) => toast.kind !== "success")]
            : [...current, entry]
        );
        return;
      }
      setToasts((current) => [...current.filter((toast) => toast.kind !== "success"), entry]);
      // Une erreur reste jusqu'au tap : trois secondes ne suffisent pas à
      // lire quoi faire, et le geste à refaire attend derrière.
      if (kind === "error") return;
      setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== entry.id));
      }, TOAST_DURATION_MS);
    },
    [single]
  );

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  // Une seule place : le message montré a son temps, suspendu tant qu'on le
  // survole ou qu'il a le focus — un bouton ne disparaît pas sous le doigt —,
  // et rendu entier ensuite.
  const shown = single ? toasts[0] : undefined;
  const shownId = shown?.kind === "error" ? undefined : shown?.id;
  useEffect(() => {
    if (shownId === undefined || held === shownId) return;
    const timer = setTimeout(() => dismiss(shownId), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [shownId, held, dismiss]);
  const list = useMemo(
    () => ({ toasts: single ? toasts.slice(0, 1) : toasts, dismiss, hold: setHeld }),
    [single, toasts, dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      notice: (message, action) => push("notice", message, action),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      <ToastListContext.Provider value={list}>
        {children}
        {placement !== "outlet" && (
          <ToastOutlet
            className={`pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-5 ${
              placement === "top" ? "top-44 md:items-end md:px-10 lg:top-28" : "bottom-20 lg:bottom-6"
            }`}
          />
        )}
      </ToastListContext.Provider>
    </ToastContext.Provider>
  );
}

/**
 * Les messages en cours, annoncés aux lecteurs d'écran ; className place la
 * zone. compact : la bulle d'une barre de 44 px, qui y tient sur deux lignes
 * (trois au plus, où la barre est plus haute), sans ombre à rogner.
 */
export function ToastOutlet({ className, compact = false }: { className: string; compact?: boolean }) {
  const { toasts, dismiss, hold } = useContext(ToastListContext);
  return (
    <div aria-live="polite" className={className}>
      {toasts.map((toast) => {
        const bubble = `rise flex items-center border border-hairline bg-surface-raised text-left ${
          compact
            ? "gap-2 rounded-2xl px-3 py-1 text-[13px] leading-4"
            : "gap-2.5 rounded-full px-4 py-2.5 text-sm shadow-lg shadow-background/60"
        }`;
        const content = (
          <>
            <span
              className={`size-2 shrink-0 rounded-full ${
                toast.kind === "error" ? "bg-ember-3" : toast.kind === "notice" ? "bg-ember-2" : "bg-ember-1"
              }`}
            />
            <span className={compact ? "line-clamp-3" : undefined}>
              {toast.message}
              {toast.action && (
                <span className="ml-1.5 whitespace-nowrap font-semibold text-ember-1">
                  {toast.action.label}
                  <span aria-hidden>&nbsp;→</span>
                </span>
              )}
            </span>
          </>
        );
        const { action } = toast;
        if (!action && toast.kind === "error") {
          return (
            <button
              key={toast.id}
              type="button"
              title="Fermer"
              onClick={() => dismiss(toast.id)}
              className={`${bubble} pointer-events-auto transition-colors hover:border-ember-2/50`}
            >
              {content}
              <span aria-hidden className="ml-1 text-muted">
                ×
              </span>
            </button>
          );
        }
        return action ? (
          <button
            key={toast.id}
            type="button"
            onPointerEnter={() => hold(toast.id)}
            onPointerLeave={() => hold(null)}
            onFocus={() => hold(toast.id)}
            onBlur={() => hold(null)}
            onClick={() => {
              hold(null);
              dismiss(toast.id);
              action.onPress();
            }}
            className={`${bubble} pointer-events-auto transition-colors hover:border-ember-2/50`}
          >
            {content}
          </button>
        ) : (
          <div key={toast.id} className={bubble}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
