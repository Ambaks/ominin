"use client";

import { useState } from "react";
import {
  FermeturesReglees,
  useClosureToggle,
} from "@/components/gestion/commandes/fermetures-bar";
import { useToast } from "@/components/ui/toast";
import { basculerCuisine, type CuisinePartie } from "@/lib/gestion/api";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import {
  closureActive,
  closureUntil,
  dayEndLabel,
  describeTargets,
  listFr,
  serviceClock,
  targetedItems,
} from "@/lib/gestion/fermetures";
import { useGestionAccess } from "@/lib/gestion/store";
import type { Closure, GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import type { MenuCategory } from "@/lib/menu-data";
import { KITCHEN_CLOSED_LABEL } from "@/lib/menu/fermetures";
import { ChevronDownIcon, ClockIcon } from "./icons";
import { Checkbox, GlassButton, GlassFrame, Plate, Sheet } from "./ui";

const TOUTE_LA_CUISINE = "Toute la cuisine";

const articles = (count: number) => `${count} article${count > 1 ? "s" : ""}`;

/** Fermer ou rouvrir une partie du bouton, avec l'avis qui suit. */
function useCuisineToggle(dayEndHour: number) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (
    name: string,
    parties: CuisinePartie[],
    closed: boolean,
    picked?: string[]
  ) => {
    setBusy(true);
    try {
      await basculerCuisine(parties, closed, picked);
      toast.success(
        closed
          ? `« ${name} » à l’arrêt jusqu’à ${dayEndLabel(dayEndHour)}.`
          : `« ${name} » de nouveau en service.`
      );
    } catch (error) {
      toast.error(describeError(error).message);
    } finally {
      setBusy(false);
    }
  };
  return { run, busy };
}

/*
 * Aujourd'hui, pour le gérant et le cuisinier : le bouton, et sous les yeux
 * ce qui est fermé avec de quoi le rouvrir. Chaud et froid fermés ensemble se
 * lisent et se rouvrent comme « Toute la cuisine ».
 */
