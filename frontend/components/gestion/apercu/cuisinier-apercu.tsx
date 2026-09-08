"use client";

import Link from "next/link";
import { ProfileRow } from "@/components/gestion/profile-row";
import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { unavailableItems } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";

/*
 * L'aperçu de la cuisine. Les commandes sortent sur l'imprimante : il ne
 * reste au poste qu'une chose à tenir à jour, ce qui est encore vendable.
 * (La salle, elle, n'a pas d'aperçu : son écran d'accueil est le service.)
 */

const RISE_STEP_MS = 70;

function ServiceClock() {
  const now = useNow(SERVICE_CLOCK_TICK_MS);
  return (
    <p className="font-display text-3xl tabular-nums lg:text-4xl">
      {now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </p>
  );
}

export function CuisinierApercu({ state }: { state: GestionState }) {
  const indispo = unavailableItems(state);
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-8">
      <section className="rise relative overflow-hidden rounded-3xl border border-hairline bg-surface">
        <div className="ember-flow h-1 w-full" aria-hidden />
        <div className="hero-gradient-drift pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-6">
          <div>
            <p className="ember-text flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]">
              Service en direct
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight lg:text-3xl">
              La cuisine
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="capitalize">{today}</span> · les commandes
              sortent sur l&rsquo;imprimante
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="size-2 animate-pulse rounded-full bg-ember-2"
              aria-hidden
            />
            <ServiceClock />
          </div>
        </div>
      </section>

      {indispo.length > 0 ? (
        <section
          className="rise flex flex-col gap-3"
          style={{ animationDelay: `${RISE_STEP_MS}ms` }}
        >
          <h2 className="font-display text-lg font-medium">À remettre en vente</h2>
          <div className="rounded-2xl border border-hairline bg-surface">
            {indispo.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-faint">
                    {item.stock === 0 ? "Stock épuisé" : "Retiré de la vente"}
                  </p>
                </div>
                <Link
                  href="/gestion/menu"
                  className="text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
                >
                  Gérer
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div
          className="rise rounded-2xl border border-dashed border-hairline p-6 text-center"
          style={{ animationDelay: `${RISE_STEP_MS}ms` }}
        >
          <p className="text-sm text-muted">Toute la carte est en vente.</p>
          <p className="mt-1 text-xs text-faint">
            Un article épuisé se retire depuis l&rsquo;onglet Menu ; il
            réapparaît ici.
          </p>
        </div>
      )}

      <ProfileRow
        state={state}
        style={{ animationDelay: `${RISE_STEP_MS * 2}ms` }}
      />
    </div>
  );
}
