"use client";

import { useEffect, useRef, useState } from "react";
import { GlassButton, Input } from "@/components/gestion/ui";
import type { StaffOrderLine } from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { closedItems, serviceClock } from "@/lib/gestion/fermetures";
import { isItemAvailable } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { applyTarifs, fetchActiveTarifs, type TarifMap } from "@/lib/menu/tarifs";
import { formatPrice } from "@/lib/menu/format";
import { isChoiceAvailable, type MenuItem } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/client";

/*
 * La carte sous les doigts de l'équipe : un client commande au serveur, au
 * comptoir ou au téléphone, et la commande se compose ici — mêmes articles,
 * options et tarifs du moment que pour le client (place_order refige tout).
 * Partagé par la prise de commande en salle et la commande à emporter.
 */

export interface StaffLine {
  key: string;
  itemId: string;
  name: string;
  /** Prix unitaire suppléments compris (comme le fige place_order). */
  unitPrice: number;
  quantity: number;
  choiceSummary: string[];
  choices: { group_id: string; choice_id: string }[];
}

function lineKey(itemId: string, choices: { choice_id: string }[]): string {
  return [itemId, ...choices.map((choice) => choice.choice_id).sort()].join(":");
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Les lignes d'une commande en cours de saisie, et la carte qui les nourrit.
 * `at` : l'heure du retrait quand elle n'est pas maintenant — les fermetures
 * se lisent à cette heure-là.
 */
export function useStaffOrder(state: GestionState, at?: Date) {
  const now = useNow(WAIT_TICK_MS);
  const [lines, setLines] = useState<StaffLine[]>([]);
  const [configuring, setConfiguring] = useState<MenuItem | null>(null);
  const [tarifs, setTarifs] = useState<TarifMap | null>(null);
  const [tarifsFailed, setTarifsFailed] = useState(false);

  // Les tarifs planifiés du moment, relus à l'ouverture : c'est place_order
  // qui figera les prix, et l'équipe annonce souvent le total de vive voix.
  // La carte n'est donc dépliée qu'une fois ces prix connus — un prix qui
  // change sous les yeux du serveur vaudrait pire qu'une seconde d'attente.
  const etablissementId = state.etablissement.id;
  useEffect(() => {
    let live = true;
    fetchActiveTarifs(createClient(), etablissementId)
      .then((loaded) => {
        if (live) setTarifs(loaded);
      })
      .catch(() => {
        if (!live) return;
        setTarifs(new Map());
        setTarifsFailed(true);
      });
    return () => {
      live = false;
    };
  }, [etablissementId]);

  // Ce que le menu refuse au client à cette heure-là : l'équipe le voit, et
  // l'ajoute quand même si la cuisine accepte encore.
  const closed = closedItems(
    state.closures,
    state.categories,
    serviceClock(at ?? now, state.dayEndHour),
    state.dayEndHour
  );

  // Vide tant que les tarifs ne sont pas là : la carte se déplie d'un coup,
  // aux bons prix, plutôt que de les voir changer sous les yeux du serveur.
  const categories =
    tarifs === null
      ? []
      : applyTarifs(
          state.categories
            .map((category) => ({
              ...category,
              items: category.items.filter(isItemAvailable),
            }))
            .filter((category) => category.items.length > 0),
          tarifs
        );

  const total = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );

  const addLine = (line: StaffLine) => {
    setLines((current) => {
      const existing = current.find((candidate) => candidate.key === line.key);
      if (!existing) return [...current, line];
      return current.map((candidate) =>
        candidate.key === line.key
          ? { ...candidate, quantity: candidate.quantity + line.quantity }
          : candidate
      );
    });
    setConfiguring(null);
  };

  const bumpLine = (key: string, delta: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, quantity: line.quantity + delta } : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const addItem = (item: MenuItem) => {
    if (item.options?.length) {
      setConfiguring(item);
      return;
    }
    addLine({
      key: lineKey(item.id, []),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
      choiceSummary: [],
      choices: [],
    });
  };

  const payload: StaffOrderLine[] = lines.map((line) => ({
    itemId: line.itemId,
    quantity: line.quantity,
    choices: line.choices,
  }));

  return {
    lines,
    total,
    payload,
    configuring,
    setConfiguring,
    addLine,
    bumpLine,
    addItem,
    categories,
    loading: tarifs === null,
    tarifsFailed,
    closed,
  };
}

export type StaffOrder = ReturnType<typeof useStaffOrder>;