export function FermetureCuisine({ state }: { state: GestionState }) {
  const { can } = useGestionAccess();
  const now = useNow(WAIT_TICK_MS);
  const [open, setOpen] = useState(false);
  const { run, busy } = useClosureToggle(state.closures, state.categories, state.dayEndHour);
  const cuisine = useCuisineToggle(state.dayEndHour);
  if (!can("fermetures.basculer")) return null;

  const clock = serviceClock(now, state.dayEndHour);
  const active = state.closures.filter((closure) =>
    closureActive(closure, clock, state.dayEndHour)
  );
  const parts = active.filter(
    (closure) => closure.cuisine === "chaud" || closure.cuisine === "froid"
  );
  const whole = parts.length === 2;
  const single = whole ? active.filter((closure) => !parts.includes(closure)) : active;

  return (
    <div data-visite="fermeture-cuisine" className="rounded-g-frame">
      <GlassFrame
        entity={active.length > 0 ? "problem" : "orders"}
        eyebrow="Fermeture cuisine"
        icon={<ClockIcon />}
      >
        <Plate className="px-4">
          {whole && (
            <ActiveRow
              name={TOUTE_LA_CUISINE}
              until={closureUntil(parts[0], clock, state.dayEndHour)}
              targets={listFr(parts.flatMap((part) => targetedItems(part, state.categories)).map((item) => item.name))}
              disabled={cuisine.busy}
              onReopen={() => void cuisine.run(TOUTE_LA_CUISINE, ["chaud", "froid"], false)}
            />
          )}
          {single.map((closure) => (
            <ActiveRow
              key={closure.id}
              name={closure.name}
              until={closureUntil(closure, clock, state.dayEndHour)}
              targets={describeTargets(closure, state.categories)}
              disabled={busy === closure.id}
              onReopen={() => void run(closure, false)}
            />
          ))}
          <div className="flex items-center justify-between gap-4 border-t border-hairline py-2 first:border-t-0 max-sm:flex-col max-sm:items-stretch">
            {active.length === 0 && (
              <p className="text-g-body text-muted">Aucune fermeture en cours.</p>
            )}
            <GlassButton
              variant="primary"
              className="sm:ml-auto"
              onClick={() => setOpen(true)}
            >
              Fermeture cuisine
            </GlassButton>
          </div>
        </Plate>
      </GlassFrame>

      {open && <CuisineSheet state={state} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ActiveRow({
  name,
  until,
  targets,
  disabled,
  onReopen,
}: {
  name: string;
  until: string;
  targets: string;
  disabled: boolean;
  onReopen: () => void;
}) {
  return (
    <div
      role="status"
      className="flex min-h-(--g-step-h) items-center justify-between gap-4 border-t border-hairline py-2 first:border-t-0"
    >
      <div className="min-w-0">
        <p className="text-g-body font-semibold [overflow-wrap:anywhere]">
          {name}
          <span className="font-normal text-muted"> · jusqu’à {until}</span>
        </p>
        <p className="line-clamp-2 text-g-meta text-muted">{targets}</p>
      </div>
      <GlassButton disabled={disabled} onClick={onReopen} aria-label={`Rouvrir : ${name}`}>
        Rouvrir
      </GlassButton>
    </div>
  );
}

function CuisineSheet({ state, onClose }: { state: GestionState; onClose: () => void }) {
  const { can } = useGestionAccess();
  const now = useNow(WAIT_TICK_MS);
  const clock = serviceClock(now, state.dayEndHour);
  const { run, busy } = useCuisineToggle(state.dayEndHour);
  const [picking, setPicking] = useState(false);

  const named = state.closures.filter((closure) => closure.cuisine === null);
  const reserved = (partie: CuisinePartie) =>
    state.closures.find((closure) => closure.cuisine === partie);
  const isActive = (closure: Closure | undefined) =>
    closure !== undefined && closureActive(closure, clock, state.dayEndHour);
  const items = state.categories.flatMap((category) => category.items);
  const part = (partie: "chaud" | "froid", name: string) => ({
    partie,
    name,
    count: items.filter((item) => item.cuisine === partie).length,
    active: isActive(reserved(partie)),
  });
  const parts = [part("chaud", "Plats chauds"), part("froid", "Plats froids")];
  const marked = parts.filter((entry) => entry.count > 0);
  const choix = reserved("choix");

  const act = async (name: string, parties: CuisinePartie[], closed: boolean, picked?: string[]) => {
    await run(name, parties, closed, picked);
    onClose();
  };

  if (picking) {
    return (
      <PickSheet
        categories={state.categories}
        initial={
          choix && isActive(choix)
            ? targetedItems(choix, state.categories).map((item) => item.id)
            : []
        }
        active={isActive(choix)}
        busy={busy}
        onBack={() => setPicking(false)}
        onClose={onClose}
        onConfirm={(picked) =>
          void act("Articles choisis", ["choix"], picked.length > 0, picked)
        }
      />
    );
  }

  const wholeActive = marked.length > 0 && marked.every((entry) => entry.active);
  return (
    <Sheet
      title="Fermeture cuisine"
      description={`Vos clients voient « ${KITCHEN_CLOSED_LABEL} » jusqu’à ${dayEndLabel(state.dayEndHour)}, ou jusqu’à ce que vous rouvriez. Boissons et articles non marqués restent commandables.`}
      onClose={onClose}
    >
      <div className="flex flex-col divide-y divide-hairline">
        {marked.length === 0 ? (
          <div className="flex flex-col items-start gap-3 pb-3">
            <p className="text-g-body">
              Aucun article n’est marqué chaud ou froid : « {TOUTE_LA_CUISINE} » ne fermerait rien.
              {can("menu.edit")
                ? " Marquez vos plats sur la Carte, ou choisissez-les ci-dessous."
                : " Demandez au gérant de les marquer sur la Carte, ou choisissez-les ci-dessous."}
            </p>
            {can("menu.edit") && <GlassButton href="/gestion/menu">Marquer sur la Carte</GlassButton>}
          </div>
        ) : (
          <>
            <ChoiceRow
              name={TOUTE_LA_CUISINE}
              meta={articles(marked.reduce((sum, entry) => sum + entry.count, 0))}
              active={wholeActive}
              disabled={busy}
              onClick={() =>
                void act(
                  TOUTE_LA_CUISINE,
                  wholeActive
                    ? parts.filter((entry) => entry.active).map((entry) => entry.partie)
                    : marked.map((entry) => entry.partie),
                  !wholeActive
                )
              }
            />
            {parts.map((entry) => (
              <ChoiceRow
                key={entry.partie}
                name={entry.name}
                meta={entry.count > 0 ? articles(entry.count) : "Aucun article marqué"}
                active={entry.active}
                disabled={busy || (entry.count === 0 && !entry.active)}
                onClick={() => void act(entry.name, [entry.partie], !entry.active)}
              />
            ))}
          </>
        )}
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex min-h-g-control w-full items-center justify-between gap-3 py-2 text-left touch-manipulation focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1"
        >
          <span className="min-w-0">
            <span className="block text-g-body font-semibold">Choisir</span>
            <span className="block text-g-meta text-muted">
              {isActive(choix) && choix
                ? `À l’arrêt : ${describeTargets(choix, state.categories)}`
                : "Par catégorie, puis article par article"}
            </span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 -rotate-90 text-muted" />
        </button>
      </div>

      {named.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <p className="g-eyebrow text-muted">Fermetures de vos réglages</p>
          <FermeturesReglees
            closures={named}
            categories={state.categories}
            dayEndHour={state.dayEndHour}
          />
        </div>
      )}
    </Sheet>
  );
}

function ChoiceRow({
  name,
  meta,
  active,
  disabled,
  onClick,
}: {
  name: string;
  meta: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-g-control items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-g-body font-semibold">{name}</span>
        <span className="block text-g-meta text-muted">{active ? `À l’arrêt · ${meta}` : meta}</span>
      </span>
      <GlassButton
        variant={active ? "primary" : "secondary"}
        disabled={disabled}
        onClick={onClick}
        aria-label={`${active ? "Rouvrir" : "Fermer"} : ${name}`}
      >
        {active ? "Rouvrir" : "Fermer"}
      </GlassButton>
    </div>
  );
}

/** Les catégories d'abord ; un chevron déplie leurs articles, cochables un à un. */
function PickSheet({
  categories,
  initial,
  active,
  busy,
  onBack,
  onClose,
  onConfirm,
}: {
  categories: MenuCategory[];
  initial: string[];
  active: boolean;
  busy: boolean;
  onBack: () => void;
  onClose: () => void;
  onConfirm: (picked: string[]) => void;
}) {
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(initial));
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(() => new Set());

  const toggled = <T,>(set: ReadonlySet<T>, values: T[], on: boolean) => {
    const next = new Set(set);
    for (const value of values) {
      if (on) next.add(value);
      else next.delete(value);
    }
    return next;
  };

  return (
    <Sheet
      title="Choisir ce qui ferme"
      onClose={onClose}
      footer={
        <>
          {picked.size === 0 && !active && <p>Cochez au moins un article pour fermer.</p>}
          <GlassButton onClick={onBack}>Retour</GlassButton>
          <GlassButton
            variant="primary"
            disabled={busy || (picked.size === 0 && !active)}
            onClick={() => onConfirm([...picked])}
          >
            {picked.size === 0 ? "Tout rouvrir" : `Fermer ${articles(picked.size)}`}
          </GlassButton>
        </>
      }
    >
      <div className="flex flex-col divide-y divide-hairline">
        {categories
          .filter((category) => category.items.length > 0)
          .map((category) => {
            const ids = category.items.map((item) => item.id);
            const count = ids.filter((id) => picked.has(id)).length;
            const isOpen = unfolded.has(category.id);
            return (
              <div key={category.id} className="flex flex-col py-1">
                <div className="flex items-center justify-between gap-2">
                  <Checkbox
                    checked={count === ids.length}
                    onChange={(on) => setPicked(toggled(picked, ids, on))}
                    label={<span className="font-semibold">{category.name}</span>}
                    hint={count > 0 && count < ids.length ? `${count} sur ${ids.length}` : undefined}
                  />
                  <GlassButton
                    variant="icon"
                    aria-expanded={isOpen}
                    aria-label={`Articles de ${category.name}`}
                    onClick={() =>
                      setUnfolded(toggled(unfolded, [category.id], !isOpen))
                    }
                  >
                    <ChevronDownIcon className={isOpen ? "rotate-180" : undefined} />
                  </GlassButton>
                </div>
                {isOpen && (
                  <div className="flex flex-col pl-7">
                    {category.items.map((item) => (
                      <Checkbox
                        key={item.id}
                        checked={picked.has(item.id)}
                        onChange={(on) => setPicked(toggled(picked, [item.id], on))}
                        label={item.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </Sheet>
  );
}
