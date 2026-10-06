"use client";

import { useMemo } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelative } from "@/lib/admin/format";
import { fetchAgentsClients, type AgentsClient } from "@/lib/admin/metrics";
import {
  AlertList,
  ClientsSkeleton,
  PeriodHeader,
  TABLE_HEAD,
  TABLE_ROW,
  TD_NUM,
  TH,
  TH_NUM,
  plural,
  usePeriodPair,
} from "./period";

/*
 * Synthèse Agents : ce que l'agent de chaque entreprise trouve, envoie et
 * récolte. Au-dessus, ce qui l'empêche de tourner — tout se lit sans seuil :
 * boîte à reconnecter, erreur au dernier passage, agent jamais activé ou mis
 * en pause, réponses qui attendent la validation du client.
 */

function blockers(row: AgentsClient): string[] {
  return [
    row.mailbox_error ? "boîte mail à reconnecter" : null,
    !row.mailbox_email ? "aucune boîte mail reliée" : null,
    row.last_error ? `erreur au dernier passage : ${row.last_error}` : null,
    !row.activated_at ? "pas encore activé" : null,
    row.activated_at && !row.enabled ? "agent en pause" : null,
    row.pending_approval > 0
      ? `${plural(row.pending_approval, "e-mail attend", "e-mails attendent")} sa validation`
      : null,
  ].filter((reason): reason is string => reason !== null);
}

export function AgentsClients() {
  const { days, setDays, data } = usePeriodPair(fetchAgentsClients);
  const rows = data?.rows ?? null;

  const totals = useMemo(() => {
    const all = rows ?? [];
    const sum = (pick: (row: AgentsClient) => number) =>
      all.reduce((total, row) => total + pick(row), 0);
    return {
      prospects: sum((row) => row.prospects),
      sent: sum((row) => row.sent),
      replies: sum((row) => row.replies),
      interested: sum((row) => row.interested),
      active: all.filter((row) => row.sent > 0).length,
    };
  }, [rows]);

  const alerts = useMemo(
    () =>
      (rows ?? []).flatMap((row) => {
        const reasons = blockers(row);
        return reasons.length
          ? [
              {
                key: row.user_id,
                name: row.company_name || row.email,
                detail: reasons.join(" · "),
              },
            ]
          : [];
      }),
    [rows],
  );

  return (
    <div className="flex flex-col gap-6">
      <PeriodHeader
        title="Synthèse"
        subtitle="Les entreprises équipées de l'agent : ce qu'il trouve, envoie et récolte."
        days={days}
        onDays={setDays}
      />

      {rows === null ? (
        <ClientsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucune entreprise"
          body="Une entreprise apparaît ici dès son inscription à Agents."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Prospects trouvés"
              value={String(totals.prospects)}
            />
            <StatTile label="E-mails envoyés" value={String(totals.sent)} />
            <StatTile
              label="Réponses"
              value={String(totals.replies)}
              hint={`dont ${plural(totals.interested, "intéressée")} ou RDV`}
            />
            <StatTile
              label="Agents qui envoient"
              value={String(totals.active)}
              hint={`sur ${plural(rows.length, "entreprise")}`}
            />
          </div>

          <AlertList
            title="Agents à débloquer"
            body="Ce qui empêche l'agent de tourner ou de répondre."
            items={alerts}
          />

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
            <table className="w-full min-w-184 text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className={TH}>Entreprise</th>
                  <th className={TH}>Envoi</th>
                  <th className={TH_NUM}>Prospects</th>
                  <th className={TH_NUM}>Envoyés</th>
                  <th className={TH_NUM}>Réponses</th>
                  <th className={TH_NUM}>Intéressés</th>
                  <th className={TH_NUM}>Dernier passage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className={TABLE_ROW}>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {row.company_name || "Sans nom"}
                      </p>
                      <p className="text-xs text-faint">
                        {row.mailbox_email ?? row.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {row.mode === "auto" ? "Automatique" : "Avec validation"}
                    </td>
                    <td className={TD_NUM}>{row.prospects}</td>
                    <td className={TD_NUM}>{row.sent}</td>
                    <td className={TD_NUM}>{row.replies}</td>
                    <td className={TD_NUM}>{row.interested}</td>
                    <td className={`${TD_NUM} text-muted`}>
                      {row.last_run_at ? formatRelative(row.last_run_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
