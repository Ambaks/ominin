"use client";

import { useEffect, useState } from "react";
import { CommerciauxTab } from "@/components/admin/commerciaux/commerciaux-tab";
import { DeclarationsTab } from "@/components/admin/commerciaux/declarations-tab";
import { DemosTab } from "@/components/admin/commerciaux/demos-tab";
import { InscriptionsTab } from "@/components/admin/commerciaux/inscriptions-tab";
import { RelevesTab } from "@/components/admin/commerciaux/releves-tab";
import { ReglagesTab } from "@/components/admin/commerciaux/reglages-tab";
import { PillTabs } from "@/components/ui/pill-tabs";

/*
 * Les commerciaux indépendants : qui est invité et sous contrat, les
 * déclarations à trancher (le délai contractuel court), et les réglages de
 * l'espace. Le travail des commerciaux (journal, relances) n'a pas d'écran
 * ici : il ne se consulte que fiche par fiche (article 2.3 du contrat).
 */

const TABS = [
  { id: "commerciaux", label: "Commerciaux" },
  { id: "declarations", label: "Déclarations" },
  { id: "inscriptions", label: "Inscriptions" },
  { id: "demos", label: "Démos à faire" },
  { id: "releves", label: "Relevés" },
  { id: "reglages", label: "Réglages" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CommerciauxPage() {
  const [tab, setTab] = useState<TabId>("commerciaux");

  // Lu dans l'URL au montage (lien d'une notification), sans frontière Suspense.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("onglet");
    const known = TABS.find((entry) => entry.id === requested);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- état initial lu une fois dans l'URL
    if (known) setTab(known.id);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-medium">Commerciaux</h1>
        <p className="mt-1 text-sm text-muted">
          Apporteurs d’affaires indépendants : contrats, déclarations, réglages de leur espace.
        </p>
      </div>
      <PillTabs tabs={[...TABS]} activeId={tab} onSelect={(id) => setTab(id as TabId)} />
      {tab === "commerciaux" && <CommerciauxTab />}
      {tab === "declarations" && <DeclarationsTab />}
      {tab === "inscriptions" && <InscriptionsTab />}
      {tab === "demos" && <DemosTab />}
      {tab === "releves" && <RelevesTab />}
      {tab === "reglages" && <ReglagesTab />}
    </div>
  );
}
