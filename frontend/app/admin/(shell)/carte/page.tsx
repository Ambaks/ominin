"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MapLeadCard } from "@/components/admin/carte/lead-card";
import { FilterBar } from "@/components/admin/filter-bar";
import { CrosshairIcon } from "@/components/admin/icons";
import { VisitedFlow } from "@/components/admin/lead/visited-flow";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { useFilteredLeads } from "@/lib/admin/filters";
import {
  isWatching,
  startWatch,
  stopWatch,
  usePosition,
  useWatching,
} from "@/lib/admin/geo";
import { selectNextTaskByLead } from "@/lib/admin/selectors";
import { useAdmin } from "@/lib/admin/store";

/*
 * La carte est le centre de l'application : maplibre-gl (~230 Ko gz) ne doit
 * peser que sur cette page, d'où l'import dynamique sans SSR.
 */
const MapCanvas = dynamic(
  () => import("@/components/admin/carte/map-canvas").then((m) => m.MapCanvas),
  { ssr: false, loading: () => <div className="shimmer h-full w-full" /> }
);

export default function CartePage() {
  const state = useAdmin();
  const leads = useFilteredLeads();
  const router = useRouter();
  const { basePath } = useAdminBasePath();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visitedFor, setVisitedFor] = useState<string | null>(null);
  // Dérivé du store geo : reflète aussi un arrêt spontané (refus, erreur).
  const watching = useWatching();
  const myPosition = usePosition();

  const nextTaskByLead = useMemo(
    () => selectNextTaskByLead(state?.tasks ?? []),
    [state?.tasks]
  );
  const selected = useMemo(
    () => leads.find((lead) => lead.restaurantId === selectedId) ?? null,
    [leads, selectedId]
  );
  const visitedLead = useMemo(
    () =>
      state?.leads.find((lead) => lead.restaurantId === visitedFor) ?? null,
    [state?.leads, visitedFor]
  );

  const toggleWatch = () => {
    if (isWatching()) stopWatch();
    else startWatch();
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapCanvas
        leads={leads}
        selected={selected}
        onSelect={setSelectedId}
        myPosition={myPosition}
        renderCard={(lead) => (
          <MapLeadCard
            lead={lead}
            nextTask={nextTaskByLead.get(lead.restaurantId) ?? null}
            onOpen={() =>
              router.push(`${basePath}/carte?lead=${lead.restaurantId}`)
            }
            onVisited={() => setVisitedFor(lead.restaurantId)}
            onClose={() => setSelectedId(null)}
          />
        )}
      />

      <FilterBar floating />

      <button
        type="button"
        onClick={toggleWatch}
        title="Ma position"
        aria-label="Ma position"
        aria-pressed={watching}
        className={`absolute bottom-6 right-3 z-10 rounded-full border p-3 shadow-lg transition-colors lg:bottom-8 lg:right-4 ${
          watching
            ? "border-ember-2/60 bg-surface-raised text-ember-1"
            : "border-hairline bg-surface-raised text-muted hover:text-foreground"
        }`}
      >
        <CrosshairIcon className="size-5" />
      </button>

      {visitedLead && (
        <VisitedFlow
          lead={visitedLead}
          onClose={() => setVisitedFor(null)}
        />
      )}
    </div>
  );
}
