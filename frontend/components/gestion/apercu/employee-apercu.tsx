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
  activeTables,
  awaitsPayment,
  awaitsService,
  memberName,
  orderTotal,
  unavailableItems,
} from "@/lib/gestion/selectors";
import type { GestionState, Order } from "@/lib/gestion/types";
import { formatWait, minutesSince, useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu-data";

/*
 * Aperçu des employés : pas d'analytique — un poste de pilotage du service
 * en direct, taillé pour le rôle. La salle voit ce qui reste à encaisser et
 * à servir ; la cuisine, dont les commandes sortent sur l'imprimante, n'a
 * que la disponibilité des articles à tenir.
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
  href = "/gestion/commandes",
  urgent = false,
  index,
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  urgent?: boolean;
  index: number;
}) {
  const hot = urgent && value > 0;
  return (
    <Link
      href={href}
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
  const indispo = unavailableItems(state);

  return (
    <div className="flex flex-col gap-8">
      <ServiceHero
        title="La cuisine"
        tagline="les commandes sortent sur l'imprimante"
      />

      {indispo.length > 0 ? (
        <section className="rise flex flex-col gap-3" style={riseDelay(1)}>
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
      ) : (
        <div
          className="rise rounded-2xl border border-dashed border-hairline p-6 text-center"
          style={riseDelay(1)}
        >
          <p className="text-sm text-muted">Toute la carte est en vente.</p>
          <p className="mt-1 text-xs text-faint">
            Un article épuisé se retire depuis l&rsquo;onglet Menu ; il
            réapparaît ici.
          </p>
        </div>
      )}

      <ProfileRow state={state} index={2} />
    </div>
  );
}

function ServeurApercu({ state }: { state: GestionState }) {
  const now = useNow(WAIT_TICK_MS);
  const toPay = state.orders.filter(awaitsPayment);
  const toServe = state.orders.filter(awaitsService);
  const tables = activeTables(state);
  const toPayTotal = toPay.reduce((sum, order) => sum + orderTotal(order), 0);
  const tableNumbersById = new Map(
    state.tables.map((table) => [table.id, table.number])
  );

  return (
    <div className="flex flex-col gap-8">
      <ServiceHero
        title="La salle"
        tagline="encaissement et service des tables"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <LiveTile
          index={1}
          label="À encaisser"
          value={toPay.length}
          urgent
          hint={
            toPay.length > 0
              ? `${formatPrice(toPayTotal)} en attente`
              : "Rien à encaisser"
          }
        />
        <LiveTile
          index={2}
          label="À servir"
          value={toServe.length}
          hint={toServe.length > 0 ? "Parties en cuisine" : "Rien à servir"}
        />
        <LiveTile
          index={3}
          label="Tables en service"
          value={tables.length}
          href="/gestion/tables"
        />
      </div>

      {toServe.length > 0 ? (
        <section className="rise flex flex-col gap-3" style={riseDelay(4)}>
          <SectionTitle>À servir</SectionTitle>
          <div className="rounded-2xl border border-hairline bg-surface">
            {toServe.map((order, index) => {
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
        toPay.length === 0 && (
          <EmptyService body="Les commandes du menu QR et de la salle apparaîtront ici en temps réel." />
        )
      )}

      <ProfileRow state={state} index={5} />
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
