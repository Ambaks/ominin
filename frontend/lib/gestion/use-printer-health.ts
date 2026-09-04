"use client";

import { useEffect, useState } from "react";
import { TERMINAL_ONLINE_WINDOW_MS } from "./constants";
import { isRecent, loadTerminaux } from "./terminaux";

/**
 * Vrai quand une imprimante est déclarée mais que son boîtier Omilink ne
 * s'est pas annoncé depuis TERMINAL_ONLINE_WINDOW_MS : les tickets ne sortent
 * pas, la salle doit le savoir. Relu à la cadence de cette fenêtre — le
 * boîtier s'annonce toutes les quelques secondes, une minute de silence est
 * une panne. Sans imprimante, jamais vrai.
 */
export function usePrinterOffline(etablissementId: string): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!etablissementId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const { devices, printers } = await loadTerminaux(etablissementId);
        if (cancelled) return;
        const now = Date.now();
        const lastSeen = new Map(
          devices.map((device) => [device.id, device.last_seen_at])
        );
        setOffline(
          printers.some(
            (printer) => !isRecent(lastSeen.get(printer.device_id) ?? null, now)
          )
        );
      } catch {
        // Le bandeau est un à-côté : une lecture manquée n'alerte pas.
      }
    };
    void check();
    const timer = setInterval(check, TERMINAL_ONLINE_WINDOW_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [etablissementId]);

  return offline;
}
