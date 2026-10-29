"use client";

import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { useRunMutation } from "@/components/ui/toast";
import {
  cancelClientDeparture,
  fetchClientPlaces,
  linkClient,
  setClientEnded,
  type ClientPlace,
} from "@/lib/admin/commerciaux";
import { formatDate } from "@/lib/admin/format";
import { refreshDetail } from "@/lib/admin/lead-cache";
import type { LeadDetail } from "@/lib/admin/types";

const SMALL = "rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground";

/*
 * Le client que la fiche est devenue : le lien fait foi pour « déjà client »
 * sur la carte des commerciaux, et son départ arrête la commission de son
 * commercial.
 */
export function ClientSection({ detail }: { detail: LeadDetail }) {
  const run = useRunMutation();
  const restaurantId = detail.restaurant.id;
  const [places, setPlaces] = useState<ClientPlace[] | null>(null);
  const [choice, setChoice] = useState("");

  useEffect(() => {
    if (!detail.client) void fetchClientPlaces().then(setPlaces, () => setPlaces([]));
  }, [detail.client]);

  const refresh = () => refreshDetail(restaurantId);

  return (
    <section className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">Client Ominin</p>
      {detail.client ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="flex-1">
            Relié à <span className="font-medium">{detail.client.name}</span>
            <span className="text-faint"> · {detail.client.kind === "shop" ? "boutique" : "établissement"}</span>
            {detail.client.endedAt && <span className="text-ember-3"> · parti le {formatDate(detail.client.endedAt)}</span>}
          </span>
          {detail.client.endedAt ? (
            <>
              <button
                type="button"
                onClick={() => void run(async () => { await setClientEnded(restaurantId, null); refresh(); }, "Client de retour")}
                className={SMALL}
              >
                Client revenu
              </button>
              <button
                type="button"
                onClick={() => void run(async () => { await cancelClientDeparture(restaurantId); refresh(); }, "Départ annulé, commission rouverte")}
                className={SMALL}
              >
                Départ posé par erreur
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`${detail.client!.name} a quitté Ominin ? La fiche redevient libre sur la carte des commerciaux, et la commission de son commercial s’arrête définitivement, même s’il revient.`)) return;
                void run(async () => { await setClientEnded(restaurantId, new Date().toISOString()); refresh(); }, "Départ enregistré");
              }}
              className={SMALL}
            >
              Client parti
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select value={choice} onChange={(event) => setChoice(event.target.value)} className={`${inputClass} flex-1`}>
            <option value="">Pas client — relier à…</option>
            {(places ?? [])
              .filter((place) => !place.restaurant_id)
              .map((place) => (
                <option key={`${place.kind}:${place.id}`} value={`${place.kind}:${place.id}`}>
                  {place.name} ({place.kind === "shop" ? "boutique" : "établissement"})
                </option>
              ))}
          </select>
          <button
            type="button"
            disabled={!choice}
            onClick={() => {
              const [kind, id] = choice.split(":");
              void run(async () => { await linkClient(restaurantId, { kind, id }); refresh(); }, "Fiche reliée au client");
            }}
            className={SMALL}
          >
            Relier
          </button>
        </div>
      )}
    </section>
  );
}
