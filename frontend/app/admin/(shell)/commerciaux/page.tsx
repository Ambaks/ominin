"use client";

import { useEffect, useState } from "react";
import { CommerciauxTab } from "@/components/admin/commerciaux/commerciaux-tab";
import { RelevesTab } from "@/components/admin/commerciaux/releves-tab";
import { PillTabs } from "@/components/ui/pill-tabs";

/*
 * Les commerciaux indépendants : qui est invité et sous contrat, leur fiche,
 * les réglages communs et leurs relevés.
 */

const TABS = [
  { id: "commerciaux", label: "Commerciaux" },
  { id: "releves", label: "Relevés" },
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
        <p className="mt-1 text-sm text-muted">Apporteurs d’affaires indépendants : contrats, restaurants, relevés.</p>
      </div>
      <PillTabs tabs={[...TABS]} activeId={tab} onSelect={(id) => setTab(id as TabId)} />
      {tab === "commerciaux" && <CommerciauxTab />}
      {tab === "releves" && <RelevesTab />}
    </div>
  );
}
