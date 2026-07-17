"use client";

import Link from "next/link";
import { useClipData } from "@/lib/clip/context";

/*
 * Rendu commun des sous-navigations de l'espace (Publier, Comptes) :
 * pilules liées à des routes sœurs, badge « Bientôt » pour ce qui arrive.
 */

export interface SubTab<T extends string> {
  id: T;
  /** Suffixe de chemin, préfixé par le basePath du fournisseur. */
  suffix: string;
  label: string;
  soon?: boolean;
}

export function SubTabs<T extends string>({
  ariaLabel,
  tabs,
  active,
}: {
  ariaLabel: string;
  tabs: readonly SubTab<T>[];
  active: T;
}) {
  const { basePath } = useClipData();

  return (
    <nav
      aria-label={ariaLabel}
      className="rise flex self-start rounded-full border border-hairline bg-surface p-1"
    >
      {tabs.map((tab) => {
        const current = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={`${basePath}${tab.suffix}`}
            aria-current={current ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              current
                ? "border-hairline bg-surface-raised text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.soon && (
              <span className="ember-gradient rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-background">
                Bientôt
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
