"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
  NightNotFound,
} from "@/components/gestion/soirees/club-states";
import { EventEditor } from "@/components/gestion/soirees/event-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { useClub, useClubLoadError, useClubNights } from "@/lib/gestion/club-store";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

/** Une soirée à préparer (gérant) ; /gestion/soirees/nouvelle en crée une. */
export default function SoireePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nouvelle";
  const state = useGestion();
  const { can, hasFeature } = useGestionAccess();
  const club = useClub();
  const error = useClubLoadError();
  useClubNights(isNew ? [] : [id]);

  if (!state) return null;
  if (!hasFeature("soirees")) return <ClubLocked />;
  if (!can("soirees.edit")) {
    return (
      <EmptyState
        title="Réservé au gérant"
        body="Le gérant prépare les soirées. Le plan du soir, lui, est ouvert à toute l'équipe."
        action={
          isNew ? undefined : (
            <Link
              href={`/gestion/soirees/${id}/live`}
              className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background"
            >
              Plan du soir
            </Link>
          )
        }
      />
    );
  }
  if (!club) return error ? <ClubLoadError message={error} /> : <ClubSkeleton />;
  const event = isNew ? null : club.events.find((candidate) => candidate.id === id);
  if (event === undefined) return <NightNotFound />;

  return (
    <EventEditor
      key={event?.id ?? "nouvelle"}
      club={club}
      event={event}
      clubSlug={state.etablissement.slug}
    />
  );
}
