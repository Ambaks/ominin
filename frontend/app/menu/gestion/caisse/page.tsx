"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { CatalogDeal, CatalogOption, CatalogSku, CatalogSnapshot } from "@/lib/hubrise/catalog";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";

/*
 * Carte ↔ catalogue de la caisse. Une caisse retrouve un produit par son
 * code : chaque article se relie à un produit du catalogue de la caisse,
 * chaque choix d'option à une de ses options — ou, pour une taille, à un
 * autre produit —, chaque formule à un de ses deals. Les correspondances
 * évidentes sont déjà posées (« auto ») ; le gérant fait le reste. Ominin
 * garde ses prix, photos et textes — seuls les codes viennent de la caisse.
 */

interface Ref {
  itemId: string;
  groupId: string | null;
  choiceId: string | null;
  target: "sku" | "option";
  ref: string;
  name: string | null;
  matchedBy: "auto" | "manual";
}

interface FormuleRef {
  formuleId: string;
  ref: string;
  name: string | null;
  matchedBy: "auto" | "manual";
}

interface CatalogData {
  snapshot: CatalogSnapshot;
  syncedAt: string | null;
  refs: Ref[];
  formuleRefs: FormuleRef[];
}

interface Choice {
  value: string;
  label: string;
  group?: string;
}

const skuLabel = (sku: CatalogSku) =>
  [sku.product, sku.name].filter(Boolean).join(" — ") + (sku.price ? ` (${sku.price})` : "");

const optionLabel = (option: CatalogOption) =>
  `${option.listName} — ${option.name}` + (option.price ? ` (${option.price})` : "");

const dealLabel = (deal: CatalogDeal) => deal.name;

const selectClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-ember-2/50";

function RefSelect({
  value,
  entry,
  options,
  onChange,
  label,
}: {
  value: string;
  entry: { matchedBy: "auto" | "manual" } | undefined;
  options: Choice[];
  onChange: (value: string) => void;
  label: string;
}) {
  const known = options.some((option) => option.value === value);
  const groups = [...new Set(options.map((option) => option.group))];
  const render = (list: Choice[]) =>
    list.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ));
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectClass}
      >
        <option value="">— non associé —</option>
        {/* Le code garde sa place même si la caisse l'a retiré de son catalogue. */}
        {value && !known && (
          <option value={value}>{value.replace(/^(sku|option):/, "")} (absent du catalogue)</option>
        )}
        {groups.map((group) =>
          group ? (
            <optgroup key={group} label={group}>
              {render(options.filter((option) => option.group === group))}
            </optgroup>
          ) : (
            render(options.filter((option) => !option.group))
          )
        )}
      </select>
      {entry && (
        <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          {entry.matchedBy === "auto" ? "auto" : "manuel"}
        </span>
      )}
    </div>
  );
}

