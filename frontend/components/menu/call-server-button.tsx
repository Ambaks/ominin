"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/menu/cart";
import { CALL_THROTTLE_MS } from "@/lib/push/events";

type CallState = "idle" | "sending" | "sent";

/**
 * Appel d'un serveur depuis le menu QR. Visible seulement à table (QR scanné)
 * quand l'offre porte le service (mêmes conditions que la commande). Après un
 * appel, le bouton se repose le temps de la fenêtre anti-spam côté serveur —
 * inutile de proposer un geste qui serait étouffé.
 */
export function CallServerButton() {
  const cart = useCart();
  const [state, setState] = useState<CallState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!cart.orderingEnabled || cart.tableNumber === null) return null;

  const call = async () => {
    setState("sending");
    try {
      const response = await fetch("/api/push/call-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cart.slug,
          tableNumber: cart.tableNumber,
        }),
      });
      if (!response.ok) throw new Error();
      setState("sent");
      timer.current = setTimeout(() => setState("idle"), CALL_THROTTLE_MS);
    } catch {
      setState("idle");
    }
  };

  return (
    <div
      className={`fixed right-4 z-40 ${cart.count > 0 || state === "sent" ? "bottom-24" : "bottom-4"}`}
    >
      <button
        type="button"
        onClick={() => void call()}
        disabled={state !== "idle"}
        className="flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2.5 text-xs font-semibold text-foreground shadow-lg shadow-black/25 transition-colors hover:border-ember-2/40 disabled:opacity-70"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4 text-ember-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {state === "sent"
          ? "Serveur appelé"
          : state === "sending"
            ? "Appel…"
            : "Appeler un serveur"}
      </button>
    </div>
  );
}
