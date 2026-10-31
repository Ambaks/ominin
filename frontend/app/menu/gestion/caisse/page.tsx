"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronDownIcon } from "@/components/gestion/icons";
import {
  Chip,
  EmptyState,
  ErrorNotice,
  GlassButton,
  Notice,
  Plate,
  ReserveGerant,
  SectionHeading,
  Segmented,
  Select,
  Shimmer,
} from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import { describeError } from "@/lib/gestion/errors";
import { formatPickup } from "@/lib/gestion/format";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import type { CatalogDeal, CatalogOption, CatalogSku, CatalogSnapshot } from "@/lib/hubrise/catalog";
import type { MenuItem } from "@/lib/menu-data";

/*
 * Carte ↔ catalogue de la caisse. Une caisse retrouve un produit par son
 * code : chaque article se relie à un produit du catalogue de la caisse,
 * chaque choix d'option à une de ses options — ou, pour une taille, à un
 * autre produit —, chaque formule à un de ses deals. Les correspondances
 * évidentes sont déjà posées (« auto ») ; le gérant fait le reste. Ominin
 * garde ses prix, photos et textes — seuls les codes viennent de la caisse.
 *
 * Page d'expert, rangée sous Réglages : elle ouvre sur ce qui reste sans code
 * (UX-SIMPLICITE § 2.16). Un geste répété des dizaines de fois : la ligne
 * reliée reste sous le doigt jusqu'au changement de vue, la liste ne saute pas.
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

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1";
const ROW = "grid items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]";

const refKey = (itemId: string, groupId = "", choiceId = "") => `${itemId}|${groupId}|${choiceId}`;

type Save = (key: string, rowId: string, value: string, body: Record<string, unknown>) => void;

/** Une ligne : le nom et son état à gauche, la liste native du kit à droite ; elle garde sa largeur quel que soit l'état. */
function RefRow({
  name,
  muted = false,
  value,
  pending,
  entry,
  options,
  onChange,
  label,
}: {
  name: string;
  muted?: boolean;
  value: string;
  /** Le choix en cours d'enregistrement : affiché sans attendre le retour. */
  pending: string | undefined;
  entry: { matchedBy: "auto" | "manual" } | undefined;
  options: Choice[];
  onChange: (value: string) => void;
  label: string;
}) {
  const shown = pending ?? value;
  const known = options.some((option) => option.value === shown);
  const groups = [...new Set(options.map((option) => option.group))];
  const render = (list: Choice[]) =>
    list.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ));
  return (
    <div className={ROW}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <p className={`min-w-0 [overflow-wrap:anywhere] ${muted ? "text-g-label text-muted" : "text-g-body font-medium"}`}>{name}</p>
        {pending !== undefined ? <Chip>Mise à jour…</Chip> : entry && <Chip>{entry.matchedBy === "auto" ? "auto" : "manuel"}</Chip>}
      </div>
      <Select aria-label={label} value={shown} onChange={(event) => onChange(event.target.value)} className="min-w-0">
        <option value="">Sans code</option>
        {/* Le code garde sa place même si la caisse l'a retiré de son catalogue. */}
        {shown && !known && (
          <option value={shown}>{shown.replace(/^(sku|option):/, "")} (absent du catalogue)</option>
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
    </div>
  );
}

/**
 * Les choix d'un article, repliés comme avant : le résumé dit ce qui manque, et
 * leurs listes (des centaines d'entrées chacune) ne se montent qu'à l'ouverture.
 */
function ItemOptions({
  item,
  refs,
  catalogOptions,
  skus,
  pending,
  save,
}: {
  item: MenuItem;
  refs: Map<string, Ref>;
  catalogOptions: CatalogOption[];
  skus: Choice[];
  pending: ReadonlyMap<string, string>;
  save: Save;
}) {
  const [open, setOpen] = useState(false);
  const choices = (item.options ?? []).flatMap((group) => group.choices.map((choice) => ({ group, choice })));
  const missing = choices.filter(({ group, choice }) => !refs.has(refKey(item.id, group.id, choice.id))).length;
  // Les options de la liste du même nom d'abord ; une taille se relie à un produit de la caisse.
  const targetsFor = (groupName: string): Choice[] => [
    ...[...catalogOptions]
      .sort((a, b) => Number(b.listName === groupName) - Number(a.listName === groupName))
      .map((option) => ({ value: `option:${option.ref}`, label: optionLabel(option), group: "Options" })),
    ...skus.map((sku) => ({ value: `sku:${sku.value}`, label: sku.label, group: "Produits (une taille)" })),
  ];
  if (choices.length === 0) return null;
  return (
    <details className="group pb-2" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        className={`flex min-h-g-control cursor-pointer list-none items-center gap-2 rounded-g-card text-g-label text-muted touch-manipulation select-none [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        <ChevronDownIcon className="size-4 -rotate-90 transition-transform duration-(--g-morph-dur) ease-(--g-ease-move) group-open:rotate-0 motion-reduce:transition-none" />
        {missing > 0 ? `Options (${missing} sans code sur ${choices.length})` : `Options (${choices.length})`}
      </summary>
      {open && (
        <ul className="mt-1 flex flex-col border-l border-hairline pl-3">
          {choices.map(({ group, choice }) => {
            const entry = refs.get(refKey(item.id, group.id, choice.id));
            const key = refKey(item.id, group.id, choice.id);
            return (
              <li key={`${group.id}-${choice.id}`}>
                <RefRow
                  muted
                  name={`${group.name} · ${choice.name}`}
                  label={`Option de la caisse pour ${item.name}, ${group.name} : ${choice.name}`}
                  value={entry ? `${entry.target}:${entry.ref}` : ""}
                  pending={pending.get(key)}
                  entry={entry}
                  options={targetsFor(group.name)}
                  onChange={(value) => {
                    const [target, ...ref] = value.split(":");
                    save(key, item.id, value, {
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
      )}
    </details>
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

export default function CaissePage() {
  const state = useGestion();
  const { can } = useGestionAccess();
  const toast = useToast();
  const [data, setData] = useState<CatalogData | null>(null);
  const [notLinked, setNotLinked] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  // Le choix en cours d'enregistrement, ligne par ligne.
  const [pending, setPending] = useState<ReadonlyMap<string, string>>(new Map());
  // Les lignes touchées depuis l'ouverture de la vue : elles restent sous le doigt.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());
  // Deux enregistrements rapprochés relisent chacun : seule la dernière lecture compte.
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    const run = ++lastLoad.current;
    try {
      const response = await fetch("/api/hubrise/catalog");
      if (run !== lastLoad.current) return;
      if (response.status === 409) {
        setNotLinked(true);
        return;
      }
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
      const next = (await response.json()) as CatalogData;
      if (run !== lastLoad.current) return;
      setData(next);
      setLoadError(null);
    } catch (error) {
      // Les derniers codes connus restent affichés, avec le bandeau.
      if (run === lastLoad.current) setLoadError(error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const refs = useMemo(() => {
    const map = new Map<string, Ref>();
    for (const ref of data?.refs ?? []) {
      map.set(refKey(ref.itemId, ref.groupId ?? "", ref.choiceId ?? ""), ref);
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
    setKept(new Set());
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
  const total = allItems.length + state.formules.length;
  const mapped = allItems.filter((item) => refs.has(refKey(item.id))).length;
  const formulesMapped = state.formules.filter((formule) => formuleRefs.has(formule.id)).length;
  const missing = total - mapped - formulesMapped;
  const optionsMissingOf = (item: MenuItem) =>
    (item.options ?? [])
      .flatMap((group) => group.choices.map((choice) => refKey(item.id, group.id, choice.id)))
      .filter((key) => !refs.has(key)).length;
  const optionsMissing = allItems.reduce((sum, item) => sum + optionsMissingOf(item), 0);
  // Ouvre sur ce qui manque ; tout relié, sur toute la carte.
  const shownView: View = view ?? (missing + optionsMissing > 0 ? "missing" : "all");
  const onlyMissing = shownView === "missing";

  // Le premier geste épingle la vue : la dernière liaison ne fait pas basculer la liste.
  const save: Save = (key, rowId, value, body) => {
    setView(shownView);
    setKept((current) => new Set(current).add(rowId));
    setPending((current) => new Map(current).set(key, value));
    void put(body).finally(() =>
      setPending((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      })
    );
  };

  const header = (
    <Block i={0}>
      <SectionHeading
        level={1}
        title="Carte et caisse"
        sub="Chaque article prend le code de son produit en caisse : sa TVA, son stock et ses ventes en dépendent."
        right={
          <span className="max-sm:hidden">
            <GlassButton href="/gestion/etablissement">← Réglages</GlassButton>
          </span>
        }
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

  if (notLinked) {
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
        {loadError !== null ? (
          <ErrorNotice error={loadError} onRetry={() => void load()} />
        ) : (
          <div aria-busy className="flex flex-col gap-5">
            <Shimmer className="h-20" />
            <Shimmer className="h-64" />
          </div>
        )}
      </div>
    );
  }

  const formules = state.formules.filter(
    (formule) => !onlyMissing || !formuleRefs.has(formule.id) || kept.has(formule.id)
  );
  const categories = state.categories
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) => !onlyMissing || !refs.has(refKey(item.id)) || optionsMissingOf(item) > 0 || kept.has(item.id)
      ),
    }))
    .filter((category) => category.items.length > 0);
  const syncedToday = data.syncedAt && new Date(data.syncedAt).toDateString() === new Date().toDateString();
  const relu = data.syncedAt
    ? `catalogue relu ${syncedToday ? "à" : "le"} ${formatPickup(data.syncedAt)}`
    : "catalogue pas encore lu";
  const summary =
    missing > 0
      ? `${missing} sans code sur ${total}`
      : optionsMissing > 0
        ? `${total} sur ${total} reliés`
        : null;
  const reread = (
    <GlassButton onClick={() => void refresh()} disabled={busy}>
      {busy ? "Lecture…" : "Relire la caisse"}
    </GlassButton>
  );

  return (
    <div className="flex flex-col gap-5">
      {header}

      {loadError !== null && <ErrorNotice error={loadError} onRetry={() => void load()} />}

      {data.snapshot.skus.length === 0 ? (
        <Notice
          i={1}
          tone="info"
          title="Le catalogue de la caisse est vide"
          text="Relisez-le d’abord : les listes ci-dessous se remplissent avec ses produits."
          action={reread}
        />
      ) : (
        summary !== null && (
          <Notice
            i={1}
            title={summary}
            text={`${optionsMissing > 0 ? `Et ${optionsMissing} choix d’options. ` : ""}La caisse les reçoit sans les reconnaître : TVA par défaut, hors stock et hors ventes. Certaines les refusent.`}
          />
        )
      )}

      <Block i={2} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Afficher les articles"
            options={VIEWS}
            value={shownView}
            onChange={(next) => {
              setView(next);
              setKept(new Set());
            }}
            glass={false}
          />
          {data.snapshot.skus.length > 0 && reread}
        </div>
        <p className="text-g-meta text-muted">
          {`${data.snapshot.skus.length} produits dans la caisse · ${relu}`}
          {summary === null && total > 0 ? ` · ${total} sur ${total} reliés` : ""}
        </p>
      </Block>

      <Block i={3} className={`flex flex-col gap-5 ${busy ? "g-stale" : ""}`}>
        {formules.length === 0 && categories.length === 0 && (
          <EmptyState
            text={onlyMissing ? "Tout est relié : chaque article a son code de caisse." : "Aucun article sur la carte."}
            action={
              onlyMissing ? (
                <GlassButton onClick={() => setView("all")}>Voir toute la carte</GlassButton>
              ) : (
                <GlassButton href="/gestion/menu">Ouvrir la carte</GlassButton>
              )
            }
          />
        )}
        {formules.length > 0 && (
          <Group title="Formules">
            {formules.map((formule) => {
              const entry = formuleRefs.get(formule.id);
              const key = `formule|${formule.id}`;
              return (
                <RefRow
                  key={formule.id}
                  name={formule.name}
                  label={`Formule de la caisse pour ${formule.name}`}
                  value={entry?.ref ?? ""}
                  pending={pending.get(key)}
                  entry={entry}
                  options={deals}
                  onChange={(ref) => save(key, formule.id, ref, { formuleId: formule.id, ref: ref || null })}
                />
              );
            })}
          </Group>
        )}
        {categories.map((category) => (
          <Group key={category.id} title={category.name}>
            {category.items.map((item) => {
              const key = refKey(item.id);
              const entry = refs.get(key);
              return (
                <div key={item.id} className="py-1">
                  <RefRow
                    name={item.name}
                    label={`Produit de la caisse pour ${item.name}`}
                    value={entry?.ref ?? ""}
                    pending={pending.get(key)}
                    entry={entry}
                    options={skus}
                    onChange={(ref) =>
                      save(key, item.id, ref, { itemId: item.id, groupId: null, choiceId: null, ref: ref || null })
                    }
                  />
                  <ItemOptions
                    item={item}
                    refs={refs}
                    catalogOptions={data.snapshot.options ?? []}
                    skus={skus}
                    pending={pending}
                    save={save}
                  />
                </div>
              );
            })}
          </Group>
        ))}
      </Block>
    </div>
  );
}
