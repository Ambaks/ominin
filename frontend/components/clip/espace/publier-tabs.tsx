"use client";

import { SubTabs } from "./sub-tabs";

/*
 * Sous-navigation de l'onglet « Publier » : le flux actuel (dépôt d'un clip
 * déjà monté) et le générateur de clips depuis une VOD, à venir.
 */

export type PublierTab = "clip" | "vod";

const TABS = [
  { id: "clip", suffix: "", label: "Depuis un clip" },
  { id: "vod", suffix: "/generateur", label: "Depuis une VOD" },
] as const;

export function PublierTabs({ active }: { active: PublierTab }) {
  return (
    <SubTabs ariaLabel="Mode de publication" tabs={TABS} active={active} />
  );
}
