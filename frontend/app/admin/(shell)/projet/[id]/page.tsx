"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { StatTile } from "@/components/admin/charts";
import { ChevronLeftIcon } from "@/components/admin/icons";
import {
  AddStep,
  ProgressBar,
  StepRow,
} from "@/components/admin/projet/step-row";
import { EmptyState } from "@/components/ui/empty-state";
import { useRunMutation } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatEuros } from "@/lib/admin/format";
import { PRODUCT_LABELS } from "@/lib/admin/products";
import {
  addStep,
  clientSteps,
  deleteClient,
  progress,
  selectProjetFor,
  updateClientNotes,
  useProjet,
} from "@/lib/admin/projet";

/*
 * Un client : ce qu'il rapporte une fois en service, et sa pipeline complète,
 * phase par phase, comme les étapes d'un workflow. La colonne de gauche
 * garde les autres clients à portée de clic.
 */

const BACK_LINK =
  "inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground";

export default function ProjetClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const run = useRunMutation();
  const { basePath, product } = useAdminBasePath();
  const { data } = useProjet();

  if (!data) {
    return <div aria-busy className="shimmer h-96 rounded-2xl" />;
  }

  const client = data.clients.find((candidate) => candidate.id === params.id);
  const others = selectProjetFor(data, product).clients;

  if (!client) {
    return (
      <EmptyState
        title="Client introuvable"
        action={
          <Link href={`${basePath}/projet`} className={BACK_LINK}>
            Retour au suivi
          </Link>
        }
      />
    );
  }

  const steps = clientSteps(data, client.id);
  const phases = [...new Set(steps.map((step) => step.phase))];
  const figures = data.figures.get(client.id);
  const { done, total } = progress(steps);

  return (
    <div className="flex gap-8">
      <nav aria-label="Clients" className="hidden w-48 shrink-0 flex-col gap-1 xl:flex">
        {others.map((other) => {
          const counts = progress(clientSteps(data, other.id));
          const active = other.id === client.id;
          return (
            <Link
              key={other.id}
              href={`${basePath}/projet/${other.id}`}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "border border-hairline bg-surface text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <span className="truncate font-medium">{other.name}</span>
              <ProgressBar done={counts.done} total={counts.total} />
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Link href={`${basePath}/projet`} className={BACK_LINK}>
          <ChevronLeftIcon className="size-4" />
          Suivi
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ember-1">
              {PRODUCT_LABELS[client.product]}
            </p>
            <h1 className="font-display text-2xl font-medium">{client.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {done}/{total} étapes faites
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`Retirer ${client.name} du suivi ?`)) return;
              void run(async () => {
                await deleteClient(client.id);
                router.push(`${basePath}/projet`);
              }, "Client retiré du suivi");
            }}
            className="rounded-full border border-hairline px-4 py-2 text-sm text-muted transition-colors hover:text-status-lost"
          >
            Retirer du suivi
          </button>
        </div>

        {figures ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="CA total"
              value={formatEuros(figures.revenue)}
              hint={`${formatEuros(figures.revenue30)} sur 30 jours`}
            />
            <StatTile
              label="Reversé à Ominin"
              value={formatEuros(figures.commission)}
              hint={`${formatEuros(figures.commission30)} sur 30 jours`}
            />
            <StatTile
              label="Tickets"
              value={String(figures.orders)}
              hint={`${figures.orders30} sur 30 jours`}
            />
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-hairline px-4 py-3 text-sm text-muted">
            Pas encore en service : les chiffres apparaîtront une fois le client
            relié à son établissement ou à sa boutique.
          </p>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Pipeline
          </h2>
          <ol className="grid gap-4 2xl:grid-cols-3">
            {phases.map((phase, index) => {
              const inPhase = steps.filter((step) => step.phase === phase);
              const counts = progress(inPhase);
              const finished = counts.done === counts.total;
              return (
                <li key={phase} className="relative flex flex-col">
                  {index > 0 && (
                    <span
                      aria-hidden
                      className="absolute -left-4 top-7 hidden h-px w-4 bg-hairline 2xl:block"
                    />
                  )}
                  <div
                    className={`flex flex-1 flex-col gap-2 rounded-2xl border bg-surface p-4 ${
                      finished ? "border-status-signed/40" : "border-hairline"
                    }`}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-medium">{phase}</h3>
                      <span className="text-xs tabular-nums text-muted">
                        {counts.done}/{counts.total}
                      </span>
                    </div>
                    <ProgressBar done={counts.done} total={counts.total} />
                    <ul className="divide-y divide-hairline">
                      {inPhase.map((step) => (
                        <StepRow key={step.id} step={step} />
                      ))}
                    </ul>
                    <AddStep
                      onAdd={(title) => addStep({ client_id: client.id, phase }, title)}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
            Notes
          </h2>
          <textarea
            key={client.id}
            defaultValue={client.notes}
            rows={4}
            onBlur={(event) => {
              const notes = event.target.value;
              if (notes !== client.notes) {
                void run(() => updateClientNotes(client.id, notes), "Notes enregistrées");
              }
            }}
            placeholder="Contexte, contacts, ce qui bloque…"
            className="w-full rounded-2xl border border-hairline bg-surface px-4 py-3 text-base focus:border-ember-2/50 focus:outline-none"
          />
        </section>
      </div>
    </div>
  );
}
