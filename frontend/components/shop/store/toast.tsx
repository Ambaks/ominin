"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { TOAST_DURATION_MS } from "@/lib/gestion/constants";

/*
 * Notifications discrètes du site public (« Ajouté au panier »). Mécanique
 * identique à components/ui/toast.tsx, habillée aux jetons de la boutique.
 */

interface Toast {
  id: number;
  message: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (message: string, options?: { detail?: string; action?: Toast["action"] }) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useShopToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useShopToast doit être utilisé sous <ShopToastProvider>.");
  return api;
}

export function ShopToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...toast, id }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), TOAST_DURATION_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, options) => push({ message, ...options }),
      error: (message) => push({ message }),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-5">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-shop-line bg-shop-paper px-4 py-3 text-sm text-shop-ink shop-shadow-hover">
            <span className="size-2 shrink-0 rounded-full bg-shop-accent" />
            <span className="flex flex-col">
              <span className="font-medium">{toast.message}</span>
              {toast.detail && <span className="text-xs text-shop-ink-soft">{toast.detail}</span>}
            </span>
            {toast.action && (
              <button type="button" onClick={toast.action.onClick} className="ml-2 rounded-full bg-shop-tint-strong px-3 py-1.5 text-xs font-semibold text-shop-accent-deep">
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
