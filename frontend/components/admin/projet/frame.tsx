"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  reloadProjet,
  selectProjetFor,
  useProjet,
  type ProjetData,
} from "@/lib/admin/projet";

/*
 * Cadre commun des écrans Projet : titre, lien vers le dépôt, rechargement,
 * et les données déjà réduites au produit affiché.
 */
export function ProjetFrame({
  title,
  githubPath,
  children,
}: {
  title: string;
  /** Page GitHub correspondante, relative au dépôt (« milestones »…). */
  githubPath: string;
  children: (data: ProjetData) => React.ReactNode;
}) {
  const { data, error, loading } = useProjet();
  const { product } = useAdminBasePath();
  const scoped = useMemo(
    () => (data ? selectProjetFor(data, product) : null),
    [data, product],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium">{title}</h1>
        <div className="flex items-center gap-2">
          {data && (
            <a
              href={`https://github.com/${data.repo}/${githubPath}`}
              target="_blank"
              rel="noopener"
              className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground"
            >
              GitHub
            </a>
          )}
          <button
            type="button"
            onClick={() => void reloadProjet()}
            disabled={loading}
            className="rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-ember-2/40 hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Lecture…" : "Actualiser"}
          </button>
        </div>
      </div>

      {scoped ? (
        children(scoped)
      ) : error ? (
        <EmptyState
          title="GitHub ne répond pas"
          body={error}
          action={
            <button
              type="button"
              onClick={() => void reloadProjet()}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Réessayer
            </button>
          }
        />
      ) : (
        <div aria-busy className="flex flex-col gap-3">
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
          <div className="shimmer h-20 rounded-2xl" />
        </div>
      )}
    </div>
  );
}

/** Pastille d'initiales : GitHub sert ses avatars depuis un domaine que la
 * CSP n'ouvre pas, et deux personnes n'ont pas besoin de photo. */
export function PersonChip({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      title={name}
      className="flex size-7 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-raised text-[10px] font-semibold text-muted"
    >
      {initials}
    </span>
  );
}
