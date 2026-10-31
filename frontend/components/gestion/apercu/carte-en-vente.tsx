"use client";

import { useDeferredValue, useRef, useState } from "react";
import { Chip, EmptyState, GlassButton, Input, Plate, Switch } from "@/components/gestion/ui";
import { useRunMutation, useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { closedItems, serviceClock } from "@/lib/gestion/fermetures";
import { isItemAvailable, unavailableItems } from "@/lib/gestion/selectors";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { hasBlockedRequiredGroup, type MenuItem } from "@/lib/menu-data";

/*
 * La carte en liste, un interrupteur « En vente » par article : le geste
 * « épuisé » de la cuisine (UX-SIMPLICITÉ § 3.5), là où il se fait. Rien ne
 * bouge sous le doigt : un article épuisé reste à sa place, et un filtre
 * montre ceux à remettre en vente. L'interrupteur écrit `disponible` par
 * l'api existante ; un stock à zéro ou des options épuisées ne se lèvent pas
 * d'ici : la ligne le dit et renvoie à la Carte.
 */

const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/’/g, "'")
    .trim();

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

/** Ce qui retire de la vente un article pourtant « en vente » : se règle dans la Carte. */
function blockedBy(item: MenuItem): string | null {
  if (item.disponible === false) return null;
  if (item.stock === 0) return "Stock épuisé";
  return hasBlockedRequiredGroup(item.options) ? "Options épuisées" : null;
}

const NAME_CLASS = "line-clamp-2 text-g-body font-medium [overflow-wrap:anywhere]";

function ArticleRow({
  item,
  target,
  closedBy,
  onToggle,
}: {
  item: MenuItem;
  /** L'état visé pendant l'aller-retour ; undefined hors écriture. */
  target: boolean | undefined;
  closedBy: string | undefined;
  onToggle: (item: MenuItem, checked: boolean) => void;
}) {
  const blocked = blockedBy(item);
  const enVente = target ?? item.disponible !== false;
  const closure = closedBy && `Fermé : ${closedBy}`;
  return (
    <li
      aria-busy={target !== undefined || undefined}
      className="border-t border-hairline py-1.5 first:border-t-0 sm:rounded-g-card sm:border sm:px-3 sm:first:border-t"
    >
      {blocked ? (
        <div className="flex min-h-g-control items-center justify-between gap-3">
          <span className="grid min-w-0 gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={NAME_CLASS}>{item.name}</span>
              <Chip tone="problem">{blocked}</Chip>
            </span>
            {closure && <small className="text-g-meta text-muted">{closure}</small>}
          </span>
          <GlassButton href="/gestion/menu" aria-label={`Régler ${item.name} dans la Carte`}>
            Régler
          </GlassButton>
        </div>
      ) : (
        <Switch
          checked={enVente}
          onChange={(checked) => onToggle(item, checked)}
          label={
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className={NAME_CLASS}>{item.name}</span>
              {!enVente && <Chip tone="problem">Épuisé</Chip>}
              {target !== undefined && <Chip>Mise à jour…</Chip>}
            </span>
          }
          hint={[enVente ? "En vente" : null, item.detail, closure].filter(Boolean).join(" · ")}
        />
      )}
    </li>
  );
}

/**
 * L'écriture de « En vente » : l'état visé le temps de l'aller-retour pour que
 * l'interrupteur réponde au doigt (le store le confirme, ou le rend sur erreur
 * avec le toast), une écriture à la fois par article, et « Annuler » sur l'épuisé.
 */
function useEnVente() {
  const run = useRunMutation();
  const toast = useToast();
  const [targets, setTargets] = useState<ReadonlyMap<string, boolean>>(new Map());
  // Dans une ref : deux taps dans la même image voient déjà la première écriture.
  const inFlight = useRef(new Set<string>());

  const toggle = async (item: MenuItem, checked: boolean) => {
    if (inFlight.current.has(item.id)) return;
    inFlight.current.add(item.id);
    setTargets((map) => new Map(map).set(item.id, checked));
    await run(async () => {
      await api.setItemAvailability(item.id, checked);
      if (!checked) {
        toast.notice(`« ${item.name} » épuisé.`, {
          label: "Annuler",
          onPress: () => void toggle(item, true),
        });
      }
    });
    inFlight.current.delete(item.id);
    setTargets((map) => {
      const next = new Map(map);
      next.delete(item.id);
      return next;
    });
  };

  return { targets, toggle };
}

