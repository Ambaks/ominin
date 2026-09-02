"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BotIcon } from "@/components/admin/icons";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/admin/api";
import { useAdminBasePath } from "@/lib/admin/base-path";
import {
  CLASSIFICATION_LABELS,
  DISQUALIFY_REASON_LABELS,
  OUTREACH_JOB_LABELS,
  OUTREACH_STATUS_LABELS,
  POSITIVE_CLASSIFICATIONS,
  QUALIFICATION_LABELS,
  VARIANT_STATUS_LABELS,
} from "@/lib/admin/constants";
import { formatDayTime, formatRelative } from "@/lib/admin/format";
import {
  CLASSIFICATION_BADGE_CLASSES,
  QUALIFICATION_BADGE_CLASSES,
  VARIANT_STATUS_BADGE_CLASSES,
} from "@/lib/admin/status";
import { refreshPendingDrafts, useAdmin } from "@/lib/admin/store";
import type {
  OutreachEmail,
  OutreachProspect,
  ProspectCounts,
  ProspectFilter,
  OutreachRun,
  OutreachStats,
  OutreachVariant,
  ResearchRun,
  VariantPerformance,
  VariantStatus,
} from "@/lib/admin/types";

/*
 * Poste de pilotage de l'agent « Léa » : brouillons à approuver, envois et
 * réponses, prospects, et la boucle AutoResearch (règles de rédaction à
 * approuver / promouvoir / retirer, dernière analyse). Rien ne part
 * immédiatement : un brouillon approuvé est envoyé par le run horaire
 * /agent/inbox (latence ≤ 1 h, voulue — une réponse instantanée ferait
 * robot) et une variante activée entre en rotation au prochain run
 * /agent/outreach, aux côtés de la référence qui sert de groupe témoin.
 */

type TabId =
  | "overview"
  | "pending"
  | "sent"
  | "received"
  | "prospects"
  | "research"
  | "runs";

const VARIANT_ORDER: Record<VariantStatus, number> = {
  candidate: 0,
  baseline: 1,
  active: 2,
  retired: 3,
};

const PRIMARY_BUTTON =
  "ember-gradient rounded-full px-3 py-1.5 text-xs font-semibold text-background";
const SECONDARY_BUTTON =
  "rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground";
const SECTION_TITLE =
  "text-[11px] font-semibold uppercase tracking-wider text-faint";

