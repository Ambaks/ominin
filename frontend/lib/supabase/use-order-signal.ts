"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "./client";

/**
 * Suit une commande : chaque changement de son état est signalé sur le canal
 * Realtime « commande:<id> » (trigger orders_broadcast_status). Le
 * signal ne porte que l'état — le canal est public — : onSignal relit la
 * commande, qui fait foi. Une lecture tout de suite, puis à chaque signal, à
 * chaque (re)connexion du canal et à chaque retour au premier plan : un
 * téléphone en veille perd sa connexion, et ce qui a changé pendant ce temps
 * n'a pas été signalé.
 *
 * current() dit si la lecture lancée est encore la dernière, page montée :
 * une réponse partie avant un changement ne l'efface pas en arrivant après.
 * onSignal doit être stable (useCallback).
 */
export function useOrderSignal(
  orderId: string,
  onSignal: (current: () => boolean) => void
) {
  useEffect(() => {
    const supabase = createClient();
    const topic = `commande:${orderId}`;
    let live = true;
    let latest = 0;
    let channel: RealtimeChannel | null = null;
    const signal = () => {
      const request = ++latest;
      onSignal(() => live && request === latest);
    };
    const subscribe = async () => {
      // channel() rend le canal existant du même sujet, même en train de
      // fermer (démontage puis remontage) : l'abonnement ne partirait jamais.
      // On attend qu'il soit parti.
      const closing = supabase
        .getChannels()
        .find((candidate) => candidate.topic === `realtime:${topic}`);
      if (closing) await supabase.removeChannel(closing);
      if (!live) return;
      channel = supabase
        .channel(topic)
        .on("broadcast", { event: "statut" }, signal)
        .subscribe((state) => {
          if (state === "SUBSCRIBED") signal();
        });
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") signal();
    };
    document.addEventListener("visibilitychange", onVisible);
    signal();
    void subscribe();
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [orderId, onSignal]);
}
