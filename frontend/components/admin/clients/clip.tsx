"use client";

import { useMemo } from "react";
import { StatTile } from "@/components/admin/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatPercent, formatRelative } from "@/lib/admin/format";
import { fetchClipClients, type ClipClient } from "@/lib/admin/metrics";
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
 * Synthèse Clip : qui publie, et si la publication passe. Les vues et la
 * portée vivent chez le prestataire de publication, pas en base : l'écran
 * s'en tient à ce qu'Ominin sait. Décroche un clippeur qui publiait la
 * période d'avant et plus du tout sur celle-ci.
 */

export function ClipClients() {
  const { days, setDays, data } = usePeriodPair(fetchClipClients);
  const rows = data?.rows ?? null;

  const totals = useMemo(() => {
    const all = rows ?? [];
    const sum = (pick: (row: ClipClient) => number) =>
      all.reduce((total, row) => total + pick(row), 0);
    return {
      posts: sum((row) => row.posts),
      published: sum((row) => row.published),
      partial: sum((row) => row.partial),
      failed: sum((row) => row.failed),
      active: all.filter((row) => row.posts > 0).length,
    };
  }, [rows]);

  const declining = useMemo(() => {
    if (!data) return [];
    const before = new Map(data.previous.map((row) => [row.user_id, row.posts]));
    return data.rows.flatMap((row) => {
      const previous = before.get(row.user_id) ?? 0;
      return previous > 0 && row.posts === 0
        ? [
            {
              key: row.user_id,
              name: row.email,
              detail: `${plural(previous, "clip")} → aucun${
                row.last_post_at
                  ? ` · dernier ${formatRelative(row.last_post_at)}`
                  : ""
              }`,
            },
          ]
        : [];
    });
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <PeriodHeader
        title="Synthèse"
        subtitle="Les clippeurs : ce qu'ils publient et si la publication passe."
        days={days}
        onDays={setDays}
      />

      {rows === null ? (
        <ClientsSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Aucun clippeur"
          body="Un clippeur apparaît ici dès qu'il a relié son compte de publication."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Clips envoyés"
              value={String(totals.posts)}
              hint={`${formatPercent(totals.posts ? totals.published / totals.posts : 0)} publiés partout`}
            />
            <StatTile
              label="Publiés en partie"
              value={String(totals.partial)}
              hint="une plateforme au moins a refusé"
            />
            <StatTile label="Échecs" value={String(totals.failed)} />
            <StatTile
              label="Clippeurs actifs"
              value={String(totals.active)}
              hint={`sur ${plural(rows.length, "clippeur")}`}
            />
          </div>

          <AlertList
            title="Clippeurs qui décrochent"
            body={`Des clips sur les ${days} jours d'avant, aucun sur les ${days} derniers.`}
            items={declining}
          />

          <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">
            <table className="w-full min-w-184 text-sm">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className={TH}>Clippeur</th>
                  <th className={TH_NUM}>Clips</th>
                  <th className={TH_NUM}>Publiés</th>
                  <th className={TH_NUM}>Partiels</th>
                  <th className={TH_NUM}>Échecs</th>
                  <th className={TH}>Plateformes</th>
                  <th className={TH_NUM}>Dernier clip</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id} className={TABLE_ROW}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.email}</p>
                      <p className="text-xs text-faint">
                        relié le {formatDate(row.linked_at)}
                      </p>
                    </td>
                    <td className={TD_NUM}>{row.posts}</td>
                    <td className={TD_NUM}>{row.published}</td>
                    <td className={`${TD_NUM} text-muted`}>{row.partial}</td>
                    <td className={`${TD_NUM} text-muted`}>{row.failed}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.platforms.join(", ") || "—"}
                    </td>
                    <td className={`${TD_NUM} text-muted`}>
                      {row.last_post_at ? formatRelative(row.last_post_at) : "—"}
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
