"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { SoireesIcon } from "@/components/gestion/icons";
import {
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
} from "@/components/gestion/soirees/club-states";
import { ZonesSettings } from "@/components/gestion/soirees/zones-settings";
import {
  Chip,
  EmptyState,
  GlassButton,
  GlassFrame,
  Plate,
  SectionHeading,
  Segmented,
  Shimmer,
} from "@/components/gestion/ui";
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
 * conditions d'entrée ; l'équipe y trouve le plan de la porte. La prochaine
 * soirée (ou celle en cours) est la seule à vivre dans un cadre de verre :
 * c'est là que l'œil se pose.
 */

type Tab = "a_venir" | "passees" | "salle";

/** Au-delà de ce rang, les cartes entrent ensemble : trente soirées passées n'attendent pas. */
const MAX_RISE = 6;

function StatusChips({ event, now }: { event: ClubEvent; now: number }) {
  if (event.cancelledAt) return <Chip tone="problem">Annulée</Chip>;
  return (
    <>
      {isTonight(event, now) && (
        <span className="g-orders">
          <Chip icon={<span className="pouls" aria-hidden />}>En cours</Chip>
        </span>
      )}
      {event.published ? (
        <Chip icon={<SoireesIcon />}>Publiée</Chip>
      ) : (
        <Chip>Brouillon</Chip>
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
        className="h-20 w-16 shrink-0 rounded-g-card border border-hairline object-cover"
      />
    );
  }
  const [weekday, day, month] = formatNightShort(event.startsAt).split(" ");
  return (
    <span
      aria-hidden
      className="flex h-20 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-g-card border border-hairline bg-surface-raised"
    >
      <span className="g-eyebrow">{weekday}</span>
      <span className="font-display text-g-name text-ember-1 tabular-nums">{day}</span>
      <span className="g-eyebrow">{month}</span>
    </span>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-g-meta text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-g-label font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function EventCard({
  club,
  event,
  now,
  gerant,
  next,
  index,
}: {
  club: ClubState;
  event: ClubEvent;
  now: number;
  gerant: boolean;
  /** La prochaine soirée (ou celle en cours) : la seule en cadre de verre. */
  next: boolean;
  /** Rang d'entrée, à l'arrivée sur la page seulement ; absent, pas d'entrée. */
  index?: number;
}) {
  const loaded = Boolean(club.nights[event.id]);
  const stats = nightStats(club, event.id);
  const tonight = isTonight(event, now);
  const guestList = event.guestListOpen || stats.guests > 0;
  // Une seule destination par carte : le plan si la soirée a commencé (ou
  // pour l'équipe), sa préparation sinon.
  const href = tonight || !gerant ? `/gestion/soirees/${event.id}/live` : `/gestion/soirees/${event.id}`;
  const action = href.endsWith("/live") ? "Plan du soir" : isPast(event, now) ? "Revoir" : "Préparer";

  const body = (
    <>
      <span className="flex items-center gap-4">
        <Thumb event={event} />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap gap-x-1.5 text-g-meta text-muted">
            <span className="whitespace-nowrap first-letter:uppercase">{formatNightShort(event.startsAt)}</span>
            <span aria-hidden>·</span>
            <span className="whitespace-nowrap tabular-nums">{formatHours(event.startsAt, event.endsAt)}</span>
            {event.tag && (
              <>
                <span aria-hidden>·</span>
                <span>{event.tag}</span>
              </>
            )}
          </span>
          <span className="line-clamp-2 font-display text-g-h2">{event.title}</span>
          <span className="flex flex-wrap gap-1.5">
            <StatusChips event={event} now={now} />
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-g-label font-medium text-muted">
          <span className="max-sm:sr-only">{action}</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </span>

      {loaded ? (
        <dl className={`grid gap-x-5 gap-y-3 border-t border-hairline pt-4 ${gerant ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
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
        <Shimmer className="h-12" />
      )}
    </>
  );

  return (
    <li className={next || index === undefined ? undefined : "g-rise"} style={index === undefined ? undefined : ({ "--g-i": index } as CSSProperties)}>
      {next ? (
        <GlassFrame
          i={index}
          entity="orders"
          hero
          icon={<SoireesIcon />}
          eyebrow={tonight ? "Ce soir" : "Prochaine soirée"}
          href={href}
          title={action}
        >
          <Plate className="flex flex-col gap-4 p-4 sm:p-5">{body}</Plate>
        </GlassFrame>
      ) : (
        <Link href={href} title={action} className="soiree-carte g-plate g-press flex flex-col gap-4 p-4 sm:p-5">
          {body}
        </Link>
      )}
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
  // Une seule orchestration, à l'arrivée : changer d'onglet ne la rejoue pas.
  const [tabTouched, setTabTouched] = useState(false);

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
    { value: "a_venir" as const, label: upcoming.length > 0 ? `À venir · ${upcoming.length}` : "À venir" },
    { value: "passees" as const, label: "Passées" },
    ...(gerant ? [{ value: "salle" as const, label: "Salle et prix" }] : []),
  ];
  const tableCounts = new Map<string, number>();
  for (const table of club.tables) {
    tableCounts.set(table.zoneId, (tableCounts.get(table.zoneId) ?? 0) + 1);
  }

  return (
    <div className="soirees-page flex flex-col gap-6">
      <div className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <SectionHeading
          level={1}
          title="Soirées"
          sub={
            gerant
              ? "Vos soirées, leurs tables vendues en direct et le plan du soir."
              : "Les soirées du club. Ouvrez le plan du soir pour accueillir les tables."
          }
          right={
            gerant ? (
              <GlassButton variant="primary" href="/gestion/soirees/nouvelle">
                Nouvelle soirée
              </GlassButton>
            ) : undefined
          }
        />
      </div>

      {error && <ClubLoadError message={error} />}

      <div className="seg-defile">
        <Segmented
          i={1}
          label="Soirées"
          options={tabs}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setTabTouched(true);
          }}
        />
      </div>

      {tab === "salle" ? (
        <div>
          <ZonesSettings
            key={JSON.stringify([club.zones.map((zone) => zone.id), club.conditions])}
            zones={club.zones}
            tableCounts={tableCounts}
            conditions={club.conditions}
            depositPercent={club.depositPercent}
          />
        </div>
      ) : shown.length === 0 ? (
        <div>
          <EmptyState
            text={
              tab === "passees"
                ? "Aucune soirée passée : les soirées terminées s'affichent ici avec ce qu'elles ont vendu."
                : gerant
                  ? "Aucune soirée à venir. Créez la prochaine : ses zones, ses prix, et la page où vos clients réservent leur table."
                  : "Aucune soirée à venir : le gérant n'en a pas encore programmé."
            }
            action={
              gerant && tab === "a_venir" ? (
                <GlassButton variant="primary" href="/gestion/soirees/nouvelle">
                  Nouvelle soirée
                </GlassButton>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-g-gap">
          {shown.map((event, index) => (
            <EventCard
              key={event.id}
              club={club}
              event={event}
              now={now}
              gerant={gerant}
              next={tab === "a_venir" && event.id === nextId}
              index={tabTouched ? undefined : Math.min(index + 2, MAX_RISE)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
