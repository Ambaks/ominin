"use client";

import Link from "next/link";
import { useClipData } from "@/lib/clip/context";

/*
 * Sous-navigation de l'onglet « Publier » : le flux actuel (dépôt d'un clip
 * déjà monté) et le générateur de clips depuis une VOD, à venir.
 */

export type PublierTab = "clip" | "vod";

const TABS: { id: PublierTab; suffix: string; label: string; soon?: boolean }[] = [
  { id: "clip", suffix: "", label: "Depuis un clip" },
  { id: "vod", suffix: "/generateur", label: "Depuis une VOD", soon: true },
];

export function PublierTabs({ active }: { active: PublierTab }) {
  const { basePath } = useClipData();

  return (
    <nav
      aria-label="Mode de publication"
      className="rise flex self-start rounded-full border border-hairline bg-surface p-1"
    >
      {TABS.map((tab) => {
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
