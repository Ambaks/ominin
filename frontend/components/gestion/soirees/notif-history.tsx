"use client";

import Link from "next/link";
import { useCallback } from "react";
import { EmptyState, ErrorNotice, Input, ListPager, Plate, Shimmer } from "@/components/gestion/ui";
import { formatDateTime } from "@/lib/club/format";
import { KIND_TITLES, notifLines, notifUrl } from "@/lib/club/notifications";
import { fetchClubNotifications, type ClubNotification } from "@/lib/gestion/club-notifications";
import { usePagedList } from "@/lib/use-paged-list";

/*
 * L'historique des notifications de réservation, la plus récente d'abord :
 * toutes pour la direction, celles qui lui étaient destinées pour un membre.
 * Page par page depuis la base, recherche sur le client et la soirée ;
 * chaque ligne ouvre la réservation sur le plan du soir.
 */

const rowId = (row: ClubNotification) => row.id;

export function NotifHistory({ etablissementId, money }: { etablissementId: string; money: boolean }) {
  const fetchPage = useCallback(
    (search: string, limit: number, offset: number) => fetchClubNotifications(etablissementId, search, limit, offset),
    [etablissementId]
  );
  const list = usePagedList({ fetchPage, rowId });

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        value={list.search}
        onChange={(event) => list.setSearch(event.target.value)}
        placeholder="Chercher un client ou une soirée"
        aria-label="Chercher un client ou une soirée"
        enterKeyHint="search"
      />
      {list.error ? (
        <ErrorNotice error={list.error} onRetry={list.reload} />
      ) : list.total === null ? (
        <div aria-busy className="flex flex-col gap-3">
          <Shimmer className="h-24" />
          <Shimmer className="h-24" />
        </div>
      ) : list.total === 0 ? (
        <EmptyState
          text={
            list.query
              ? "Aucune notification ne correspond."
              : "Aucune notification pour l'instant : chaque réservation confirmée, saisie ou modifiée s'inscrit ici."
          }
        />
      ) : (
        <Plate className="overflow-hidden">
          <ul className="divide-y divide-hairline">
            {list.rows.map((row) => {
              const [first, ...rest] = notifLines(row.kind, row.details, money);
              return (
                <li key={row.id}>
                  <Link href={notifUrl(row.eventId, row.bookingId)} className="g-press flex flex-col gap-0.5 px-5 py-3.5">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <span className="text-g-body font-semibold">{KIND_TITLES[row.kind]}</span>
                      <span className="text-g-meta text-muted tabular-nums">{formatDateTime(row.createdAt)}</span>
                    </span>
                    <span className="text-g-body">{first}</span>
                    {rest.map((line) => (
                      <span key={line} className="text-g-meta text-muted">
                        {line}
                      </span>
                    ))}
                  </Link>
                </li>
              );
            })}
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
