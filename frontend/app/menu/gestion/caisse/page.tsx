"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Chip,
  EmptyState,
  GlassButton,
  Notice,
  Plate,
  ReserveGerant,
  SectionHeading,
  Segmented,
  Select,
  Shimmer,
  StatTile,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import type { CatalogDeal, CatalogOption, CatalogSku, CatalogSnapshot } from "@/lib/hubrise/catalog";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { describeError } from "@/lib/gestion/errors";

/*
 * Carte ↔ catalogue de la caisse. Une caisse retrouve un produit par son
 * code : chaque article se relie à un produit du catalogue de la caisse,
 * chaque choix d'option à une de ses options — ou, pour une taille, à un
 * autre produit —, chaque formule à un de ses deals. Les correspondances
 * évidentes sont déjà posées (« auto ») ; le gérant fait le reste. Ominin
 * garde ses prix, photos et textes — seuls les codes viennent de la caisse.
 *
 * Page d'expert, rangée sous Réglages › Caisse connectée : elle ouvre sur
 * « N sans code », le filtre déjà posé quand il en manque (UX-SIMPLICITE § 2.16).
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

const VIEWS = [
  { value: "missing", label: "Sans code" },
  { value: "all", label: "Toute la carte" },
] as const;
type View = (typeof VIEWS)[number]["value"];

/** La liste native du kit, l'auto/manuel en pastille. */
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
      <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1">
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
      </Select>
      {entry && <Chip>{entry.matchedBy === "auto" ? "auto" : "manuel"}</Chip>}
    </div>
  );
}

function Block({ i, className = "", children }: { i: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`g-rise ${className}`} style={{ "--g-i": i } as CSSProperties}>
      {children}
    </div>
  );
}

/** Une catégorie (ou les formules) sur une plaque, ses lignes séparées d'un filet. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-g-h2">{title}</h2>
      <Plate className="flex flex-col divide-y divide-hairline px-4">{children}</Plate>
    </section>
  );
}

const ROW = "grid items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]";

export default function CaissePage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const toast = useToast();
  const [data, setData] = useState<CatalogData | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View | null>(null);
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
      toast.error(describeError(error).message);
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
      toast.error(describeError(error).message);
    }
    setBusy(false);
  };

  if (!state) return null;
  const allItems = state.categories.flatMap((category) => category.items);
  const mapped = allItems.filter((item) => refs.has(`${item.id}||`)).length;
  const formulesMapped = state.formules.filter((formule) => formuleRefs.has(formule.id)).length;
  const missing = allItems.length - mapped + state.formules.length - formulesMapped;
  // Ouvre sur ce qui manque ; tout relié, sur toute la carte.
  const shownView: View = view ?? (missing > 0 ? "missing" : "all");
  const onlyMissing = shownView === "missing";

  const header = (
    <Block i={0}>
      <SectionHeading
        level={1}
        title="Carte et caisse"
        sub="Chaque article se relie à son produit dans votre caisse : c’est par ce code qu’elle reconnaît la ligne, applique sa TVA et décompte son stock."
        right={<GlassButton href="/gestion/etablissement">← Réglages</GlassButton>}
      />
    </Block>
  );

  if (!can("etablissement.edit")) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Block i={1}>
          <ReserveGerant ask="relier la carte à la caisse" />
        </Block>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Block i={1}>
          <EmptyState
            text="HubRise n’est pas relié : connectez-le depuis Réglages, puis revenez ici."
            action={<GlassButton variant="primary" href="/gestion/etablissement">Ouvrir Réglages</GlassButton>}
          />
        </Block>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Block i={1} className="grid gap-g-gap sm:grid-cols-2">
          <Shimmer className="h-28" />
          <Shimmer className="h-28" />
        </Block>
        <Block i={2}>
          <Shimmer className="h-64" />
        </Block>
      </div>
    );
  }

  const formules = state.formules.filter((formule) => !onlyMissing || !formuleRefs.has(formule.id));
  const categories = state.categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => !onlyMissing || !refs.has(`${item.id}||`)),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {header}

      <Block i={1} className="grid gap-g-gap sm:grid-cols-2">
        <StatTile
          entity={missing > 0 ? "problem" : "orders"}
          label="Sans code"
          value={String(missing)}
          baseline={
            missing > 0
              ? "la caisse les reçoit sans les reconnaître"
              : "toute la carte est reliée"
          }
          title="Articles et formules sans code de caisse"
        />
        <StatTile
          entity="orders"
          label="Reliés"
          value={`${mapped + formulesMapped} / ${allItems.length + state.formules.length}`}
          baseline={`${data.snapshot.skus.length} produits dans la caisse${data.syncedAt ? "" : " · catalogue pas encore lu"}`}
          title="Articles et formules reliés à un produit de la caisse"
        />
      </Block>

      {missing > 0 && (
        <Block i={2}>
          <Notice
            title={`${missing} sans code`}
            text="La caisse les reçoit sans les reconnaître : TVA par défaut, hors stock et hors ventes. Certaines caisses les refusent."
          />
        </Block>
      )}

      <Block i={3} className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Afficher" options={VIEWS} value={shownView} onChange={setView} glass={false} />
        <GlassButton onClick={() => void refresh()} disabled={busy}>
          {busy ? "Lecture…" : "Relire la caisse"}
        </GlassButton>
      </Block>

      <Block i={4} className="flex flex-col gap-5">
        {formules.length === 0 && categories.length === 0 && (
          <EmptyState
            text={onlyMissing ? "Tout est relié : chaque article a son code de caisse." : "Aucun article sur la carte."}
            action={onlyMissing ? <GlassButton onClick={() => setView("all")}>Voir toute la carte</GlassButton> : undefined}
          />
        )}
        {formules.length > 0 && (
          <Group title="Formules">
            {formules.map((formule) => {
              const entry = formuleRefs.get(formule.id);
              return (
                <div key={formule.id} className={ROW}>
                  <p className="truncate text-g-body font-medium">{formule.name}</p>
                  <RefSelect
                    label={`Formule de la caisse pour ${formule.name}`}
                    value={entry?.ref ?? ""}
                    entry={entry}
                    options={deals}
                    onChange={(ref) => void put({ formuleId: formule.id, ref: ref || null })}
                  />
                </div>
              );
            })}
          </Group>
        )}
        {categories.map((category) => (
          <Group key={category.id} title={category.name}>
            {category.items.map((item) => {
              const entry = refs.get(`${item.id}||`);
              const choices = (item.options ?? []).flatMap((group) =>
                group.choices.map((choice) => ({ group, choice }))
              );
              return (
                <div key={item.id} className="py-1">
                  <div className={ROW}>
                    <p className="truncate text-g-body font-medium">{item.name}</p>
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
                    <details className="group pb-2">
                      <summary className="flex min-h-g-control cursor-pointer list-none items-center gap-2 text-g-label text-muted [&::-webkit-details-marker]:hidden">
                        <span className="transition-transform group-open:rotate-90">›</span>
                        Options ({choices.length})
                      </summary>
                      <ul className="mt-1 flex flex-col border-l border-hairline pl-3">
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
                            <li key={`${group.id}-${choice.id}`} className={ROW}>
                              <p className="truncate text-g-label text-muted">
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
                </div>
              );
            })}
          </Group>
        ))}
      </Block>
    </div>
  );
}
