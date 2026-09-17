"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation } from "@/components/ui/toast";
import { formatDayTime } from "@/lib/admin/format";
import * as api from "@/lib/admin/social";
import type { SocialPlaybook } from "@/lib/admin/social";
import { BRANDS, type SocialBrand } from "@/lib/social/brands";
import { SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * La ligne éditoriale que l'agent suit, marque par marque, et la façon dont
 * elle a évolué. Il la réécrit seul après chaque analyse : cet écran sert à
 * comprendre ce qu'il a changé et pourquoi, et à revenir en arrière si une
 * version part dans le mauvais sens.
 */
export function PlaybookTab({
  playbooks,
  onChange,
}: {
  playbooks: SocialPlaybook[];
  onChange: () => void;
}) {
  const run = useRunMutation();
  const [brand, setBrand] = useState<SocialBrand>(BRANDS[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Déjà triées de la plus récente à la plus ancienne.
  const versions = playbooks.filter((playbook) => playbook.brand === brand);
  const [current, ...history] = versions;

  const findings = current
    ? [
        { title: "Ce qui marche", items: current.findings.whatWorks },
        { title: "Ce qui échoue", items: current.findings.whatFails },
        { title: "Paris à tenter", items: current.findings.nextExperiments },
      ].filter((section) => section.items.length > 0)
    : [];

  return (
    <div className="flex flex-col gap-5">
      <PillTabs
        tabs={BRANDS.map((item) => ({ id: item.id, label: item.name }))}
        activeId={brand}
        onSelect={(id) => setBrand(id as SocialBrand)}
      />

      {!current ? (
        <EmptyState
          title="Pas encore de ligne éditoriale"
          body="L'agent inscrit sa ligne de départ à la première publication de cette marque, puis la réécrit à mesure que les résultats arrivent."
        />
      ) : (
        <>
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className={SECTION_TITLE}>
              En vigueur · version {current.version} ·{" "}
              {formatDayTime(current.createdAt)}
            </p>
            <p className="mt-2 text-sm">{current.changeSummary}</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-raised p-4 font-sans text-sm leading-relaxed text-muted">
              {current.guidelines}
            </pre>
          </div>

          {findings.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {findings.map((section) => (
                <div
                  key={section.title}
                  className="rounded-2xl border border-hairline bg-surface p-4"
                >
                  <p className={SECTION_TITLE}>{section.title}</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {section.items.map((item, index) => (
                      <li key={index} className="text-sm text-muted">
                        <span className="mr-1.5 text-ember-2">&#x2022;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className={SECTION_TITLE}>Versions précédentes</p>
              {history.map((playbook) => (
                <div
                  key={playbook.id}
                  className="rounded-2xl border border-hairline bg-surface"
                >
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-faint">
                        Version {playbook.version} ·{" "}
                        {formatDayTime(playbook.createdAt)}
                      </p>
                      <p className="mt-0.5 text-sm">{playbook.changeSummary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(expanded === playbook.id ? null : playbook.id)
                      }
                      className={SECONDARY_BUTTON}
                    >
                      {expanded === playbook.id ? "Masquer" : "Lire"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api.restorePlaybook(playbook, current.version);
                          onChange();
                        }, `Version ${playbook.version} rétablie : l'agent la suit dès la prochaine publication.`)
                      }
                      className={SECONDARY_BUTTON}
                    >
                      Revenir à cette version
                    </button>
                  </div>
                  {expanded === playbook.id && (
                    <pre className="whitespace-pre-wrap border-t border-hairline p-4 font-sans text-sm leading-relaxed text-muted">
                      {playbook.guidelines}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
