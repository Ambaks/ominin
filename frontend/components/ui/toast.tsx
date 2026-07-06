"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { TOAST_DURATION_MS } from "@/lib/gestion/constants";

interface ToastEntry {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast doit être utilisé sous <ToastProvider>.");
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const push = useCallback((kind: ToastEntry["kind"], message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, kind, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-5 lg:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rise flex items-center gap-2.5 rounded-full border border-hairline bg-surface-raised px-4 py-2.5 text-sm shadow-lg shadow-background/60"
          >
            <span
              className={`size-2 shrink-0 rounded-full ${
                toast.kind === "success" ? "bg-ember-1" : "bg-ember-3"
              }`}
            />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