export default function CaissePage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const toast = useToast();
  const [data, setData] = useState<CatalogData | null>(null);
  const [failed, setFailed] = useState(false);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/hubrise/catalog");
      if (!response.ok) throw new Error();
      setData((await response.json()) as CatalogData);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refs = useMemo(() => {
    const map = new Map<string, Ref>();
    for (const ref of data?.refs ?? []) {
      map.set(`${ref.itemId}|${ref.groupId ?? ""}|${ref.choiceId ?? ""}`, ref);
    }
    return map;
  }, [data]);

  const formuleRefs = useMemo(
    () => new Map((data?.formuleRefs ?? []).map((ref) => [ref.formuleId, ref])),
    [data]
  );

  const skus = useMemo(
    () => (data?.snapshot.skus ?? []).map((sku) => ({ value: sku.ref, label: skuLabel(sku) })),
    [data]
  );

  const deals = useMemo(
    () => (data?.snapshot.deals ?? []).map((deal) => ({ value: deal.ref, label: dealLabel(deal) })),
    [data]
  );

  const put = async (body: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/hubrise/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      await load();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
    }
  };

  const refresh = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/hubrise/catalog", { method: "POST" });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      toast.success("Catalogue relu.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Une erreur est survenue.");
    }
    setBusy(false);
  };

  if (!state) return null;
  const allItems = state.categories.flatMap((category) => category.items);
  const mapped = allItems.filter((item) => refs.has(`${item.id}||`)).length;
  const formulesMapped = state.formules.filter((formule) => formuleRefs.has(formule.id)).length;
  const missing = allItems.length - mapped + state.formules.length - formulesMapped;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/gestion/etablissement" className="text-xs font-medium text-ember-2 hover:underline">
          ← Établissement
        </Link>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight lg:text-3xl">
          Carte et caisse
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Chaque article se relie à son produit dans votre caisse : c&rsquo;est par ce code qu&rsquo;elle
          reconnaît la ligne, applique sa TVA et décompte son stock.
        </p>
      </div>

      {!can("etablissement.edit") ? (
        <EmptyState title="Réservé au gérant" body="Seul le gérant relie la carte à la caisse." />
      ) : failed ? (
        <EmptyState title="HubRise n'est pas relié" body="Connectez HubRise depuis la page Établissement." />
      ) : data === null ? (
        <div aria-busy className="shimmer h-40 max-w-3xl rounded-2xl" />
      ) : (
        <>
          <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <div>
              <p className="text-sm font-medium">
                {mapped} sur {allItems.length} articles associés
                {state.formules.length > 0 &&
                  `, ${formulesMapped} sur ${state.formules.length} formules`}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {data.snapshot.skus.length} produits dans la caisse
                {data.syncedAt ? "" : " — catalogue pas encore lu"}.
              </p>
              {missing > 0 && (
                <p className="mt-2 text-xs text-ember-2">
                  {missing} sans code : la caisse les reçoit sans les reconnaître (TVA par défaut,
                  hors stock et hors ventes), et certaines caisses les refusent.
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={onlyMissing}
                  onChange={(event) => setOnlyMissing(event.target.checked)}
                  className="accent-ember-2"
                />
                Seulement les non associés
              </label>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={busy}
                className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold hover:border-ember-2 disabled:opacity-60"
              >
                {busy ? "Lecture…" : "Relire la caisse"}
              </button>
            </div>
          </div>

          <div className="flex max-w-3xl flex-col gap-6">
            {state.formules.some((formule) => !onlyMissing || !formuleRefs.has(formule.id)) && (
              <section className="flex flex-col gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                  Formules
                </h2>
                <ul className="flex flex-col gap-2">
                  {state.formules
                    .filter((formule) => !onlyMissing || !formuleRefs.has(formule.id))
                    .map((formule) => {
                      const entry = formuleRefs.get(formule.id);
                      return (
                        <li key={formule.id} className="rounded-xl border border-hairline bg-surface p-3">
                          <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            <p className="truncate text-sm font-medium">{formule.name}</p>
                            <RefSelect
                              label={`Formule de la caisse pour ${formule.name}`}
                              value={entry?.ref ?? ""}
                              entry={entry}
                              options={deals}
                              onChange={(ref) => void put({ formuleId: formule.id, ref: ref || null })}
                            />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </section>
            )}
            {state.categories.map((category) => {
              const items = category.items.filter(
                (item) => !onlyMissing || !refs.has(`${item.id}||`)
              );
              if (!items.length) return null;
              return (
                <section key={category.id} className="flex flex-col gap-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    {category.name}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => {
                      const entry = refs.get(`${item.id}||`);
                      const choices = (item.options ?? []).flatMap((group) =>
                        group.choices.map((choice) => ({ group, choice }))
                      );
                      return (
                        <li key={item.id} className="rounded-xl border border-hairline bg-surface p-3">
                          <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <RefSelect
                              label={`Produit de la caisse pour ${item.name}`}
                              value={entry?.ref ?? ""}
                              entry={entry}
                              options={skus}
                              onChange={(ref) =>
                                void put({ itemId: item.id, groupId: null, choiceId: null, ref: ref || null })
                              }
                            />
                          </div>
                          {choices.length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-muted">
                                Options ({choices.length})
                              </summary>
                              <ul className="mt-2 flex flex-col gap-2 border-l border-hairline pl-3">
                                {choices.map(({ group, choice }) => {
                                  const choiceEntry = refs.get(`${item.id}|${group.id}|${choice.id}`);
                                  // Les options de la liste du même nom d'abord ; une taille se
                                  // relie à un produit de la caisse.
                                  const sorted = [...(data.snapshot.options ?? [])].sort(
                                    (a, b) =>
                                      Number(b.listName === group.name) - Number(a.listName === group.name)
                                  );
                                  const targets: Choice[] = [
                                    ...sorted.map((option) => ({
                                      value: `option:${option.ref}`,
                                      label: optionLabel(option),
                                      group: "Options",
                                    })),
                                    ...skus.map((sku) => ({
                                      value: `sku:${sku.value}`,
                                      label: sku.label,
                                      group: "Produits (une taille)",
                                    })),
                                  ];
                                  return (
                                    <li
                                      key={`${group.id}-${choice.id}`}
                                      className="grid items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
                                    >
                                      <p className="truncate text-xs text-muted">
                                        {group.name} · {choice.name}
                                      </p>
                                      <RefSelect
                                        label={`Option de la caisse pour ${choice.name}`}
                                        value={choiceEntry ? `${choiceEntry.target}:${choiceEntry.ref}` : ""}
                                        entry={choiceEntry}
                                        options={targets}
                                        onChange={(value) => {
                                          const [target, ...ref] = value.split(":");
                                          void put({
                                            itemId: item.id,
                                            groupId: group.id,
                                            choiceId: choice.id,
                                            target,
                                            ref: ref.join(":") || null,
                                          });
                                        }}
                                      />
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
