"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import * as api from "@/lib/gestion/api";
import {
  SERVICE_CLOCK_TICK_MS,
  WAIT_TICK_MS,
} from "@/lib/gestion/constants";
import {
  memberName,
  myTipsToday,
  orderTotal,
  unavailableItems,
} from "@/lib/gestion/selectors";
import type { GestionState, Order } from "@/lib/gestion/types";
import { formatWait, minutesSince, useNow } from "@/lib/gestion/use-now";
import { formatTime } from "@/lib/gestion/format";
import { formatPrice } from "@/lib/menu-data";

/*
 * Aperçu des employés : pas d'analytique — un poste de pilotage du service
 * en direct, taillé pour le rôle. La cuisine voit ce qui l'attend au passe,
 * la salle voit ce qui est prêt à partir.
 */

const RISE_STEP_MS = 70;

function riseDelay(index: number) {
  return { animationDelay: `${index * RISE_STEP_MS}ms` };
}

function ServiceClock() {
  const now = useNow(SERVICE_CLOCK_TICK_MS);
  return (
    <p className="font-display text-3xl tabular-nums lg:text-4xl">
      {now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}
    </p>
  );
}

function ServiceHero({ title, tagline }: { title: string; tagline: string }) {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <section className="rise relative overflow-hidden rounded-3xl border border-hairline bg-surface">
      <div className="ember-flow h-1 w-full" aria-hidden />
      <div className="hero-gradient-drift pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-6">
        <div>
          <p className="ember-text flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]">
            Service en direct
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight lg:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <span className="capitalize">{today}</span> · {tagline}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="size-2 animate-pulse rounded-full bg-ember-2"
            aria-hidden
          />
          <ServiceClock />
        </div>
      </div>
    </section>
  );
}

