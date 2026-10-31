"use client";

import { useState, type CSSProperties } from "react";
import { CreateOrderFab } from "@/components/gestion/commandes/create-order-fab";
import { FeatureLocked } from "@/components/gestion/feature-locked";
import { TableSheet } from "@/components/gestion/tables/table-sheet";
import { EmptyState, GlassButton, SectionHeading } from "@/components/gestion/ui";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import { describeError } from "@/lib/gestion/errors";
import { activeTables, type TableService } from "@/lib/gestion/selectors";
import { useGestion, useGestionAccess } from "@/lib/gestion/store";
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
  visite,
  onClick,
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
  visite: boolean;
  onClick: () => void;
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
        className={`g-plate g-press relative ${ready ? "g-ready" : ""} flex h-full w-full flex-col items-start gap-2 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-1 disabled:opacity-40 ${
          selected
            ? "outline-2 -outline-offset-1 outline-ember-2 before:absolute before:inset-0 before:rounded-[inherit] before:bg-[color-mix(in_srgb,var(--ember-2)_var(--g-tint-a),transparent)]"
            : "pointer-fine:hover:outline-1 pointer-fine:hover:-outline-offset-1 pointer-fine:hover:outline-[var(--g-ring-hover)]"
        }`}
      >
        <span className="g-orders g-eyebrow">{joined.length > 1 ? "Tables" : "Table"}</span>
        <span className="font-display text-g-day tabular-nums">
          {joined.map((entry) => entry.number).join(" + ")}
        </span>
        {serveur && <span className="max-w-full truncate text-g-meta text-muted">{serveur.name}</span>}
        {(toPay > 0 || toServe > 0) && (
          <span className="mt-auto flex flex-col gap-1 pt-1">
            {toPay > 0 && <Due entity="g-money" value={formatPrice(toPay)} label="à encaisser" />}
            {toServe > 0 && <Due entity="g-orders" value={String(toServe)} label="à servir" />}
          </span>
        )}
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
  // Les tables présentes à l'arrivée montent en cascade ; celles qui s'ouvrent
  // ensuite montent seules, sans attendre leur rang.
  const [arrived] = useState(() => new Set(activeTables(state).map((entry) => entry.table.id)));
  const [creating, setCreating] = useState(false);

  const tables = activeTables(state);

  // Une table qui s'ouvre pendant le service (commande du QR, autre appareil)
  // se signale d'une onde. On suit le mobilier, pas les additions : séparer
  // des tables n'ouvre rien. Prendre une commande ici tait la prochaine onde,
  // la table n'apprend rien à qui vient de l'ouvrir ; un dialogue abandonné en
  // perd une au plus.
  const seated = tables.flatMap((entry) => entry.tables.map((table) => table.id));
  const [known, setKnown] = useState(() => new Set(seated));
  const [ready, setReady] = useState<ReadonlySet<string>>(new Set());
  const [ownNext, setOwnNext] = useState(false);
  const fresh = seated.filter((id) => !known.has(id));
  if (fresh.length > 0 || known.size !== seated.length) {
    setKnown(new Set(seated));
    const kept = [...ready].filter((id) => seated.includes(id));
    setReady(new Set(ownNext ? kept : [...kept, ...fresh]));
    if (fresh.length > 0) setOwnNext(false);
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
  const hasJoined = tables.some((entry) => entry.tables.length > 1);

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
            joining
              ? "Choisissez les tables à réunir sous une même addition."
              : tables.length
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
            {joining.length < 2 ? "Cochez au moins deux tables pour les réunir." : `${joining.length} tables cochées.`}
            {hasJoined && " Les tables déjà réunies restent telles quelles."}
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tables.map((service, index) => {
            const { table, tables: joined } = service;
            return (
              <TableTile
                key={table.id}
                service={service}
                serveur={table.staffId ? staffById.get(table.staffId) : undefined}
                joining={joining != null}
                selected={joining?.includes(table.id) ?? false}
                selectable={joined.length === 1}
                rise={arrived.has(table.id) ? Math.min(index + 1, RISE_CAP) : 0}
                ready={ready.has(table.id)}
                visite={index === 0}
                onClick={() => (joining ? toggle(table.id) : setOpenTableId(table.id))}
              />
            );
          })}
        </div>
      )}

      {sheet && <TableSheet service={sheet} onClose={() => setOpenTableId(null)} />}

      {canOrder && (
        <CreateOrderFab
          state={state}
          labelled={tables.length === 0}
          open={creating}
          onOpen={() => {
            setCreating(true);
            setOwnNext(true);
          }}
          onClose={() => setCreating(false)}
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
