"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PersonChip, ProjetFrame } from "@/components/admin/projet/frame";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatDate } from "@/lib/admin/format";
import { PRODUCT_LABELS } from "@/lib/admin/products";
import {
  PRIORITY_LABEL,
  issueStatus,
  issueTypes,
  personLabel,
  sortGates,
  splitGateTitle,
  type IssueStatus,
  type ProjetData,
  type ProjetIssue,
} from "@/lib/admin/projet";

/*
 * Les issues ouvertes, rangées par gate. Deux filtres : la personne (ou
 * personne), le statut. ?gate=<n> resserre sur une gate — c'est là que mène
 * chaque ligne du Planning.
 */

const STATUS_LABELS: Record<IssueStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  blocked: "Bloquée",
};

const STATUS_DOTS: Record<IssueStatus, string> = {
  todo: "border border-hairline",
  in_progress: "bg-ember-1",
  blocked: "bg-ember-3",
};

const UNASSIGNED = "~";
const ALL = "*";

function IssueRow({
  issue,
  status,
}: {
  issue: ProjetIssue;
  status: IssueStatus;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface px-3.5 py-3">
      <span
        title={STATUS_LABELS[status]}
        className={`size-2.5 shrink-0 rounded-full ${STATUS_DOTS[status]}`}
      />
      <a
        href={issue.url}
        target="_blank"
        rel="noopener"
        className="min-w-0 flex-1 text-sm transition-colors hover:text-ember-1"
      >
        <span className="text-faint">#{issue.number} </span>
        {issue.title}
      </a>
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        {issue.labels.includes(PRIORITY_LABEL) && (
          <span className="rounded-full border border-ember-3/40 px-2 py-0.5 text-[10px] font-semibold text-ember-3">
            priorité
          </span>
        )}
        {issueTypes(issue).map((type) => (
          <span
            key={type}
            className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted"
          >
            {type}
          </span>
        ))}
      </div>
      <div className="flex shrink-0 -space-x-1.5">
        {issue.assignees.map((person) => (
          <PersonChip key={person.login} name={personLabel(person)} />
        ))}
      </div>
    </li>
  );
}

function Taches({ data }: { data: ProjetData }) {
  const router = useRouter();
  const params = useSearchParams();
  const { basePath, localPath, product } = useAdminBasePath();
  const [person, setPerson] = useState(ALL);
  const [status, setStatus] = useState<IssueStatus | typeof ALL>(ALL);

  const gateFilter = Number(params.get("gate")) || null;
  const statusOf = new Map(
    data.issues.map((issue) => [issue.number, issueStatus(issue, data.pulls)]),
  );

  const people = new Map<string, string>();
  for (const issue of data.issues) {
    for (const assignee of issue.assignees) {
      people.set(assignee.login, personLabel(assignee));
    }
  }

  const byPerson = data.issues.filter((issue) =>
    person === ALL
      ? true
      : person === UNASSIGNED
        ? issue.assignees.length === 0
        : issue.assignees.some((assignee) => assignee.login === person),
  );
  const visible = byPerson.filter(
    (issue) =>
      (status === ALL || statusOf.get(issue.number) === status) &&
      (gateFilter === null || issue.gate === gateFilter),
  );
  const countStatus = (value: IssueStatus) =>
    byPerson.filter((issue) => statusOf.get(issue.number) === value).length;

  const gates = sortGates(data.gates).filter(
    (gate) => gateFilter === null || gate.number === gateFilter,
  );
  const groups = [
    ...gates.map((gate) => ({
      key: String(gate.number),
      gate,
      issues: visible.filter((issue) => issue.gate === gate.number),
    })),
    {
      key: "hors-gate",
      gate: null,
      issues: visible.filter(
        (issue) =>
          issue.gate === null ||
          !data.gates.some((gate) => gate.number === issue.gate),
      ),
    },
  ].filter((group) => group.issues.length > 0);

  const focused = gateFilter
    ? data.gates.find((gate) => gate.number === gateFilter)
    : undefined;

  return (
    <>
      <div className="flex flex-col gap-3">
        <PillTabs
          tabs={[
            { id: ALL, label: "Tout le monde" },
            ...[...people].map(([login, name]) => ({ id: login, label: name })),
            { id: UNASSIGNED, label: "Non attribuées" },
          ]}
          activeId={person}
          onSelect={setPerson}
        />
        <PillTabs
          tabs={[
            { id: ALL, label: "Tous statuts" },
            ...(Object.keys(STATUS_LABELS) as IssueStatus[]).map((value) => ({
              id: value,
              label: STATUS_LABELS[value],
              count: countStatus(value),
            })),
          ]}
          activeId={status}
          onSelect={(id) => setStatus(id as IssueStatus | typeof ALL)}
        />
      </div>

      {focused && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-hairline bg-surface px-4 py-3 text-sm">
          <span>
            Gate : <span className="font-medium">{focused.title}</span>
          </span>
          <button
            type="button"
            onClick={() => router.replace(`${basePath}${localPath}`)}
            className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
          >
            Toutes les gates
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Aucune tâche ici"
          body="Changez de filtre, ou créez une issue sur GitHub avec son label produit et sa gate."
        />
      ) : (
        groups.map((group) => {
          const split = group.gate ? splitGateTitle(group.gate.title) : null;
          return (
            <section key={group.key} className="flex flex-col gap-2">
              <h2 className="flex flex-wrap items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
                {group.gate ? (
                  <Link
                    href={`${basePath}${localPath}?gate=${group.gate.number}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {!product &&
                      `${split?.product ? PRODUCT_LABELS[split.product] : "Transverse"} · `}
                    {split?.goal}
                  </Link>
                ) : (
                  <span>Hors gate</span>
                )}
                {group.gate?.dueOn && (
                  <span className="normal-case tracking-normal">
                    {formatDate(group.gate.dueOn)}
                  </span>
                )}
              </h2>
              <ul className="flex flex-col gap-2">
                {group.issues.map((issue) => (
                  <IssueRow
                    key={issue.number}
                    issue={issue}
                    status={statusOf.get(issue.number) ?? "todo"}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

export default function TachesPage() {
  return (
    <ProjetFrame title="Tâches" githubPath="issues">
      {(data) => (
        <Suspense>
          <Taches data={data} />
        </Suspense>
      )}
    </ProjetFrame>
  );
}
