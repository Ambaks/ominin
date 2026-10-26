"use client";

import { useCallback, useEffect, useState } from "react";
import { RestaurantPicker } from "@/components/admin/restaurant-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  fetchPendingClients,
  fetchSignupMatches,
  markSigned,
  mergeRestaurants,
  validateClient,
  type PendingClient,
  type SignupMatch,
} from "@/lib/admin/commerciaux";
import { formatDate } from "@/lib/admin/format";
import type { LeadLite } from "@/lib/admin/types";
import { GHOST_BUTTON } from "./commerciaux-tab";

const TITLE = "text-[11px] font-semibold uppercase tracking-wider text-faint";

/*
 * Inscriptions (lot 2) : celles qui attendent une validation (nom ou
 * téléphone trop loin de la fiche), celles d'un restaurant réservé faites
 * sans le lien du commercial, et la fusion de deux fiches du même restaurant.
 */
export function InscriptionsTab() {
  const toast = useToast();
  const [pending, setPending] = useState<PendingClient[] | null>(null);
  const [matches, setMatches] = useState<SignupMatch[] | null>(null);
  const [keep, setKeep] = useState<LeadLite | null>(null);
  const [drop, setDrop] = useState<LeadLite | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(
    () =>
      Promise.all([fetchPendingClients(), fetchSignupMatches()]).then(([clients, found]) => {
        setPending(clients);
        setMatches(found);
      }),
    []
  );
  useEffect(() => void load(), [load]);

  const run = async (task: () => Promise<void>, done: string) => {
    try {
      await task();
      toast.success(done);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    }
  };

  if (!pending || !matches) return <div aria-busy className="shimmer h-40 rounded-2xl" />;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className={TITLE}>À valider ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Aucune inscription suspecte.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pending.map((client) => (
              <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4 text-sm">
                <span>
                  <span className="font-medium">{client.name}</span>
                  <span className="text-muted"> · {client.commercial} · {formatDate(client.created_at)}</span>
                  <span className="block text-ember-3">{client.alert}</span>
                </span>
                <button type="button" onClick={() => void run(() => validateClient(client.id), "Inscription validée.")} className={GHOST_BUTTON}>
                  Valider
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={TITLE}>Inscrits sans le lien ({matches.length})</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted">Aucun restaurant réservé inscrit sans le lien de son commercial.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.map((match) => (
              <li key={`${match.declaration_id}-${match.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4 text-sm">
                <span>
                  <span className="font-medium">{match.name}</span>
                  <span className="text-muted">
                    {" "}
                    · inscrit le {formatDate(match.created_at)}, même {match.reason} que « {match.restaurant_name} »
                    {match.commercial_name ? `, réservé par ${match.commercial_name}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void run(() => markSigned(match.declaration_id, { kind: match.kind, id: match.id }), "Rattaché : le commercial est prévenu.")}
                  className={GHOST_BUTTON}
                >
                  Rattacher
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={TITLE}>Fusionner deux fiches du même restaurant</h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
          <span className="text-sm text-muted">Fiche gardée</span>
          <RestaurantPicker value={keep} onSelect={setKeep} />
          <span className="text-sm text-muted">Fiche retirée (ses déclarations, interlocuteurs et journal passent sur la gardée)</span>
          <RestaurantPicker value={drop} onSelect={setDrop} />
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Motif" className={inputClass} />
          <p className="text-xs text-muted">
            Deux déclarations en cours : la première confirmée l’emporte, l’autre commercial est informé par e-mail.
          </p>
          <button
            type="button"
            disabled={!keep || !drop || !note.trim()}
            onClick={() =>
              void run(async () => {
                await mergeRestaurants(keep!.restaurantId, drop!.restaurantId, note.trim());
                setKeep(null);
                setDrop(null);
                setNote("");
              }, "Fiches fusionnées.")
            }
            className="ember-gradient self-start rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
          >
            Fusionner
          </button>
        </div>
      </section>
      {pending.length === 0 && matches.length === 0 && <EmptyState title="Rien à trancher" body="Les inscriptions des restaurants déclarés apparaissent ici quand elles demandent l’œil de l’admin." />}
    </div>
  );
}
