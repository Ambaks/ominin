"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { DEMO_BANNER } from "@/lib/clip/demo/data";

/*
 * Bandeau « données fictives » de la démo. Masqué quand la démo tourne dans
 * une iframe (vitrines de la landing) : la détection window.self !== top
 * survit aux navigations internes, contrairement à un paramètre d'URL.
 */

const emptySubscribe = () => () => {};

export function DemoBanner() {
  // Caché côté serveur (snapshot true) : évite le flash dans les iframes.
  const embedded = useSyncExternalStore(
    emptySubscribe,
    () => window.self !== window.top,
    () => true
  );

  if (embedded) return null;

  return (
    <div className="border-b border-hairline bg-surface-raised">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-5 py-2 lg:max-w-5xl lg:px-10">
        <p className="text-xs text-muted">
          <span className="ember-text font-semibold">Démo</span> —{" "}
          {DEMO_BANNER.message}
        </p>
        <Link
          href={DEMO_BANNER.ctaHref}
          className="shrink-0 text-xs font-semibold text-ember-1 transition-colors hover:text-ember-2"
        >
          {DEMO_BANNER.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
