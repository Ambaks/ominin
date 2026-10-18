"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { retryClubLoad } from "@/lib/gestion/club-store";

/* Les états d'attente des écrans Soirées : fermé, en chargement, en échec. */

export function ClubLocked() {
  return (
    <EmptyState
      title="Soirées non activées"
      body="Les soirées et la réservation de tables font partie d'Ominin Club. Écrivez-nous pour les ouvrir à votre établissement."
    />
  );
}

/** En attendant les données, la silhouette de l'écran qui vient : la liste, ou une soirée. */
export function ClubSkeleton({ variant = "liste" }: { variant?: "liste" | "soiree" }) {
  return (
    <div aria-busy aria-label="Chargement" className="flex flex-col gap-4">
      <div className="shimmer h-8 w-48 rounded-xl" />
      {variant === "soiree" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="shimmer h-20 rounded-2xl" />
            ))}
          </div>
          <div className="shimmer h-11 w-64 max-w-full rounded-full" />
          <div className="shimmer aspect-[6/5] rounded-2xl lg:aspect-[2/1]" />
        </>
      ) : (
        <>
          <div className="shimmer h-11 w-80 max-w-full rounded-full" />
          {[0, 1, 2].map((index) => (
            <div key={index} className="shimmer h-36 rounded-2xl" />
          ))}
        </>
      )}
    </div>
  );
}

export function ClubLoadError({ message }: { message: string }) {
  return (
    <EmptyState
      title="Chargement impossible"
      body={message}
      action={
        <button
          type="button"
          onClick={() => retryClubLoad()}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Réessayer
        </button>
      }
    />
  );
}

export function NightNotFound() {
  return (
    <EmptyState
      title="Soirée introuvable"
      body="Elle a peut-être été supprimée, ou le lien est incomplet."
      action={
        <Link
          href="/gestion/soirees"
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
        >
          Toutes les soirées
        </Link>
      }
    />
  );
}

/** Retour à la liste, en tête des écrans d'une soirée. */
export function BackToSoirees() {
  return (
    <Link
      href="/gestion/soirees"
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-muted transition-colors hover:text-foreground lg:pointer-fine:min-h-9"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Soirées
    </Link>
  );
}
