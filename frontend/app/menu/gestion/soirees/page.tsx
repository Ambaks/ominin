"use client";

import Link from "next/link";
import { useState } from "react";
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
 * l'accès au plan du soir. Le gérant y prépare ses soirées, ses prix et ses
 * conditions d'entrée ; l'équipe y trouve le plan de la porte.
 */

type Tab = "a_venir" | "passees" | "salle";

const CHIP = "rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider";

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

/** Sans affiche, le jour de la soirée en tient lieu : « sam. / 24 / oct. ». */
function Thumb({ event }: { event: ClubEvent }) {
  if (event.posterUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- affiche du club, servie par Supabase Storage
      <img
        src={event.posterUrl}
        alt=""
        className="h-20 w-16 shrink-0 rounded-xl border border-hairline object-cover"
      />
    );
  }
  const [weekday, day, month] = formatNightShort(event.startsAt).split(" ");
  return (
    <span
      aria-hidden
      className="flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-hairline bg-surface-raised"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{weekday}</span>
      <span className="ember-text font-display text-2xl font-medium leading-tight tabular-nums">{day}</span>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{month}</span>
    </span>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="truncate font-display text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function EventRow({
  club,
  event,
  now,
  gerant,
  next,
}: {
  club: ClubState;
  event: ClubEvent;
  now: number;
  gerant: boolean;
  /** La prochaine soirée (ou celle en cours) : cerclée de corail. */
  next: boolean;
}) {
  const loaded = Boolean(club.nights[event.id]);
  const stats = nightStats(club, event.id);
  const tonight = isTonight(event, now);
  const guestList = event.guestListOpen || stats.guests > 0;
  // Une seule destination par carte : le plan si la soirée a commencé (ou
  // pour l'équipe), sa préparation sinon.
  const href =
    tonight || !gerant ? `/gestion/soirees/${event.id}/live` : `/gestion/soirees/${event.id}`;
  return (
    <li className="soirees-entree">
      <Link
        href={href}
        className={`group flex flex-col gap-4 rounded-2xl border bg-surface p-4 hover:border-ember-2/60 sm:p-5 ${
          next ? "border-[var(--soirees-coral)]" : "border-hairline"
        }`}
      >
        <span className="flex items-center gap-4">
          <Thumb event={event} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap gap-x-1.5 text-xs font-medium text-muted">
              <span className="whitespace-nowrap first-letter:uppercase">{formatNightShort(event.startsAt)}</span>
              <span aria-hidden>·</span>
              <span className="whitespace-nowrap">{formatHours(event.startsAt, event.endsAt)}</span>
            </span>
            <span className="line-clamp-2 font-display text-lg font-medium leading-snug">{event.title}</span>
            <span className="flex flex-wrap gap-1.5">
              {event.tag && <span className={`${CHIP} border-hairline text-muted`}>{event.tag}</span>}
              <StatusChips event={event} now={now} />
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted group-hover:text-foreground">
            <span className="hidden sm:inline">{href.endsWith("/live") ? "Plan du soir" : "Préparer"}</span>
            <svg viewBox="0 0 24 24" className="size-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </span>

        {loaded ? (
          <dl
            className={`grid gap-x-5 gap-y-3 border-t border-hairline pt-4 ${
              gerant ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
            }`}
          >
            <Counter label="Tables réservées" value={`${stats.sold} / ${stats.capacity}`} />
            <Counter label="Personnes" value={String(stats.people)} />
            {gerant && <Counter label="Encaissé" value={formatCents(stats.online + stats.onSite)} />}
            <Counter
              label="Invités"
              value={
                !guestList
                  ? "Liste fermée"
                  : event.guestListCapacity
                    ? `${stats.guests} / ${event.guestListCapacity}`
                    : String(stats.guests)
              }
            />
          </dl>
        ) : (
          <span aria-busy className="shimmer block h-12 rounded-xl" />
        )}
      </Link>
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
  const nextId = upcoming.find((event) => !event.cancelledAt)?.id;
  useClubNights(tab === "salle" ? [] : shown.map((event) => event.id));

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;

  const gerant = can("soirees.edit");
  const tabs = [
    { id: "a_venir", label: "À venir", count: upcoming.length },
    { id: "passees", label: "Passées" },
    ...(gerant ? [{ id: "salle", label: "Salle et conditions" }] : []),
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

      {tab === "salle" ? (
        <ZonesSettings
          zones={club.zones}
          tableCounts={tableCounts}
          conditions={club.conditions}
          depositPercent={club.depositPercent}
        />
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
            <EventRow
              key={event.id}
              club={club}
              event={event}
              now={now}
              gerant={gerant}
              next={tab === "a_venir" && event.id === nextId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
