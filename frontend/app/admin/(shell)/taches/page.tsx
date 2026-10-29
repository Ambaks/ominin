"use client";

import { useEffect, useState } from "react";
import { PlusIcon } from "@/components/admin/icons";
import { AddStep, ProgressBar, StepRow } from "@/components/admin/projet/step-row";
import { BUTTON, FIELD } from "@/components/admin/projet/styles";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useRunMutation } from "@/components/ui/toast";
import { useAdminBasePath } from "@/lib/admin/base-path";
import { PRODUCT_LABELS, PRODUCTS, type Product } from "@/lib/admin/products";
import {
  addChantier,
  addStep,
  chantierSteps,
  deleteChantier,
  isAssignedTo,
  OWNER_LABELS,
  OWNERS,
  progress,
  reloadProjet,
  selectProjetFor,
  useProjet,
  type Chantier,
  type Owner,
  type ProjetData,
} from "@/lib/admin/projet";

/* Les tâches : ce qui reste pour finir chaque offre, par personne. */

function productLabel(product: Product | null): string {
  return product ? PRODUCT_LABELS[product] : "Transverse";
}

/** Étapes montrées d'un chantier replié : les prochaines à faire. */
const FOLDED_STEPS = 3;

/*
 * Tâches de qui : toutes, ou celles d'une personne. Le choix est gardé par
 * appareil — chacun ouvre l'admin sur les siennes.
 */
type Who = Owner | "all";
const WHO_KEY = "ominin-projet-who";

function readWho(): Who {
  try {
    const value = localStorage.getItem(WHO_KEY);
    return value && OWNERS.includes(value as Owner) ? (value as Owner) : "all";
  } catch {
    return "all";
  }
}

function WhoFilter({ who, onChange }: { who: Who; onChange: (who: Who) => void }) {
  const options: { value: Who; label: string }[] = [
    { value: "all", label: "Toutes" },
    ...OWNERS.map((owner) => ({ value: owner, label: OWNER_LABELS[owner] })),
  ];
  return (
    <div role="group" aria-label="Tâches de" className="flex gap-1 rounded-full border border-hairline p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={who === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            who === option.value ? "bg-surface text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChantierCard({ chantier, data, who }: { chantier: Chantier; data: ProjetData; who: Who }) {
  const run = useRunMutation();
  const [open, setOpen] = useState(false);
  const steps = chantierSteps(data, chantier.id).filter((step) => who === "all" || isAssignedTo(step.owner, who));
  const { done, total } = progress(steps);
  const shown = open
    ? steps
    : steps.filter((step) => step.status !== "done").slice(0, FOLDED_STEPS);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ember-1">
            {productLabel(chantier.product)}
          </p>
          <h3 className="font-medium">{chantier.title}</h3>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted">
          {done}/{total}
        </span>
      </div>
      <ProgressBar done={done} total={total} />
      <ul className="-my-1 divide-y divide-hairline">
        {shown.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </ul>
      {open && <AddStep onAdd={(title, dueOn) => addStep({ chantier_id: chantier.id }, title, dueOn)} />}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-muted transition-colors hover:text-foreground"
        >
          {open ? "Replier" : `Voir les ${total} étapes`}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`Supprimer la tâche « ${chantier.title} » et ses étapes ?`)) {
              return;
            }
            void run(() => deleteChantier(chantier.id), "Tâche supprimée");
          }}
          className="text-xs text-faint transition-colors hover:text-status-lost"
        >
          Supprimer
        </button>
      </div>
    </section>
  );
}

function NewChantierModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const run = useRunMutation();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<string>(product ?? "");

  return (
    <Modal
      title="Nouvelle tâche"
      onClose={onClose}
      footer={
        <button
          type="button"
          disabled={!title.trim()}
          onClick={() =>
            void run(async () => {
              await addChantier(title.trim(), (scope || null) as Product | null);
              onClose();
            }, "Tâche ajoutée")
          }
          className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-50"
        >
          Ajouter
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ce qu'il faut finir (ex. Kit matériel)"
          className={FIELD}
        />
        <select value={scope} onChange={(event) => setScope(event.target.value)} className={FIELD}>
          <option value="">Transverse</option>
          {PRODUCTS.map((value) => (
            <option key={value} value={value}>
              {PRODUCT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}

export default function TachesPage() {
  const { data, error, loading } = useProjet();
  const { product } = useAdminBasePath();
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState<Who>("all");
  const view = data ? selectProjetFor(data, product) : null;
  const chantiers =
    view && data
      ? view.chantiers.filter(
          (chantier) => who === "all" || chantierSteps(data, chantier.id).some((step) => isAssignedTo(step.owner, who)),
        )
      : [];

  // localStorage n'existe pas au rendu serveur : lu une fois, au montage.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setWho(readWho()), []);

  const chooseWho = (next: Who) => {
    setWho(next);
    try {
      localStorage.setItem(WHO_KEY, next);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Tâches</h1>
          <p className="mt-1 text-sm text-muted">Ce qui reste pour finir les offres.</p>
        </div>
        <div className="flex items-center gap-2">
          <WhoFilter who={who} onChange={chooseWho} />
          <button type="button" onClick={() => setAdding(true)} className={BUTTON}>
            <PlusIcon className="size-4" />
            Tâche
          </button>
        </div>
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
      ) : chantiers.length === 0 ? (
        <p className="text-sm text-muted">
          {who === "all" ? "Aucune tâche pour cette offre." : `Aucune tâche confiée à ${OWNER_LABELS[who]}.`}
        </p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {chantiers.map((chantier) => (
            <ChantierCard key={chantier.id} chantier={chantier} data={data} who={who} />
          ))}
        </div>
      )}

      {adding && <NewChantierModal product={product} onClose={() => setAdding(false)} />}
    </div>
  );
}