export function OptionConfigurator({
  item,
  onAdd,
  onBack,
}: {
  item: MenuItem;
  onAdd: (line: StaffLine) => void;
  onBack: () => void;
}) {
  const groups = item.options ?? [];
  const [selection, setSelection] = useState<Record<string, string>>({});
  const complete = groups.every(
    (group) => !group.obligatoire || selection[group.id]
  );

  const add = () => {
    const choices: { group_id: string; choice_id: string }[] = [];
    const summary: string[] = [];
    let supplement = 0;
    for (const group of groups) {
      const choiceId = selection[group.id];
      if (!choiceId) continue;
      const choice = group.choices.find((c) => c.id === choiceId);
      if (!choice) continue;
      choices.push({ group_id: group.id, choice_id: choiceId });
      summary.push(`${group.name} : ${choice.name}`);
      supplement += choice.supplement;
    }
    onAdd({
      key: lineKey(item.id, choices),
      itemId: item.id,
      name: item.name,
      unitPrice: item.price + supplement,
      quantity: 1,
      choiceSummary: summary,
      choices,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-g-h2">{item.name}</p>
        <span className="text-g-body tabular-nums text-muted">
          {formatPrice(item.price)}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <p className="text-g-body font-medium">
            {group.name}
            {!group.obligatoire && (
              <span className="ml-1.5 text-g-meta font-normal text-muted">
                (facultatif)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.choices.map((choice) => {
              const selected = selection[group.id] === choice.id;
              const soldOut = !isChoiceAvailable(choice);
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={soldOut}
                  title={soldOut ? "Épuisé" : undefined}
                  onClick={() =>
                    setSelection((current) =>
                      selected && !group.obligatoire
                        ? Object.fromEntries(
                            Object.entries(current).filter(
                              ([id]) => id !== group.id
                            )
                          )
                        : { ...current, [group.id]: choice.id }
                    )
                  }
                  aria-pressed={selected}
                  className={`g-btn g-press disabled:line-through ${selected ? "g-btn-primary" : "g-btn-secondary"}`}
                >
                  {choice.name}
                  {choice.supplement > 0 && (
                    <span className="ml-1 tabular-nums opacity-80">
                      +{formatPrice(choice.supplement)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-1">
        <GlassButton onClick={onBack}>Retour</GlassButton>
        <GlassButton variant="primary" disabled={!complete} onClick={add}>
          Ajouter
        </GlassButton>
      </div>
    </div>
  );
}

/** Les lignes déjà saisies, quantités ajustables. */
export function StaffLinesList({ order }: { order: StaffOrder }) {
  if (order.lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-g-body font-medium">Commande</p>
      <ul className="g-plate flex flex-col">
        {order.lines.map((line, index) => (
          <li
            key={line.key}
            className={`flex items-center gap-3 px-4 py-2 ${
              index > 0 ? "border-t border-hairline" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-g-body font-medium [overflow-wrap:anywhere]">{line.name}</p>
              {line.choiceSummary.length > 0 && (
                <p className="text-g-meta text-muted">
                  {line.choiceSummary.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center rounded-full border border-hairline">
              <button
                type="button"
                onClick={() => order.bumpLine(line.key, -1)}
                className="flex size-g-control items-center justify-center rounded-full text-lg text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                aria-label={`Retirer un ${line.name}`}
              >
                −
              </button>
              <span className="min-w-4 text-center text-g-body font-semibold tabular-nums">
                {line.quantity}
              </span>
              <button
                type="button"
                onClick={() => order.bumpLine(line.key, 1)}
                className="flex size-g-control items-center justify-center rounded-full text-lg text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
                aria-label={`Ajouter un ${line.name}`}
              >
                +
              </button>
            </div>
            <span className="shrink-0 text-g-body tabular-nums">
              {formatPrice(line.unitPrice * line.quantity)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** « Éclair » se trouve en tapant « eclair » : la recherche ignore accents et casse. */
const searchable = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** La carte par catégorie, chaque article ajouté d'un geste ; une recherche pour aller vite. */
export function StaffMenu({ order }: { order: StaffOrder }) {
  const [query, setQuery] = useState("");
  const needle = searchable(query.trim());
  const categories = needle
    ? order.categories
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => searchable(item.name).includes(needle)),
        }))
        .filter((category) => category.items.length > 0)
    : order.categories;
  const found = needle !== "" && categories.length > 0;

  // Le champ vient après le reste de la commande : à la frappe, il remonte en
  // haut de la fenêtre, et les résultats s'affichent dessous plutôt que sous
  // le clavier d'un téléphone.
  const searchRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (found) searchRef.current?.scrollIntoView({ block: "start" });
  }, [needle, found]);

  return (
    <>
      {!order.loading && (
        <div ref={searchRef}>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un article"
            aria-label="Rechercher un article de la carte"
          />
        </div>
      )}
      {order.tarifsFailed && (
        <p className="g-plate px-4 py-3 text-g-meta text-muted">
          Les tarifs planifiés n&apos;ont pas pu être relus : les prix
          ci-dessous sont ceux de la carte. La commande, elle, sera
          enregistrée au tarif du moment.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {order.loading && (
          <p className="text-g-meta text-muted">Chargement de la carte…</p>
        )}
        {needle && categories.length === 0 && (
          <p className="text-g-body text-muted">Aucun article ne correspond à « {query.trim()} ».</p>
        )}
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-1.5">
            <p className="g-eyebrow">{category.name}</p>
            <ul className="flex flex-col">
              {category.items.map((item) => (
                <li
                  key={item.id}
                  className="flex min-h-g-control items-center gap-3 border-b border-hairline py-1 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-g-body">{item.name}</p>
                    {item.options && item.options.length > 0 && (
                      <p className="text-g-meta text-muted">Avec options</p>
                    )}
                    {order.closed.has(item.id) && (
                      <p className="text-g-meta font-medium text-ember-3">
                        Fermé · {order.closed.get(item.id)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-g-body tabular-nums text-muted">
                    {formatPrice(item.price)}
                  </span>
                  <GlassButton variant="icon" aria-label={`Ajouter ${item.name}`} onClick={() => order.addItem(item)}>
                    <PlusIcon />
                  </GlassButton>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