export default function LeaPage() {
  const state = useAdmin();
  const toast = useToast();
  const run = useRunMutation();
  const router = useRouter();
  const { basePath, localPath } = useAdminBasePath();

  const [tab, setTab] = useState<TabId>("overview");
  const [emails, setEmails] = useState<OutreachEmail[] | null>(null);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [prospects, setProspects] = useState<OutreachProspect[] | null>(null);
  const [prospectFilter, setProspectFilter] = useState<ProspectFilter>("all");
  const [prospectCounts, setProspectCounts] = useState<ProspectCounts | null>(
    null
  );
  const [runs, setRuns] = useState<OutreachRun[] | null>(null);
  const [variants, setVariants] = useState<OutreachVariant[] | null>(null);
  // undefined = pas encore chargé ; null = aucune analyse aboutie.
  const [research, setResearch] = useState<ResearchRun | null | undefined>(
    undefined
  );
  const [drafts, setDrafts] = useState<
    Record<string, { subject: string; bodyText: string }>
  >({});
  const [expandedVariant, setExpandedVariant] = useState<string | null>(null);

  const fail = useCallback(
    (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      ),
    [toast]
  );

  const reload = useCallback(() => {
    // Recale aussi le badge de nav (compteur store) sur la réalité.
    void refreshPendingDrafts();
    api.fetchOutreachEmails().then(setEmails).catch(fail);
    api.fetchOutreachStats().then(setStats).catch(fail);
  }, [fail]);

  const reloadVariants = useCallback(() => {
    api.fetchOutreachVariants().then(setVariants).catch(fail);
  }, [fail]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const research_needed = tab === "overview" || tab === "research";
    if (tab === "runs" && runs === null) {
      api.fetchOutreachRuns().then(setRuns).catch(fail);
    }
    if (tab === "prospects" && prospects === null) {
      api.fetchOutreachProspects(prospectFilter).then(setProspects).catch(fail);
    }
    if (tab === "prospects" && prospectCounts === null) {
      api.fetchProspectCounts().then(setProspectCounts).catch(fail);
    }
    if (research_needed && variants === null) reloadVariants();
    if (research_needed && research === undefined) {
      api.fetchLatestResearchRun().then(setResearch).catch(fail);
    }
  }, [
    tab,
    runs,
    prospects,
    prospectFilter,
    prospectCounts,
    variants,
    research,
    fail,
    reloadVariants,
  ]);

  const changeProspectFilter = useCallback((filter: ProspectFilter) => {
    setProspectFilter(filter);
    setProspects(null);
  }, []);

  const nameById = useMemo(
    () =>
      new Map(
        (state?.leads ?? []).map((lead) => [lead.restaurantId, lead.name])
      ),
    [state?.leads]
  );
  const byId = useMemo(
    () => new Map((emails ?? []).map((email) => [email.id, email])),
    [emails]
  );
  const sortedVariants = useMemo(
    () =>
      [...(variants ?? [])].sort(
        (a, b) => VARIANT_ORDER[a.status] - VARIANT_ORDER[b.status]
      ),
    [variants]
  );

  const all = emails ?? [];
  const pending = all.filter((e) => e.status === "pending_approval");
  const sent = all.filter(
    (e) => e.direction === "outbound" && e.status !== "pending_approval"
  );
  const received = all.filter((e) => e.direction === "inbound");
  const positiveReplies = received.filter(
    (e) => e.classification && POSITIVE_CLASSIFICATIONS.includes(e.classification)
  );
  const activeVariants = sortedVariants.filter((v) => v.status === "active");
  const candidateVariants = sortedVariants.filter(
    (v) => v.status === "candidate"
  );
  const promotedBaseline =
    sortedVariants.find((v) => v.status === "baseline") ?? null;

  const performanceOf = (id: string | null): VariantPerformance | null =>
    research?.variantPerformance.find((p) => p.id === id) ?? null;

  const openLead = (restaurantId: string) =>
    router.push(`${basePath}${localPath}?lead=${restaurantId}`);

  const draftFor = (email: OutreachEmail) =>
    drafts[email.id] ?? {
      subject: email.subject ?? "",
      bodyText: email.bodyText ?? "",
    };

  const approve = (email: OutreachEmail) => {
    const edited = draftFor(email);
    const changed =
      edited.subject !== (email.subject ?? "") ||
      edited.bodyText !== (email.bodyText ?? "");
    void run(async () => {
      if (changed) await api.updateOutreachDraft(email.id, edited);
      await api.approveOutreachEmail(email.id);
      reload();
    }, "Brouillon approuvé — envoi au prochain passage de l'agent.");
  };

  const reject = (email: OutreachEmail) =>
    void run(async () => {
      await api.rejectOutreachEmail(email.id);
      reload();
    }, "Brouillon rejeté.");

  const setVariantStatus = (
    variant: OutreachVariant,
    status: VariantStatus,
    message: string
  ) =>
    void run(async () => {
      await api.updateVariantStatus(variant.id, status);
      reloadVariants();
    }, message);

  const promote = (variant: OutreachVariant) =>
    void run(async () => {
      await api.promoteVariant(variant.id);
      reloadVariants();
    }, `« ${variant.name} » devient la référence au prochain envoi.`);

  const variantActions = (variant: OutreachVariant) => {
    switch (variant.status) {
      case "candidate":
        return (
          <>
            <button
              type="button"
              onClick={() =>
                setVariantStatus(
                  variant,
                  "active",
                  `« ${variant.name} » entre en rotation au prochain envoi.`
                )
              }
              className={PRIMARY_BUTTON}
            >
              Activer
            </button>
            <button
              type="button"
              onClick={() =>
                setVariantStatus(
                  variant,
                  "retired",
                  `« ${variant.name} » rejetée.`
                )
              }
              className={SECONDARY_BUTTON}
            >
              Rejeter
            </button>
          </>
        );
      case "active":
        return (
          <>
            <button
              type="button"
              onClick={() => promote(variant)}
              className={SECONDARY_BUTTON}
            >
              Promouvoir en référence
            </button>
            <button
              type="button"
              onClick={() =>
                setVariantStatus(
                  variant,
                  "retired",
                  `« ${variant.name} » retirée de la rotation.`
                )
              }
              className={SECONDARY_BUTTON}
            >
              Retirer
            </button>
          </>
        );
      case "baseline":
        return (
          <button
            type="button"
            onClick={() =>
              setVariantStatus(
                variant,
                "retired",
                "Référence retirée — retour aux règles par défaut."
              )
            }
            className={SECONDARY_BUTTON}
          >
            Retirer
          </button>
        );
      case "retired":
        return (
          <button
            type="button"
            onClick={() =>
              setVariantStatus(
                variant,
                "active",
                `« ${variant.name} » de retour en rotation au prochain envoi.`
              )
            }
            className={SECONDARY_BUTTON}
          >
            Réactiver
          </button>
        );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="ember-gradient flex size-9 items-center justify-center rounded-xl">
          <BotIcon className="size-4.5 text-background" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium">Agent Léa</h1>
          <p className="text-xs text-faint">
            Prospection automatisée &amp; AutoResearch
          </p>
        </div>
      </div>

      <PillTabs
        tabs={[
          { id: "overview", label: "Vue d'ensemble" },
          { id: "pending", label: "À approuver", count: pending.length },
          { id: "sent", label: "Envoyés", count: sent.length },
          { id: "received", label: "Réponses", count: received.length },
          { id: "prospects", label: "Prospects" },
          {
            id: "research",
            label: "Recherche",
            count: candidateVariants.length || undefined,
          },
          { id: "runs", label: "Runs" },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as TabId)}
      />

      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="E-mails envoyés"
              value={stats ? String(stats.sent) : "…"}
            />
            <StatCard
              label="Taux de réponse"
              value={stats ? percent(stats.responded, stats.sent) : "…"}
              hint={
                stats
                  ? `${stats.responded} restaurant${stats.responded > 1 ? "s" : ""}, hors rebonds`
                  : undefined
              }
            />
            <StatCard
              label="Réponses positives"
              value={stats ? String(stats.positive) : "…"}
              hint="intéressé, RDV ou question"
            />
            <StatCard
              label="Règles en rotation"
              value={variants ? String(activeVariants.length + 1) : "…"}
              hint={
                promotedBaseline
                  ? `Référence : ${promotedBaseline.name}`
                  : "Référence : règles par défaut"
              }
            />
          </div>

          {candidateVariants.length > 0 && (
            <div className="rounded-2xl border border-ember-2/30 bg-ember-2/5 p-4">
              <p className={`${SECTION_TITLE} text-ember-2`}>Action requise</p>
              <p className="mt-1 text-sm">
                {candidateVariants.length > 1
                  ? `${candidateVariants.length} variantes proposées`
                  : "1 variante proposée"}{" "}
                par AutoResearch —{" "}
                <button
                  type="button"
                  onClick={() => setTab("research")}
                  className="font-semibold text-ember-2 hover:underline"
                >
                  Examiner
                </button>
              </p>
            </div>
          )}

          {research && (
            <div className="flex flex-col gap-3">
              <p className={SECTION_TITLE}>Dernière analyse AutoResearch</p>
              <FindingsCard research={research} />
            </div>
          )}

          {positiveReplies.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className={SECTION_TITLE}>Réponses positives récentes</p>
              <div className="flex flex-col gap-2">
                {positiveReplies.slice(0, 5).map((email) => (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() => openLead(email.restaurantId)}
                    className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-left transition-colors hover:bg-surface-raised"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {nameById.get(email.restaurantId) ??
                          email.fromEmail ??
                          "—"}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {email.bodyText}
                      </span>
                    </span>
                    {email.classification && (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[email.classification]}`}
                      >
                        {CLASSIFICATION_LABELS[email.classification]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "pending" &&
        (pending.length === 0 ? (
          <EmptyState
            title="Rien à approuver"
            body="Quand un restaurateur répond, l'agent classe la réponse et prépare un brouillon qui apparaît ici."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {pending.map((email) => {
              const inbound = email.inReplyTo
                ? (byId.get(email.inReplyTo) ?? null)
                : null;
              const edited = draftFor(email);
              return (
                <div
                  key={email.id}
                  className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openLead(email.restaurantId)}
                      className="font-medium hover:underline"
                    >
                      {nameById.get(email.restaurantId) ?? email.toEmail}
                    </button>
                    {inbound?.classification && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[inbound.classification]}`}
                      >
                        {CLASSIFICATION_LABELS[inbound.classification]}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-faint">
                      {formatRelative(email.createdAt)}
                    </span>
                  </div>

                  {inbound && (
                    <blockquote className="whitespace-pre-wrap rounded-xl bg-surface-raised p-3 text-sm text-muted">
                      {inbound.bodyText}
                    </blockquote>
                  )}

                  <input
                    className={inputClass}
                    value={edited.subject}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [email.id]: { ...edited, subject: event.target.value },
                      }))
                    }
                  />
                  <textarea
                    className={`${inputClass} min-h-56 font-mono text-sm`}
                    value={edited.bodyText}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [email.id]: { ...edited, bodyText: event.target.value },
                      }))
                    }
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => reject(email)}
                      className="rounded-full border border-hairline px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
                    >
                      Rejeter
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(email)}
                      className="ember-gradient rounded-full px-4 py-2 text-sm font-semibold text-background"
                    >
                      Approuver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "sent" &&
        (sent.length === 0 ? (
          <EmptyState
            title="Aucun e-mail envoyé"
            body="Les e-mails de prospection de l'agent apparaîtront ici après le premier run."
          />
        ) : (
          <EmailTable
            emails={sent}
            nameById={nameById}
            onOpen={openLead}
            dateOf={(email) => email.sentAt ?? email.createdAt}
          />
        ))}

      {tab === "received" &&
        (received.length === 0 ? (
          <EmptyState
            title="Aucune réponse reçue"
            body="Les réponses des restaurateurs, classées par l'agent, apparaîtront ici."
          />
        ) : (
          <EmailTable
            emails={received}
            nameById={nameById}
            onOpen={openLead}
            dateOf={(email) => email.receivedAt ?? email.createdAt}
          />
        ))}

      {tab === "prospects" && (
        <ProspectsPanel
          prospects={prospects}
          counts={prospectCounts}
          filter={prospectFilter}
          onFilter={changeProspectFilter}
          nameById={nameById}
          onOpen={openLead}
        />
      )}

      {tab === "research" && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>Règles de rédaction</p>
            {variants === null ? (
              <div className="shimmer h-32 rounded-2xl" />
            ) : (
              <div className="flex flex-col gap-3">
                {!promotedBaseline && (
                  <VariantCard
                    name="Règles par défaut"
                    hypothesis="Règles de rédaction d'origine, définies dans le backend. Servies comme groupe témoin tant qu'aucune variante n'est promue."
                    status="baseline"
                    performance={performanceOf(null)}
                  />
                )}
                {sortedVariants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    name={variant.name}
                    hypothesis={variant.hypothesis}
                    status={variant.status}
                    performance={performanceOf(variant.id)}
                    promptRules={variant.promptRules}
                    createdAt={variant.createdAt}
                    expanded={expandedVariant === variant.id}
                    onToggle={() =>
                      setExpandedVariant(
                        expandedVariant === variant.id ? null : variant.id
                      )
                    }
                  >
                    {variantActions(variant)}
                  </VariantCard>
                ))}
                {sortedVariants.length === 0 && (
                  <EmptyState
                    title="Aucune variante"
                    body="AutoResearch proposera une variante des règles après analyse des e-mails envoyés et des réponses reçues."
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className={SECTION_TITLE}>Dernière analyse</p>
            {research === undefined ? (
              <div className="shimmer h-32 rounded-2xl" />
            ) : research ? (
              <FindingsCard research={research} />
            ) : (
              <EmptyState
                title="Aucune analyse"
                body="AutoResearch tourne chaque dimanche dès qu'assez d'e-mails ont eu le temps d'obtenir une réponse ; il peut aussi être lancé à la main depuis GitHub Actions."
              />
            )}
          </div>
        </div>
      )}

      {tab === "runs" && (
        <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
          <table className="w-full min-w-125 text-left text-sm">
            <thead>
              <tr className={SECTION_TITLE}>
                <th className="px-4 py-3">Tâche</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              {(runs ?? []).map((row) => (
                <tr key={row.id} className="border-t border-hairline">
                  <td className="px-4 py-3 font-medium">
                    {OUTREACH_JOB_LABELS[row.job] ?? row.job}
                  </td>
                  <td
                    className={`px-4 py-3 ${
                      row.status === "failed"
                        ? "font-semibold text-status-lost"
                        : "text-muted"
                    }`}
                  >
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDayTime(row.startedAt)}
                  </td>
                  <td className="max-w-90 truncate px-4 py-3 text-xs text-faint">
                    {row.error ?? JSON.stringify(row.stats)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function percent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
  })} %`;
}

function VariantCard({
  name,
  hypothesis,
  status,
  performance,
  promptRules,
  createdAt,
  expanded,
  onToggle,
  children,
}: {
  name: string;
  hypothesis: string;
  status: VariantStatus;
  performance: VariantPerformance | null;
  promptRules?: string;
  createdAt?: string;
  expanded?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{name}</p>
          <p className="mt-0.5 text-sm text-muted">{hypothesis}</p>
          <p className="mt-1 text-xs text-faint">
            {performance
              ? `${performance.sent} envoyé${performance.sent > 1 ? "s" : ""} · ${performance.responded} réponse${performance.responded > 1 ? "s" : ""} (${percent(performance.responded, performance.sent)}) à la dernière analyse`
              : "Pas encore mesurée"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${VARIANT_STATUS_BADGE_CLASSES[status]}`}
        >
          {VARIANT_STATUS_LABELS[status]}
        </span>
        <div className="flex shrink-0 flex-wrap gap-2">
          {children}
          {promptRules && (
            <button
              type="button"
              onClick={onToggle}
              className={SECONDARY_BUTTON}
            >
              {expanded ? "Masquer" : "Voir le prompt"}
            </button>
          )}
        </div>
      </div>
      {expanded && promptRules && (
        <div className="border-t border-hairline p-4">
          <pre className="whitespace-pre-wrap rounded-xl bg-surface-raised p-4 font-mono text-xs leading-relaxed text-muted">
            {promptRules}
          </pre>
          {createdAt && (
            <p className="mt-2 text-[11px] text-faint">
              Créée {formatRelative(createdAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FindingsCard({ research }: { research: ResearchRun }) {
  const sections = [
    { title: "Patterns de réponse", items: research.findings.responsePatterns },
    {
      title: "Qualité des e-mails",
      items: research.findings.emailQualityInsights,
    },
    {
      title: "Patterns dans les données",
      items: research.findings.inputDataPatterns,
    },
    { title: "Recommandations", items: research.findings.promptRecommendations },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-faint">
        {formatDayTime(research.startedAt)} · {research.analyzed} e-mail
        {research.analyzed > 1 ? "s" : ""} analysé
        {research.analyzed > 1 ? "s" : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
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
    </div>
  );
}

const PROSPECT_TILES: {
  id: Exclude<ProspectFilter, "all">;
  label: string;
}[] = [
  { id: "qualified", label: "Qualifiés" },
  { id: "pending", label: "En attente" },
  { id: "no_email", label: "Pas d'e-mail" },
  { id: "has_digital_menu", label: "Déjà digitalisés" },
  { id: "not_worth", label: "Hors cible" },
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ProspectsPanel({
  prospects,
  counts,
  filter,
  onFilter,
  nameById,
  onOpen,
}: {
  prospects: OutreachProspect[] | null;
  counts: ProspectCounts | null;
  filter: ProspectFilter;
  onFilter: (filter: ProspectFilter) => void;
  nameById: Map<string, string>;
  onOpen: (restaurantId: string) => void;
}) {
  const scored = (prospects ?? []).filter(
    (p) => p.qualification === "qualified" && p.priorityScore != null
  );
  const averageScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, p) => sum + (p.priorityScore ?? 0), 0) /
            scored.length
        )
      : null;
  const activeLabel = PROSPECT_TILES.find((t) => t.id === filter)?.label;
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {PROSPECT_TILES.map((tile) => {
          const active = filter === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              aria-pressed={active}
              onClick={() => onFilter(active ? "all" : tile.id)}
              className={`flex flex-col gap-2 rounded-2xl border p-5 text-left transition-colors ${
                active
                  ? "border-ember-2 bg-surface-raised"
                  : "border-hairline bg-surface hover:border-ember-2/40"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                {tile.label}
              </span>
              <span className="font-display text-3xl font-medium">
                {counts ? counts[tile.id] : "—"}
              </span>
            </button>
          );
        })}
        <StatCard
          label="Score moyen"
          value={averageScore != null ? `${averageScore}/100` : "—"}
          hint={`${scored.length} qualifié${scored.length > 1 ? "s" : ""} scoré${scored.length > 1 ? "s" : ""}`}
        />
      </div>

      <p className="text-xs text-muted">
        {activeLabel
          ? `${prospects ? prospects.length : "…"} · ${activeLabel} — cliquer à nouveau la tuile pour revenir aux prospects récents.`
          : "Prospects les plus récents — cliquer une tuile pour lister tout un verdict."}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className={SECTION_TITLE}>
              <th className="px-4 py-3">Restaurant</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Verdict</th>
              <th className="w-20 px-4 py-3">Score</th>
              <th className="px-4 py-3">Notes de l&apos;agent</th>
            </tr>
          </thead>
          <tbody>
            {prospects === null || prospects.length === 0 ? (
              <tr className="border-t border-hairline">
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted">
                  {prospects === null
                    ? "Chargement…"
                    : "Aucun prospect pour ce verdict."}
                </td>
              </tr>
            ) : null}
            {(prospects ?? []).map((prospect) => (
              <tr
                key={prospect.restaurantId}
                onClick={() => onOpen(prospect.restaurantId)}
                className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-raised"
              >
                <td className="px-4 py-3 font-medium">
                  {prospect.name ?? nameById.get(prospect.restaurantId) ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {prospect.city ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {prospect.phone ? (
                    <a
                      href={`tel:${prospect.phone}`}
                      onClick={stop}
                      className="whitespace-nowrap hover:underline"
                    >
                      {prospect.phone}
                    </a>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {prospect.website ? (
                    <a
                      href={prospect.website}
                      target="_blank"
                      rel="noreferrer"
                      onClick={stop}
                      className="text-ember-2 hover:underline"
                    >
                      {hostOf(prospect.website)}
                    </a>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${QUALIFICATION_BADGE_CLASSES[prospect.qualification]}`}
                  >
                    {prospect.disqualifyReason
                      ? (DISQUALIFY_REASON_LABELS[prospect.disqualifyReason] ??
                        prospect.disqualifyReason)
                      : QUALIFICATION_LABELS[prospect.qualification]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {prospect.priorityScore != null ? (
                    <span
                      className={`font-mono text-xs font-semibold ${scoreColor(prospect.priorityScore)}`}
                    >
                      {prospect.priorityScore}
                    </span>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </td>
                <td className="max-w-100 px-4 py-3 text-xs text-muted">
                  <span className="line-clamp-2">
                    {prospect.aiNotes ?? "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailTable({
  emails,
  nameById,
  onOpen,
  dateOf,
}: {
  emails: OutreachEmail[];
  nameById: Map<string, string>;
  onOpen: (restaurantId: string) => void;
  dateOf: (email: OutreachEmail) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
      <table className="w-full min-w-125 text-left text-sm">
        <thead>
          <tr className={SECTION_TITLE}>
            <th className="px-4 py-3">Restaurant</th>
            <th className="px-4 py-3">Objet</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr
              key={email.id}
              onClick={() => onOpen(email.restaurantId)}
              className="cursor-pointer border-t border-hairline transition-colors hover:bg-surface-raised"
            >
              <td className="px-4 py-3 font-medium">
                {nameById.get(email.restaurantId) ??
                  email.toEmail ??
                  email.fromEmail}
              </td>
              <td className="max-w-90 truncate px-4 py-3 text-muted">
                {email.subject ?? "—"}
              </td>
              <td className="px-4 py-3">
                {email.direction === "inbound" && email.classification ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICATION_BADGE_CLASSES[email.classification]}`}
                  >
                    {CLASSIFICATION_LABELS[email.classification]}
                  </span>
                ) : (
                  <span
                    className={
                      email.status === "failed"
                        ? "font-semibold text-status-lost"
                        : "text-muted"
                    }
                  >
                    {OUTREACH_STATUS_LABELS[email.status]}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {formatRelative(dateOf(email))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mêmes paliers que SCORING_SYSTEM côté backend. */
function scoreColor(score: number): string {
  if (score >= 80) return "text-status-signed";
  if (score >= 50) return "text-status-interested";
  if (score >= 20) return "text-ember-2";
  return "text-status-lost";
}