/** Les articles retirés de la vente, à l'Aperçu du gérant : le même geste, sans changer d'écran. */
export function ArticlesEpuises({
  state,
  wide = false,
}: {
  state: GestionState;
  /** Seul sur sa rangée : en colonnes, pour que l'interrupteur reste près du nom. */
  wide?: boolean;
}) {
  const { targets, toggle } = useEnVente();
  const now = useNow(WAIT_TICK_MS);
  const closed = closedItems(
    state.closures,
    state.categories,
    serviceClock(now, state.dayEndHour),
    state.dayEndHour
  );
  return (
    <ul role="list" className={`m-0 grid list-none p-0 sm:gap-2 ${wide ? "sm:grid-cols-2 xl:grid-cols-3" : ""}`}>
      {unavailableItems(state).map((item) => (
        <ArticleRow
          key={item.id}
          item={item}
          target={targets.get(item.id)}
          closedBy={closed.get(item.id)}
          onToggle={(target, checked) => void toggle(target, checked)}
        />
      ))}
    </ul>
  );
}

export function CarteEnVente({ state }: { state: GestionState }) {
  const { targets, toggle } = useEnVente();
  const now = useNow(WAIT_TICK_MS);
  const [query, setQuery] = useState("");
  const term = plain(useDeferredValue(query));
  const [onlyOut, setOnlyOut] = useState(false);

  const items = state.categories.flatMap((category) => category.items);
  if (items.length === 0) {
    return <EmptyState text="La carte est encore vide : le gérant y ajoute les articles." />;
  }

  const closed = closedItems(
    state.closures,
    state.categories,
    serviceClock(now, state.dayEndHour),
    state.dayEndHour
  );
  const outCount = items.filter((item) => !isItemAvailable(item)).length;
  // Remis en vente dans la vue filtrée, l'article y reste le temps de l'écriture.
  const matches = (item: MenuItem) =>
    (term === "" || plain(item.name).includes(term)) &&
    (!onlyOut || !isItemAvailable(item) || targets.has(item.id));
  const groups = state.categories
    .map((category) => ({ id: category.id, name: category.name, items: category.items.filter(matches) }))
    .filter((group) => group.items.length > 0);
  // Le filtre se relâche de lui-même une fois le dernier épuisé remis en vente.
  const filtering = onlyOut && outCount > 0;

  return (
    <Plate className="px-5 pb-3 pt-4.5">
      <div className="flex min-h-g-control flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-g-h2">La carte</h2>
          <small className="whitespace-nowrap text-g-meta text-muted tabular-nums">
            {plural(items.length, "article")}
          </small>
        </div>
        {outCount > 0 && (
          <GlassButton
            variant={filtering ? "primary" : "secondary"}
            aria-pressed={filtering}
            onClick={() => setOnlyOut((value) => !value)}
          >
            {plural(outCount, "épuisé")}
          </GlassButton>
        )}
      </div>

      {/* Collée sous la barre haute : la liste fait dix écrans, on cherche depuis n'importe où. */}
      <div className="sticky top-[calc(var(--g-frame-margin)+var(--g-topbar-h))] z-10 -mx-5 bg-surface px-5 py-2">
        <div className="sm:max-w-sm">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            placeholder="Rechercher un article"
            aria-label="Rechercher un article"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
          <p className="text-muted [overflow-wrap:anywhere]">
            Aucun article pour « {query.trim()} »{filtering && " parmi les épuisés"}.
          </p>
          <GlassButton
            onClick={() => {
              setQuery("");
              setOnlyOut(false);
            }}
          >
            Tout afficher
          </GlassButton>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`carte-${group.id}`} className="mt-3">
            <h3 id={`carte-${group.id}`} className="g-field-label mb-1.5">
              {group.name}
            </h3>
            <ul role="list" className="m-0 grid list-none p-0 sm:grid-cols-2 sm:gap-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <ArticleRow
                  key={item.id}
                  item={item}
                  target={targets.get(item.id)}
                  closedBy={closed.get(item.id)}
                  onToggle={(target, checked) => void toggle(target, checked)}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </Plate>
  );
}
