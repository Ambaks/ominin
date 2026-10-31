"use client";

import Link from "next/link";
import { AlertIcon, LockIcon, OfflineIcon } from "@/components/gestion/icons";
import { EmptyState, GlassButton, Notice, Shimmer } from "@/components/gestion/ui";
import { describeError, type ErrorFamily } from "@/lib/gestion/errors";
import { contactEmail } from "@/lib/landing-data";
import { retryClubLoad } from "@/lib/gestion/club-store";

/* Les états d'attente des écrans Soirées : fermé, en chargement, en échec. */

export function ClubLocked() {
  return (
    <EmptyState
      text="Les soirées et la réservation de tables font partie d'Ominin Club : écrivez-nous pour les ouvrir à votre établissement."
      action={
        <GlassButton href={`mailto:${contactEmail}?subject=${encodeURIComponent("Ouvrir Ominin Club")}`}>
          Nous écrire
        </GlassButton>
      }
    />
  );
}

/** En attendant les données, la silhouette de l'écran qui vient : la liste, ou une soirée. */
export function ClubSkeleton({ variant = "liste" }: { variant?: "liste" | "soiree" }) {
  return (
    <div aria-busy aria-label="Chargement" className="flex flex-col gap-g-gap">
      <Shimmer className="h-9 w-48" />
      {variant === "soiree" ? (
        <>
          <div className="grid grid-cols-2 gap-g-gap lg:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <Shimmer key={index} className="h-24" />
            ))}
          </div>
          <Shimmer className="h-g-control w-64 max-w-full rounded-full" />
          <Shimmer className="aspect-[6/5] lg:aspect-[2/1]" />
        </>
      ) : (
        <>
          <Shimmer className="h-g-control w-80 max-w-full rounded-full" />
          {[0, 1, 2].map((index) => (
            <Shimmer key={index} className="h-36" />
          ))}
        </>
      )}
    </div>
  );
}

const LOAD_ICON: Record<ErrorFamily, typeof AlertIcon> = {
  reseau: OfflineIcon,
  droit: LockIcon,
  donnee: AlertIcon,
};

/**
 * L'échec de chargement, une fois, en bandeau grenat. C'est une lecture, pas
 * un enregistrement : le titre le dit, et « Réessayer » est toujours là, seul
 * recours de ces écrans.
 */
export function ClubLoadError({ message }: { message: string }) {
  const described = describeError(message);
  const Icon = LOAD_ICON[described.family];
  const data = described.family === "donnee";
  return (
    <Notice
      icon={<Icon />}
      title={data ? "Chargement impossible" : described.title}
      text={data ? "Réessayez, ou rechargez la page." : described.text}
      action={<GlassButton onClick={() => retryClubLoad()}>Réessayer</GlassButton>}
    />
  );
}

export function NightNotFound() {
  return (
    <EmptyState
      text="Soirée introuvable : elle a peut-être été supprimée, ou le lien est incomplet."
      action={<GlassButton href="/gestion/soirees">Toutes les soirées</GlassButton>}
    />
  );
}

/** Retour à la liste, en tête des écrans d'une soirée. */
export function BackToSoirees() {
  return (
    <Link
      href="/gestion/soirees"
      className="inline-flex min-h-g-control items-center gap-1 self-start rounded-full text-g-label font-medium text-muted transition-colors hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Soirées
    </Link>
  );
}
