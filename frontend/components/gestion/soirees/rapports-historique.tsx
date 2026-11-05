"use client";

import Link from "next/link";
import { EmptyState, ErrorNotice, Input, ListPager, Plate, Shimmer } from "@/components/gestion/ui";
import { formatCents, formatNightShort } from "@/lib/club/format";
import type { RapportSoiree } from "@/lib/club/rapport";
import { fetchRapports } from "@/lib/gestion/club-api";
import { usePagedList } from "@/lib/use-paged-list";

/*
 * L'historique financier du club : ses soirées commencées, la plus récente
 * d'abord, chacune avec ses réservations et ses acomptes, et son rapport à un
 * toucher. Page par page depuis la base (club_rapports), recherche sur le
 * titre.
 */

const rowId = (row: RapportSoiree) => row.eventId;

export function RapportsHistorique() {
  const list = usePagedList({ fetchPage: fetchRapports, rowId });

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={list.search}
        onChange={(event) => list.setSearch(event.target.value)}
        placeholder="Chercher une soirée"
        aria-label="Chercher une soirée"
        enterKeyHint="search"
      />
      {list.error ? (
        <ErrorNotice error={list.error} onRetry={list.reload} />
      ) : list.total === null ? (
        <div aria-busy className="flex flex-col gap-3">
          <Shimmer className="h-20" />
          <Shimmer className="h-20" />
        </div>
      ) : list.total === 0 ? (
        <EmptyState
          text={
            list.query
              ? "Aucune soirée ne correspond."
              : "Aucune soirée commencée : leur rapport s'affiche ici dès le début de la soirée."
          }
        />
      ) : (
        <Plate className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {list.rows.map((row) => (
              <li key={row.eventId}>
                <Link
                  href={`/gestion/soirees/${row.eventId}/rapport`}
                  className="g-press flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-g-body font-semibold">{row.title}</span>
                    <span className="block text-g-meta text-muted first-letter:uppercase">
                      {formatNightShort(row.startsAt)}
                      {row.cancelled ? " · annulée" : ""} · {row.totaux.reservations} réservation
                      {row.totaux.reservations > 1 ? "s" : ""}, {row.totaux.honorees} honorée
                      {row.totaux.honorees > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="flex gap-6 text-right">
                    <span>
                      <span className="block text-g-meta text-muted">Acomptes nets</span>
                      <span className="block text-g-body font-semibold tabular-nums">
                        {formatCents(row.totaux.acomptes_nets_cents)}
                      </span>
                    </span>
                    <span>
                      <span className="block text-g-meta text-muted">Encaissé</span>
                      <span className="block text-g-body font-semibold tabular-nums">
                        {formatCents(row.totaux.acomptes_nets_cents + row.totaux.sur_place_cents)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <ListPager
            shown={list.rows.length}
            total={list.total}
            pageSize={list.pageSize}
            loading={list.loading}
            onPageSize={list.setPageSize}
            onMore={list.showMore}
          />
        </Plate>
      )}
    </div>
  );
}