function LiveTile({
  label,
  value,
  hint,
  urgent = false,
  index,
}: {
  label: string;
  value: number;
  hint?: string;
  urgent?: boolean;
  index: number;
}) {
  const hot = urgent && value > 0;
  return (
    <Link
      href="/gestion/commandes"
      style={riseDelay(index)}
      className={`rise rounded-2xl border p-5 transition-colors ${
        hot
          ? "border-ember-2/50 bg-ember-2/[0.07]"
          : "border-hairline bg-surface hover:border-ember-2/30"
      }`}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        {hot && (
          <span className="size-1.5 animate-pulse rounded-full bg-ember-2" aria-hidden />
        )}
        {label}
      </p>
      <p
        className={`mt-2 font-display text-4xl tabular-nums ${
          hot ? "ember-text" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </Link>
  );
}

function EmptyService({ body }: { body: string }) {
  return (
    <div className="rise flex flex-col gap-3" style={riseDelay(4)}>
      <div className="rounded-2xl border border-dashed border-hairline p-6 text-center">
        <p className="text-sm text-muted">Le calme avant le coup de feu.</p>
        <p className="mt-1 text-xs text-faint">{body}</p>
      </div>
      <div className="shimmer h-20 rounded-2xl border border-hairline" aria-hidden />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg font-medium">{children}</h2>;
}

function orderItemCount(order: Order): number {
  return order.items.reduce((sum, line) => sum + line.quantity, 0);
}

/** Fiche du membre connecté : son nom d'affichage, modifiable sur place. */
function ProfileRow({ state, index }: { state: GestionState; index: number }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const currentName = memberName(state, state.userId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.updateDisplayName(name);
      toast.success("Nom enregistré.");
      setEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rise flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface px-5 py-4"
      style={riseDelay(index)}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{currentName}</p>
        <p className="text-xs text-faint">Votre nom, visible par l&rsquo;équipe</p>
      </div>
      <button
        type="button"
        onClick={() => {
          const self = state.members.find((m) => m.userId === state.userId);
          setName(self?.displayName ?? "");
          setEditing(true);
        }}
        className="shrink-0 text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
      >
        Modifier
      </button>
      {editing && (
        <Modal title="Votre nom" onClose={() => setEditing(false)}>
          <form onSubmit={save} className="flex flex-col gap-4">
            <Field label="Nom d'affichage" required>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
                autoComplete="name"
                autoFocus
                className={inputClass}
              />
            </Field>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="ember-gradient rounded-full px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function CuisinierApercu({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const enAttente = state.orders.filter((o) => o.status === "en_attente");
  const enPreparation = state.orders.filter((o) => o.status === "en_preparation");
  const pretes = state.orders.filter((o) => o.status === "prete");
  const indispo = unavailableItems(state);

  // Retraits collect à venir : le tempo de la cuisine sur l'emporter.
  const retraits = state.orders
    .filter(
      (o) =>
        o.type === "collect" &&
        (o.status === "en_attente" || o.status === "en_preparation") &&
        (o.pickupAt || o.estimatedReadyAt)
    )
    .sort((a, b) =>
      (a.pickupAt ?? a.estimatedReadyAt!).localeCompare(
        b.pickupAt ?? b.estimatedReadyAt!
      )
    );

  const oldest = enAttente[0];

  return (
    <div className="flex flex-col gap-8">
      <ServiceHero
        title="La cuisine"
        tagline="préparation des commandes et disponibilité des articles"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <LiveTile
          index={1}
          label="À préparer"
          value={enAttente.length}
          urgent
          hint={
            oldest
              ? `La plus ancienne attend depuis ${formatWait(minutesSince(oldest.createdAt, now))}`
              : "Aucune commande en attente"
          }
        />
        <LiveTile index={2} label="En préparation" value={enPreparation.length} />
        <LiveTile
          index={3}
          label="Prêtes au passe"
          value={pretes.length}
          hint={pretes.length > 0 ? "À remettre en salle ou au comptoir" : undefined}
        />
      </div>

      {enAttente.length + enPreparation.length + pretes.length === 0 && (
        <EmptyService body="Les commandes du menu QR et du click & collect arrivent ici en temps réel." />
      )}

      {retraits.length > 0 && (
        <section className="rise flex flex-col gap-3" style={riseDelay(4)}>
          <SectionTitle>Retraits à venir</SectionTitle>
          <div className="rounded-2xl border border-hairline bg-surface">
            {retraits.map((order, index) => {
              const at = order.pickupAt ?? order.estimatedReadyAt!;
              return (
                <Link
                  key={order.id}
                  href="/gestion/commandes"
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-raised ${
                    index > 0 ? "border-t border-hairline" : ""
                  }`}
                >
                  <span className="ember-gradient flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-1.5 font-display text-sm font-medium tabular-nums text-background">
                    {formatTime(at)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {order.customerName ?? "Client"}
                    </p>
                    <p className="text-xs text-faint">
                      {orderItemCount(order)} article{orderItemCount(order) > 1 ? "s" : ""} ·{" "}
                      {order.status === "en_attente" ? "à accepter" : "en préparation"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {indispo.length > 0 && (
        <section className="rise flex flex-col gap-3" style={riseDelay(5)}>
          <SectionTitle>À remettre en vente</SectionTitle>
          <div className="rounded-2xl border border-hairline bg-surface">
            {indispo.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-faint">
                    {item.stock === 0 ? "Stock épuisé" : "Retiré de la vente"}
                  </p>
                </div>
                <Link
                  href="/gestion/menu"
                  className="text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
                >
                  Gérer
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProfileRow state={state} index={6} />
    </div>
  );
}

function ServeurApercu({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const enAttente = state.orders.filter((o) => o.status === "en_attente");
  const enPreparation = state.orders.filter((o) => o.status === "en_preparation");
  const pretes = state.orders.filter((o) => o.status === "prete");
  const activeOrders = [...enAttente, ...enPreparation, ...pretes];
  const activeTotal = activeOrders.reduce((sum, o) => sum + orderTotal(o), 0);
  const activeTableCount = new Set(
    activeOrders.filter((o) => o.tableId).map((o) => o.tableId)
  ).size;
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );
  const myTables = state.tables.filter((t) => t.serverId === state.userId);
  const tips = myTipsToday(state);

  return (
    <div className="flex flex-col gap-8">
      <ServiceHero
        title="La salle"
        tagline="tables, service et remise des commandes"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <LiveTile
          index={1}
          label="Prêtes à servir"
          value={pretes.length}
          urgent
          hint={pretes.length > 0 ? "Le passe vous attend" : "Rien au passe pour l'instant"}
        />
        <LiveTile index={2} label="En attente" value={enAttente.length} />
        <LiveTile index={3} label="En préparation" value={enPreparation.length} />
      </div>

      {activeTotal > 0 && (
        <div
          className="rise flex items-center justify-between rounded-2xl border border-hairline bg-surface px-5 py-4"
          style={riseDelay(3.5)}
        >
          <div>
            <p className="text-sm font-medium">Total en salle</p>
            <p className="text-xs text-faint">
              {activeTableCount} table{activeTableCount > 1 ? "s" : ""} active{activeTableCount > 1 ? "s" : ""}
            </p>
          </div>
          <span className="font-display text-2xl tabular-nums text-ember-1">
            {formatPrice(activeTotal)}
          </span>
        </div>
      )}

      {(myTables.length > 0 || tips > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/gestion/tables"
            className="rise flex items-center justify-between rounded-2xl border border-hairline bg-surface px-5 py-4 transition-colors hover:border-ember-2/30"
            style={riseDelay(3.7)}
          >
            <div>
              <p className="text-sm font-medium">Mes tables</p>
              <p className="text-xs text-faint">
                {myTables.length > 0
                  ? myTables.map((t) => t.number).join(", ")
                  : "Affectez-vous depuis l'onglet Tables"}
              </p>
            </div>
            <span className="font-display text-2xl tabular-nums text-ember-1">
              {myTables.length}
            </span>
          </Link>
          <div
            className="rise flex items-center justify-between rounded-2xl border border-hairline bg-surface px-5 py-4"
            style={riseDelay(3.9)}
          >
            <div>
              <p className="text-sm font-medium">Mes pourboires</p>
              <p className="text-xs text-faint">Aujourd&rsquo;hui</p>
            </div>
            <span className="font-display text-2xl tabular-nums text-ember-1">
              {formatPrice(tips)}
            </span>
          </div>
        </div>
      )}

      {pretes.length > 0 ? (
        <section className="rise flex flex-col gap-3" style={riseDelay(4)}>
          <SectionTitle>Au passe — à servir</SectionTitle>
          <div className="rounded-2xl border border-hairline bg-surface">
            {pretes.map((order, index) => {
              const isCollect = order.type === "collect";
              const tableNo = order.tableId
                ? tableNumbersById.get(order.tableId)
                : undefined;
              return (
                <Link
                  key={order.id}
                  href="/gestion/commandes"
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-raised ${
                    index > 0 ? "border-t border-hairline" : ""
                  }`}
                >
                  <span className="ember-gradient flex size-9 shrink-0 items-center justify-center rounded-xl font-display text-base font-medium tabular-nums text-background">
                    {isCollect ? "→" : tableNo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {isCollect
                        ? `Emporter · ${order.customerName ?? "Client"}`
                        : `Table ${tableNo}`}
                    </p>
                    <p className="text-xs text-faint">
                      {orderItemCount(order)} article{orderItemCount(order) > 1 ? "s" : ""} ·
                      commandée il y a {formatWait(minutesSince(order.createdAt, now))}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-ember-1">
                    {formatPrice(orderTotal(order))}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        enAttente.length + enPreparation.length === 0 && (
          <EmptyService body="Les commandes passées depuis le menu QR apparaîtront ici en temps réel." />
        )
      )}

      {state.groups.length > 0 && (
        <Link
          href="/gestion/tables"
          className="rise flex items-center justify-between rounded-2xl border border-hairline bg-surface px-5 py-4 transition-colors hover:border-ember-2/30"
          style={riseDelay(5)}
        >
          <div>
            <p className="text-sm font-medium">Groupes de tables actifs</p>
            <p className="text-xs text-faint">Gérer les tables réunies</p>
          </div>
          <span className="font-display text-2xl tabular-nums text-ember-1">
            {state.groups.length}
          </span>
        </Link>
      )}

      <ProfileRow state={state} index={6} />
    </div>
  );
}

export function EmployeeApercu({ state }: { state: GestionState }) {
  return state.role === "cuisinier" ? (
    <CuisinierApercu state={state} />
  ) : (
    <ServeurApercu state={state} />
  );
}
