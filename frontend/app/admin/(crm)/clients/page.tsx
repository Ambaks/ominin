"use client";

import { useCallback, useEffect, useState } from "react";
import { Capabilities } from "@/components/admin/clients/capabilities";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { clientFeatures, fetchClients, type Client } from "@/lib/admin/clients";
import { OFFRE_LABELS, VIEWS } from "@/lib/gestion/constants";

/*
 * Les clients d'Ominin, et ce que chacun voit. Un seul écran : la liste à
 * gauche, l'arborescence à cocher à droite. C'est ici qu'on taille la solution
 * à la maison — le BOHO n'a pas les mêmes besoins que le prochain.
 */
function openViews(client: Client): number {
  const features = clientFeatures(client);
  return VIEWS.filter((view) => view.id == null || features[view.id]).length;
}

export default function ClientsPage() {
  const toast = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setClients(await fetchClients());
  }, []);

  useEffect(() => {
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      setLoadError(message);
      toast.error(message);
    });
    // toast est stable (contexte) ; l'écran ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (loadError) {
    return (
      <EmptyState
        title="Chargement impossible"
        body={`${loadError} La table des réglages arrive avec la migration 20260910000001_capabilites.sql.`}
      />
    );
  }

  if (!clients) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-9 w-44 rounded-xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  const selected =
    clients.find((client) => client.id === selectedId) ?? clients[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-medium">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          Ce que chaque restaurant voit dans son espace : cochez les vues, puis
          ce qu&rsquo;elles contiennent.
        </p>
      </div>

      {!selected ? (
        <EmptyState
          title="Aucun client"
          body="Les établissements créés depuis l'inscription apparaîtront ici."
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex shrink-0 flex-col gap-1.5 lg:w-64">
            {clients.map((client) => {
              const active = client.id === selected.id;
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedId(client.id)}
                  className={`rounded-2xl px-4 py-3 text-left transition-colors ${
                    active
                      ? "border border-hairline bg-surface"
                      : "border border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <p className="truncate text-sm font-medium">{client.name}</p>
                  <p className="truncate text-xs text-faint">
                    {client.products.offre
                      ? OFFRE_LABELS[client.products.offre]
                      : client.products.collect
                        ? "Collect"
                        : "Sans abonnement"}
                    {" · "}
                    {openViews(client)} vue
                    {openViews(client) > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 flex-1">
            <Capabilities
              client={selected}
              onChange={(updated) =>
                setClients((current) =>
                  (current ?? []).map((client) =>
                    client.id === updated.id ? updated : client
                  )
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
