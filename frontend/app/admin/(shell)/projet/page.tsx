"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { ProgressBar, StatusDot } from "@/components/admin/projet/step-row";
import { BUTTON, FIELD, SECTION_TITLE } from "@/components/admin/projet/styles";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { formatEuros } from "@/lib/admin/format";
import { PRODUCT_LABELS, PRODUCTS, type Product } from "@/lib/admin/products";
import {
  addClient,
  clientSteps,
  currentStep,
  progress,
  reloadProjet,
  selectProjetFor,
  useProjet,
  type ClientFigures,
  type Place,
  type ProjetClient,
  type ProjetData,
} from "@/lib/admin/projet";

/*
 * L'intégration : un rectangle par client, avec l'étape où il en est et, une
 * fois en service, ce qu'il encaisse. Un clic ouvre sa pipeline complète.
 */

function Figures({ figures }: { figures: ClientFigures }) {
  return (
    <dl className="grid grid-cols-3 gap-2 border-t border-hairline pt-3 text-center">
      {[
        ["CA total", formatEuros(figures.revenue)],
        ["Pour nous", formatEuros(figures.commission)],
        ["Tickets", String(figures.orders)],
      ].map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] uppercase tracking-wider text-faint">{label}</dt>
          <dd className="text-sm font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ClientCard({
  client,
  data,
  href,
}: {
  client: ProjetClient;
  data: ProjetData;
  href: string;
}) {
  const steps = clientSteps(data, client.id);
  const { done, total } = progress(steps);
  const current = currentStep(steps);
  const figures = data.figures.get(client.id);
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-ember-2/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate font-display text-lg font-medium">{client.name}</h3>
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
          {PRODUCT_LABELS[client.product]}
        </span>
      </div>
      <ProgressBar done={done} total={total} />
      {current ? (
        <div className="flex items-start gap-2">
          <StatusDot status={current.status} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-faint">
              {current.phase} · {done}/{total}
            </p>
            <p className="line-clamp-2 text-sm">{current.title}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-status-signed">Interfacé de bout en bout</p>
      )}
      {figures && <Figures figures={figures} />}
    </Link>
  );
}

function NewClientModal({
  places,
  onClose,
  onCreated,
}: {
  places: Place[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const run = useRunMutation();
  const [name, setName] = useState("");
  const [product, setProduct] = useState<Product>("menu");
  const [place, setPlace] = useState("");

  const submit = () =>
    void run(async () => {
      const [kind, id] = place.split(":");
      onCreated(
        await addClient({
          name: name.trim(),
          product,
          etablissementId: kind === "etablissement" ? id : null,
          shopId: kind === "shop" ? id : null,
        }),
      );
    }, "Client ajouté au suivi");

  return (
    <Modal
      title="Nouveau client à interfacer"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submit}
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          Ajouter
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom du client"
          className={FIELD}
        />
        <select
          value={product}
          onChange={(event) => setProduct(event.target.value as Product)}
          className={FIELD}
        >
          {PRODUCTS.map((value) => (
            <option key={value} value={value}>
              {PRODUCT_LABELS[value]}
            </option>
          ))}
        </select>
        <select value={place} onChange={(event) => setPlace(event.target.value)} className={FIELD}>
          <option value="">Pas encore en service</option>
          {places.map((option) => (
            <option key={`${option.kind}:${option.id}`} value={`${option.kind}:${option.id}`}>
              {option.name} ({option.kind === "shop" ? "boutique" : "établissement"})
            </option>
          ))}
        </select>
        <p className="text-xs text-faint">
          La pipeline type (prospection, intégration, suivi) est créée avec le client.
        </p>
      </div>
    </Modal>
  );
}

export default function IntegrationPage() {
  const { data, error, loading } = useProjet();
  const { basePath, product } = useAdminBasePath();
  const [adding, setAdding] = useState(false);
  const view = data ? selectProjetFor(data, product) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Intégration</h1>
          <p className="mt-1 text-sm text-muted">Les clients à interfacer, un par un.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="ember-gradient flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-background"
        >
          <PlusIcon className="size-4" />
          Client
        </button>
      </div>

      {!data || !view ? (
        error ? (
          <EmptyState
            title="Chargement impossible"
            body={error}
            action={
              <button type="button" onClick={() => void reloadProjet()} className={BUTTON}>
                Réessayer
              </button>
            }
          />
        ) : (
          <div aria-busy={loading} className="grid gap-4 lg:grid-cols-2">
            <div className="shimmer h-64 rounded-2xl" />
            <div className="shimmer h-64 rounded-2xl" />
          </div>
        )
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className={SECTION_TITLE}>Clients · {view.clients.length}</h2>
          {view.clients.length === 0 ? (
            <EmptyState
              title="Aucun client suivi"
              body="Ajoutez un client : sa pipeline, de la recherche au bilan, est créée avec lui."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {view.clients.map((client) => (
                <ClientCard key={client.id} client={client} data={data} href={`${basePath}/projet/${client.id}`} />
              ))}
            </div>
          )}
        </section>
      )}

      {adding && data && <NewClientModal places={data.places} onClose={() => setAdding(false)} onCreated={() => setAdding(false)} />}
    </div>
  );
}
