"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation } from "@/components/ui/toast";
import { formatDayTime } from "@/lib/admin/format";
import * as api from "@/lib/admin/social";
import type { SocialPlaybook } from "@/lib/admin/social";
import type { Brand, SocialBrand } from "@/lib/social/brands";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_TITLE } from "./styles";

/*
 * La ligne éditoriale que l'agent suit, marque par marque, et la façon dont
 * elle a évolué. Personne ne la change seul : l'analyse hebdomadaire des
 * résultats propose une version, qu'on adopte ou qu'on ignore ; on peut
 * aussi la corriger à la main, ou revenir à une version précédente.
 */
export function PlaybookTab({
  brands,
  playbooks,
  onChange,
}: {
  /** Marques de la vue : une seule dans la vue d'un produit. */
  brands: readonly Brand[];
  playbooks: SocialPlaybook[];
  onChange: () => void;
}) {
  const run = useRunMutation();
  const [brand, setBrand] = useState<SocialBrand>(brands[0].id);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  // Déjà triées de la plus récente à la plus ancienne.
  const versions = playbooks.filter((playbook) => playbook.brand === brand);
  const [current, ...history] = versions;
  const proposal = current?.proposal ?? null;

  // Le dernier bilan : celui de la proposition en attente, sinon celui qui a
  // produit la version en vigueur.
  const latestFindings = proposal?.findings ?? current?.findings;
  const findings = latestFindings
    ? [
        { title: "Ce qui marche", items: latestFindings.whatWorks },
        { title: "Ce qui échoue", items: latestFindings.whatFails },
        { title: "Paris à tenter", items: latestFindings.nextExperiments },
      ].filter((section) => section.items.length > 0)
    : [];

  return (
    <div className="flex flex-col gap-5">
      {brands.length > 1 && (
        <PillTabs
          tabs={brands.map((item) => ({ id: item.id, label: item.name }))}
          activeId={brand}
          onSelect={(id) => {
            setBrand(id as SocialBrand);
            setDraft(null);
          }}
        />
      )}

      {!current ? (
        <EmptyState
          title="Pas encore de ligne éditoriale"
          body="La ligne de départ de chaque marque est posée par les migrations : si elle manque, la base n'est pas à jour."
        />
      ) : (
        <>
          {proposal?.guidelines && (
            <div className="rounded-2xl border border-ember-2/40 bg-surface p-4">
              <p className={SECTION_TITLE}>
                Proposée par l&apos;analyse · {formatDayTime(proposal.createdAt)}
              </p>
              <p className="mt-2 text-sm">{proposal.changeSummary}</p>
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-raised p-4 font-sans text-sm leading-relaxed text-muted">
                {proposal.guidelines}
              </pre>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await api.addPlaybookVersion(
                        current,
                        proposal.guidelines ?? current.guidelines,
                        proposal.changeSummary ?? "Proposition de l'analyse adoptée.",
                        proposal.findings
                      );
                      onChange();
                    }, "Ligne adoptée : l'agent la suit dès les prochains brouillons.")
                  }
                  className={PRIMARY_BUTTON}
                >
                  Adopter
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void run(async () => {
                      await api.dismissProposal(current.id);
                      onChange();
                    }, "Proposition ignorée.")
                  }
                  className={SECONDARY_BUTTON}
                >
                  Ignorer
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${SECTION_TITLE} flex-1`}>
                En vigueur · version {current.version} ·{" "}
                {formatDayTime(current.createdAt)}
              </p>
              {draft === null && (
                <button
                  type="button"
                  onClick={() => setDraft(current.guidelines)}
                  className={SECONDARY_BUTTON}
                >
                  Modifier
                </button>
              )}
            </div>
            <p className="mt-2 text-sm">{current.changeSummary}</p>
            {draft === null ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-raised p-4 font-sans text-sm leading-relaxed text-muted">
                {current.guidelines}
              </pre>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    await api.addPlaybookVersion(
                      current,
                      draft.trim(),
                      "Modifiée à la main."
                    );
                    setDraft(null);
                    onChange();
                  }, "Ligne enregistrée : l'agent la suit dès les prochains brouillons.");
                }}
                className="mt-3 flex flex-col gap-2"
              >
                <textarea
                  aria-label="Ligne éditoriale"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={14}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!draft.trim() || draft.trim() === current.guidelines}
                    className={`${PRIMARY_BUTTON} disabled:opacity-50`}
                  >
                    Enregistrer comme nouvelle version
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className={SECONDARY_BUTTON}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
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
                        setExpanded(
                          expanded === playbook.id ? null : playbook.id
                        )
                      }
                      className={SECONDARY_BUTTON}
                    >
                      {expanded === playbook.id ? "Masquer" : "Lire"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void run(async () => {
                          await api.addPlaybookVersion(
                            current,
                            playbook.guidelines,
                            `Retour manuel à la version ${playbook.version}.`
                          );
                          onChange();
                        }, `Version ${playbook.version} rétablie : l'agent la suit dès les prochains brouillons.`)
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
