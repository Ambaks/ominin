"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { CheckIcon, ClockIcon } from "@/components/gestion/icons";
import { TableSheet } from "@/components/gestion/tables/table-sheet";
import { Chip, EmptyState, GlassButton, SectionHeading } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { SERVICE_LATE_MINUTES, WAIT_TICK_MS } from "@/lib/gestion/constants";
import { describeError } from "@/lib/gestion/errors";
import { activeTables, awaitsService, type TableService } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
import { formatWait, useNow } from "@/lib/gestion/use-now";
import type { GestionState, Staff } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";

/*
 * La salle vue par ses tables : seules celles en service apparaissent, avec
 * ce qu'il leur reste à encaisser et à servir. Une table se touche pour voir
 * son addition et ses plats ; le bouton + ouvre une table (numéro connu ou
 * nouveau) en y prenant une commande. Deux tables réunies n'en font qu'une
 * ici — c'est l'addition qui compte, pas le mobilier.
 */

/** Au-delà de ce rang, les tuiles présentes à l'arrivée montent ensemble : une salle de 40 tables n'attend pas 3 s. */
const RISE_CAP = 8;

/** Ce qu'il reste à faire sur la table : un chiffre, son mot, un point à la couleur de l'entité. */
function Due({ entity, value, label }: { entity: "g-money" | "g-orders"; value: string; label: string }) {
  return (
    <span className={`${entity} flex flex-wrap items-baseline gap-x-1.5`}>
      <i aria-hidden className="size-1.5 self-center rounded-full bg-g-entity" />
      <span className="text-g-label font-semibold tabular-nums">{value}</span>
      <span className="text-g-meta text-muted">{label}</span>
    </span>
  );
}

/**
 * Une table en service, sur sa plaque : le numéro se lit de loin, dessous ce
 * qui reste à encaisser et à servir. En mode « réunir », la tuile se coche ;
 * une table déjà réunie ne se réunit pas une seconde fois.
 */
function TableTile({
  service,
  serveur,
  joining,
  selected,
  selectable,
  rise,
  ready,
  waited,
  visite,
  onClick,
  onReadyEnd,
}: {
  service: TableService;
  serveur: Staff | undefined;
  joining: boolean;
  selected: boolean;
  selectable: boolean;
  /** Rang de l'entrée décalée ; 0 pour une table qui s'ouvre en cours de service. */
  rise: number;
  /** La table vient de s'ouvrir d'elle-même : une onde, une fois. */
  ready: boolean;
  /** Minutes d'attente des plats à servir ; null quand il n'y en a pas. */
  waited: number | null;
  visite: boolean;
  onClick: () => void;
  onReadyEnd: () => void;
}) {
  const { tables: joined, toPay, toServe } = service;
  return (
    <div className={`g-rise ${joined.length > 1 ? "col-span-2" : ""}`} style={{ "--g-i": rise } as CSSProperties}>
      <button
        type="button"
        data-visite={visite ? "tables-salle" : undefined}
        aria-pressed={joining ? selected : undefined}
        disabled={joining && !selectable}
        onClick={onClick}
        // Une seule fois : une tuile remontée (tables séparées) ne rejoue pas l'onde.
        onAnimationEnd={(event) => {
          if (event.animationName === "g-ready") onReadyEnd();
        }}
        className={`g-plate g-press relative isolate ${ready ? "g-ready" : ""} flex h-full w-full flex-col items-start gap-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 disabled:opacity-40 ${
          selected
            ? "outline-2 -outline-offset-1 outline-ember-2 before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-[color-mix(in_srgb,var(--ember-2)_var(--g-tint-a),transparent)]"
            : "pointer-fine:hover:outline-1 pointer-fine:hover:-outline-offset-1 pointer-fine:hover:outline-[var(--g-ring-hover)]"
        }`}
      >
        {selected && (
          <span className="g-orders absolute right-3 top-3 flex text-g-entity *:size-5">
            <CheckIcon />
          </span>
        )}
        <span className="g-orders g-eyebrow">{joined.length > 1 ? "Tables" : "Table"}</span>
        <span className="font-display text-g-day tabular-nums">
          {joined.map((entry) => entry.number).join(" + ")}
        </span>
        {serveur && <span className="max-w-full truncate text-g-meta text-muted">{serveur.name}</span>}
        {(toPay > 0 || toServe > 0) && (
          <span className="mt-auto flex flex-col gap-1 pt-1">
            {toPay > 0 && <Due entity="g-money" value={formatPrice(toPay)} label="à encaisser" />}
            {toServe > 0 && (
              <Due
                entity="g-orders"
                value={String(toServe)}
                label={waited ? `à servir · ${formatWait(waited)}` : "à servir"}
              />
            )}
          </span>
        )}
        {/* Le retard se dit en toutes lettres, comme sur la carte « À servir ». */}
        {waited !== null && waited >= SERVICE_LATE_MINUTES && (
          <Chip tone="problem" icon={<ClockIcon />}>
            En retard
          </Chip>
        )}
        {joining && !selectable && <Chip>Déjà réunies</Chip>}
      </button>
    </div>
  );
}

