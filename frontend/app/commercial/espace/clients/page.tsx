import { PageTitle, SectionTitle, cardClass } from "@/components/commercial/space/ui";
import { churnWindows, isDropping, sessionsOf } from "@/lib/admin/churn";
import { formatEuros } from "@/lib/admin/format";
import type { MyClient } from "@/lib/commercial/api";
import { requireRunningContract } from "@/lib/commercial/session";
import { frenchDate } from "@/lib/legal/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
 * Ceux qui décrochent, selon la règle du point du matin de l'admin
 * (lib/admin/churn.ts). Le commercial n'en voit que l'alerte, jamais les chiffres.
 */
async function dropping(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { current, previous } = await churnWindows(createAdminClient(), Date.now());
  return new Set(ids.filter((id) => isDropping(sessionsOf(previous, id), sessionsOf(current, id))));
}

const STEP_DONE = "done";

/** Clients : chaque Client Apporté, son intégration, ce qu'il a rapporté à Ominin ce mois-ci. */
export default async function ClientsPage() {
  await requireRunningContract();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("commercial_my_clients");
  if (error) throw new Error(error.message);
  const clients = data as unknown as MyClient[];
  const alerts = await dropping(clients.flatMap((client) => (client.etablissement_id ? [client.etablissement_id] : [])));

  return (
    <div className="flex flex-col gap-7">
      <PageTitle sub="Les restaurants inscrits grâce à vous.">Clients</PageTitle>
      {clients.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>
          Pas encore de client apporté. Quand un restaurant que vous avez déclaré s’inscrit par votre lien, il apparaît ici.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {clients.map((client) => {
            const done = client.steps.filter((step) => step.status === STEP_DONE).length;
            const next = client.steps.find((step) => step.status !== STEP_DONE);
            return (
              <li key={client.id} className={`${cardClass} flex flex-col gap-2`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{client.name}</p>
                  {client.etablissement_id && alerts.has(client.etablissement_id) && (
                    <span className="shrink-0 rounded-full border border-ember-3/40 px-2.5 py-0.5 text-[11px] font-semibold text-ember-3">
                      Décroche
                    </span>
                  )}
                </div>
                {!client.validated ? (
                  <p className="text-sm text-muted">Inscription en cours de vérification par Ominin.</p>
                ) : client.commission_from ? (
                  <>
                    <p className="text-sm text-muted">
                      Inscrit le {frenchDate(client.commission_from)} · commission jusqu’au{" "}
                      {frenchDate(client.commission_until!)}
                      {client.client_ended_at ? " (client parti)" : ""}
                    </p>
                    <p className="text-sm">
                      Rapporté à Ominin ce mois-ci :{" "}
                      <span className="font-semibold">{formatEuros((client.base_cents ?? 0) / 100)}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Conditions d’Ominin pas encore acceptées : la commission démarre à l’acceptation.</p>
                )}
                {client.steps.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <SectionTitle>Mise en service · {done}/{client.steps.length}</SectionTitle>
                    <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
                      <div className="ember-gradient h-full" style={{ width: `${(done / client.steps.length) * 100}%` }} />
                    </div>
                    {next && <p className="text-xs text-muted">En cours : {next.title}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
