"use client";

import { SubTabs } from "./sub-tabs";

/*
 * Sous-navigation de l'onglet « Comptes » : les réseaux déjà reliés et la
 * création de comptes neufs depuis l'espace, à venir.
 */

export type ComptesTab = "connectes" | "creation";

const TABS = [
  { id: "connectes", suffix: "/comptes", label: "Comptes connectés" },
  {
    id: "creation",
    suffix: "/comptes/creation",
    label: "Créer des comptes",
    soon: true,
  },
] as const;

export function ComptesTabs({ active }: { active: ComptesTab }) {
  return <SubTabs ariaLabel="Gestion des comptes" tabs={TABS} active={active} />;
}