function TablesView({ state }: { state: GestionState }) {
  const { hasFeature } = useGestionAccess();
  const toast = useToast();
  const [openTableId, setOpenTableId] = useState<string | null>(null);
  // Sélection en cours pour réunir des tables ; null quand on ne réunit pas.
  const [joining, setJoining] = useState<string[] | null>(null);
  const [creating, setCreating] = useState(false);
  const now = useNow(WAIT_TICK_MS);
  // La cascade ne vaut que pour l'arrivée sur la page : une tuile montée
  // ensuite (table ouverte, tables séparées) n'attend pas son rang.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const tables = activeTables(state);

  // Une table qui s'ouvre pendant le service (commande du QR, autre appareil)
  // se signale d'une onde. On suit le mobilier, pas les additions : séparer
  // des tables n'ouvre rien. La table prise ici n'apprend rien à qui vient de
  // l'ouvrir : rien pendant le dialogue, et il tait la table suivante, car sa
  // commande peut arriver après lui. Un dialogue abandonné en perd une au plus.
  const seated = tables.flatMap((entry) => entry.tables.map((table) => table.id));
  const [known, setKnown] = useState(() => new Set(seated));
  const [ready, setReady] = useState<ReadonlySet<string>>(new Set());
  const [ownNext, setOwnNext] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const fresh = seated.filter((id) => !known.has(id));
  if (fresh.length > 0 || known.size !== seated.length) {
    setKnown(new Set(seated));
    const kept = [...ready].filter((id) => seated.includes(id));
    const silent = creating || ownNext;
    setReady(new Set(silent ? kept : [...kept, ...fresh]));
    if (fresh.length > 0 && !creating) setOwnNext(false);
    // Le lecteur d'écran, et le mouvement réduit qui coupe l'onde.
    if (fresh.length > 0 && !silent) {
      const numbers = state.tables.filter((table) => fresh.includes(table.id)).map((table) => table.number);
      setOpened(`${numbers.length > 1 ? "Tables" : "Table"} ${numbers.join(", ")} en service.`);
    }
  }

  const sheet = tables.find((entry) => entry.table.id === openTableId);
  // La fiche se ferme avec sa dernière commande : la table ne la rouvre pas
  // d'elle-même à la commande suivante.
  if (openTableId && !sheet) setOpenTableId(null);
  // Une table partie en cours de sélection n'est pas réunie ; sans deux
  // tables, le mode n'a plus de sens.
  if (joining) {
    const live = joining.filter((id) => tables.some((entry) => entry.table.id === id));
    if (tables.length < 2) setJoining(null);
    else if (live.length !== joining.length) setJoining(live);
  }

  const staffById = new Map(state.staff.map((member) => [member.id, member]));
  const canJoin = hasFeature("groupes_tables");
  const canOrder = hasFeature("prise_commande");

  const join = async () => {
    const ids = joining ?? [];
    setJoining(null);
    try {
      await api.groupTables(ids);
      toast.success("Tables réunies.");
    } catch (error) {
      toast.error(describeError(error).message);
    }
  };

  const toggle = (id: string) =>
    setJoining((current) =>
      (current ?? []).includes(id)
        ? (current ?? []).filter((entry) => entry !== id)
        : [...(current ?? []), id]
    );

  return (
    <div className="grid gap-5">
      <div className="g-rise" style={{ "--g-i": 0 } as CSSProperties}>
        <SectionHeading
          level={1}
          title="Tables"
          sub={
            !joining && tables.length
              ? "Les tables en service. Touchez une table pour voir son addition et ses plats."
              : undefined
          }
          right={
            canJoin &&
            tables.length > 1 && (
              <div className="flex shrink-0 items-center gap-2">
                {joining && <GlassButton onClick={() => setJoining(null)}>Annuler</GlassButton>}
                <GlassButton
                  variant="primary"
                  data-visite="tables-reunir"
                  onClick={() => (joining ? void join() : setJoining([]))}
                  disabled={joining != null && joining.length < 2}
                >
                  {joining ? `Réunir (${joining.length})` : "Réunir des tables"}
                </GlassButton>
              </div>
            )
          }
        />
        {joining && (
          <p role="status" className="mt-2 text-g-meta text-muted">
            {joining.length < 2
              ? "Cochez au moins deux tables à réunir sous une même addition."
              : `${joining.length} tables cochées.`}
          </p>
        )}
      </div>

      {tables.length === 0 ? (
        <div data-visite="tables-salle" className="g-rise" style={{ "--g-i": 1 } as CSSProperties}>
          <EmptyState
            text={
              canOrder
                ? "Aucune table en service. Appuyez sur + pour ouvrir une table et prendre une commande ; les commandes du menu QR ouvrent leur table d'elles-mêmes."
                : "Aucune table en service. Les commandes du menu QR ouvrent leur table d'elles-mêmes."
            }
          />
        </div>
      ) : (
        // Le bas de page garde la place du bouton flottant : il ne cache jamais une tuile.
        <div
          className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${canOrder ? "pb-[var(--g-fab)]" : ""}`}
        >
          {tables.map((service, index) => {
            const { table, tables: joined, orders } = service;
            const oldest = orders.filter(awaitsService).map((order) => order.createdAt).sort()[0];
            // En minutes d'horloge, comme la carte « À servir ».
            const waited =
              oldest && service.toServe > 0
                ? Math.max(0, Math.floor(now.getTime() / 60_000) - Math.floor(Date.parse(oldest) / 60_000))
                : null;
            return (
              <TableTile
                key={table.groupId ?? table.id}
                service={service}
                serveur={table.staffId ? staffById.get(table.staffId) : undefined}
                joining={joining != null}
                selected={joining?.includes(table.id) ?? false}
                selectable={joined.length === 1}
                rise={settled ? 0 : Math.min(index + 1, RISE_CAP)}
                ready={ready.has(table.id)}
                waited={waited}
                visite={index === 0}
                onClick={() => (joining ? toggle(table.id) : setOpenTableId(table.id))}
                onReadyEnd={() =>
                  setReady((current) => new Set([...current].filter((id) => id !== table.id)))
                }
              />
            );
          })}
        </div>
      )}

      <p role="status" className="sr-only">
        {opened}
      </p>

      {sheet && <TableSheet service={sheet} onClose={() => setOpenTableId(null)} />}

      {canOrder && (
        <CreateOrderFab
          state={state}
          labelled={tables.length === 0}
          open={creating}
          onOpen={() => setCreating(true)}
          onClose={() => {
            setCreating(false);
            setOwnNext(true);
          }}
        />
      )}
    </div>
  );
}

export default function TablesPage() {
  const state = useGestion();
  const { hasFeature } = useGestionAccess();

  if (!state) return null;
  if (!hasFeature("tables")) return <FeatureLocked feature="tables" />;
  return <TablesView state={state} />;
}
