"use client";

import { useParams } from "next/navigation";
import {
  ClubLoadError,
  ClubLocked,
  ClubSkeleton,
  NightNotFound,
} from "@/components/gestion/soirees/club-states";
import { EventEditor } from "@/components/gestion/soirees/event-editor";
import { GlassButton, ReserveGerant } from "@/components/gestion/ui";
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
      <div className="flex flex-col gap-g-gap">
        <ReserveGerant ask="préparer les soirées" />
        {!isNew && (
          <GlassButton variant="primary" className="self-start" href={`/gestion/soirees/${id}/live`}>
            Plan du soir
          </GlassButton>
        )}
      </div>
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
