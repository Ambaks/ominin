"use client";

import Link from "next/link";
import { useState } from "react";
import { SoireesIcon } from "@/components/gestion/icons";
import {
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
} from "@/components/gestion/soirees/club-states";
import { ZonesSettings } from "@/components/gestion/soirees/zones-settings";
import { EmptyState } from "@/components/ui/empty-state";
import { PillTabs } from "@/components/ui/pill-tabs";
import { formatCents, formatHours, formatNightShort } from "@/lib/club/format";
import type { ClubEvent } from "@/lib/club/types";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { isPast, isTonight, nightStats } from "@/lib/gestion/club-selectors";
import { useClub, useClubLoadError, useClubNights, type ClubState } from "@/lib/gestion/club-store";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { useNow } from "@/lib/gestion/use-now";

/*
 * Les soirées du club : celles à venir, ce qu'elles ont vendu en direct, et
 * l'accès au plan du soir. Le gérant y prépare ses soirées et ses prix ;
 * l'équipe y trouve le plan de la porte.
 */

type Tab = "a_venir" | "passees" | "zones";

const CHIP = "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider";

function StatusChips({ event, now }: { event: ClubEvent; now: number }) {
  if (event.cancelledAt) {
    return <span className={`${CHIP} border-ember-3/40 bg-ember-3/10 text-ember-3`}>Annulée</span>;
  }
  return (
    <>
      {isTonight(event, now) && (
        <span className={`${CHIP} border-ember-2/40 bg-ember-2/10 text-ember-2`}>En cours</span>
      )}
      {event.published ? (
        <span className={`${CHIP} border-ember-1/40 bg-ember-1/10 text-ember-1`}>Publiée</span>
      ) : (
        <span className={`${CHIP} border-hairline text-muted`}>Brouillon</span>
      )}
    </>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="truncate font-display text-base font-medium tabular-nums">{value}</p>
    </div>
  );
}

function EventRow({
  club,
  event,
  now,
  gerant,
}: {
  club: ClubState;
  event: ClubEvent;
  now: number;
  gerant: boolean;
}) {
  const loaded = Boolean(club.nights[event.id]);
  const stats = nightStats(club, event.id);
  const live = `/gestion/soirees/${event.id}/live`;
  const guestList = event.guestListOpen || stats.guests > 0;
  return (
    <li
      className="rise flex flex-col gap-4 rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-ember-2/40 sm:flex-row sm:items-center sm:p-5"
    >
      <Link
        href={gerant ? `/gestion/soirees/${event.id}` : live}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        {event.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- affiche du club, servie par Supabase Storage
          <img
            src={event.posterUrl}
            alt=""
            className="h-20 w-16 shrink-0 rounded-xl border border-hairline object-cover"
          />
        ) : (
          <span className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-hairline text-faint">
            <SoireesIcon className="size-6" />
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-1">
          <span className="block text-xs font-medium text-muted first-letter:uppercase">
            {formatNightShort(event.startsAt)} · {formatHours(event.startsAt, event.endsAt)}
          </span>
          <span className="truncate font-display text-lg font-medium">{event.title}</span>
          <span className="flex flex-wrap gap-1.5">
            {event.tag && <span className={`${CHIP} border-hairline text-muted`}>{event.tag}</span>}
            <StatusChips event={event} now={now} />
          </span>
        </span>
      </Link>

      <div className="flex items-center gap-4 border-t border-hairline pt-4 sm:border-t-0 sm:pt-0">
        {loaded ? (
          <div
            className={`grid flex-1 grid-cols-2 gap-x-5 gap-y-2 sm:flex-none ${
              gerant ? "sm:w-[23rem] sm:grid-cols-4" : "sm:w-48"
            }`}
          >
            <Counter label="Tables" value={`${stats.sold} / ${stats.capacity}`} />
            {gerant && <Counter label="Revenu" value={formatCents(stats.online + stats.onSite)} />}
            {gerant && <Counter label="Frais Ominin" value={formatCents(stats.fees)} />}
            <Counter
              label="Invités"
              value={
                !guestList
                  ? "—"
                  : event.guestListCapacity
                    ? `${stats.guests} / ${event.guestListCapacity}`
                    : String(stats.guests)
              }
            />
          </div>
        ) : (
          <div aria-busy className="shimmer h-10 flex-1 rounded-xl sm:w-[23rem] sm:flex-none" />
        )}
        {!event.cancelledAt && (
          <Link
            href={live}
            className={`flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors lg:pointer-fine:min-h-9 ${
              isTonight(event, now)
                ? "ember-gradient text-background"
                : "border border-hairline text-muted hover:border-ember-2/40 hover:text-foreground"
            }`}
          >
            Plan du soir
          </Link>
        )}
      </div>
    </li>
  );
}

export default function SoireesPage() {
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const club = useClub();
  const error = useClubLoadError();
  const now = useNow(WAIT_TICK_MS).getTime();
  const [tab, setTab] = useState<Tab>("a_venir");

  const events = club?.events ?? [];
  const upcoming = events.filter((event) => !isPast(event, now));
  const past = events.filter((event) => isPast(event, now)).reverse();
  const shown = tab === "passees" ? past : upcoming;
  useClubNights(tab === "zones" ? [] : shown.map((event) => event.id));

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;

  const gerant = can("soirees.edit");
  const tabs = [
    { id: "a_venir", label: "À venir", count: upcoming.length },
    { id: "passees", label: "Passées" },
    ...(gerant ? [{ id: "zones", label: "Zones et prix" }] : []),
  ];
  const tableCounts = new Map<string, number>();
  for (const table of club.tables) {
    tableCounts.set(table.zoneId, (tableCounts.get(table.zoneId) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight lg:text-3xl">Soirées</h1>
          <p className="mt-1 text-sm text-muted">
            {gerant
              ? "Vos soirées, leurs tables vendues en direct et le plan du soir."
              : "Les soirées du club. Ouvrez le plan du soir pour accueillir les tables."}
          </p>
        </div>
        {gerant && (
          <Link
            href="/gestion/soirees/nouvelle"
            className="ember-gradient flex min-h-11 shrink-0 items-center rounded-full px-5 text-sm font-semibold text-background lg:pointer-fine:min-h-9"
          >
            Nouvelle soirée
          </Link>
        )}
      </div>

      {error && <ClubLoadError message={error} />}

      <PillTabs tabs={tabs} activeId={tab} onSelect={(id) => setTab(id as Tab)} />

      {tab === "zones" ? (
        <ZonesSettings zones={club.zones} tableCounts={tableCounts} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={tab === "passees" ? "Aucune soirée passée" : "Aucune soirée à venir"}
          body={
            tab === "passees"
              ? "Les soirées terminées s'affichent ici avec ce qu'elles ont vendu."
              : gerant
                ? "Créez votre prochaine soirée : ses zones, ses prix, et la page où vos clients choisissent leur table."
                : "Le gérant n'a pas encore programmé de soirée."
          }
          action={
            gerant && tab === "a_venir" ? (
              <Link
                href="/gestion/soirees/nouvelle"
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
              >
                Nouvelle soirée
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((event) => (
            <EventRow key={event.id} club={club} event={event} now={now} gerant={gerant} />
          ))}
        </ul>
      )}
    </div>
  );
}
