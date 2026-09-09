"use client";

import Link from "next/link";
import { ProfileRow } from "@/components/gestion/profile-row";
import { SERVICE_CLOCK_TICK_MS } from "@/lib/gestion/constants";
import { activeTables } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu-data";

/*
 * L'aperçu de la salle, pour les restaurants qui en veulent un. Le serveur y
 * lit son service d'un regard — ses tables d'abord quand elles lui sont
 * confiées, le reste ensuite — puis retourne à l'écran des commandes, qui
 * reste son poste de travail. Fermé, cet aperçu renvoie droit au service.
 */

const RISE_STEP_MS = 70;

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

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-medium">{value}</p>
      <p className="mt-0.5 text-xs text-faint">{hint}</p>
    </div>
  );
}

export function ServeurApercu({ state }: { state: GestionState }) {
  const { hasFeature } = useGestionAccess();
  const services = activeTables(state);
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Ses tables, quand l'affectation est ouverte et qu'il a une fiche. Sur la
  // tablette du comptoir, personne n'est connecté en son nom : tout le monde
  // voit alors la salle entière, ce qui est bien ce qu'on attend d'elle.
  const mine = state.staff.find((member) => member.userId === state.userId);
  const own =
    hasFeature("assignation") && mine
      ? services.filter((service) => service.table.staffId === mine.id)
      : [];
  const shown = own.length > 0 ? own : services;

  const toPay = shown.reduce((sum, service) => sum + service.toPay, 0);
  const toServe = shown.reduce((sum, service) => sum + service.toServe, 0);

  return (
    <div className="flex flex-col gap-8">
      <section className="rise relative overflow-hidden rounded-3xl border border-hairline bg-surface">
        <div className="ember-flow h-1 w-full" aria-hidden />
        <div className="hero-gradient-drift pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-6">
          <div>
            <p className="ember-text flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]">
              Service en direct
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight lg:text-3xl">
              La salle
            </h1>
            <p className="mt-1 text-sm text-muted">
              <span className="capitalize">{today}</span> ·{" "}
              {own.length > 0 ? "vos tables" : "toutes les tables en service"}
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

      <section
        className="rise grid gap-4 sm:grid-cols-3"
        style={{ animationDelay: `${RISE_STEP_MS}ms` }}
      >
        <Stat label="Tables" value={String(shown.length)} hint="en service" />
        <Stat label="À encaisser" value={formatPrice(toPay)} hint="reste dû" />
        <Stat
          label="À servir"
          value={String(toServe)}
          hint={toServe > 1 ? "plats en attente" : "plat en attente"}
        />
      </section>

      {shown.length > 0 && (
        <section
          className="rise flex flex-col gap-3"
          style={{ animationDelay: `${RISE_STEP_MS * 2}ms` }}
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-lg font-medium">Le service</h2>
            <Link
              href="/gestion/tables"
              className="shrink-0 text-xs font-semibold text-ember-1 transition-opacity hover:opacity-80"
            >
              Voir les tables
            </Link>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface">
            {shown.map((service, index) => (
              <div
                key={service.table.id}
                className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                  index > 0 ? "border-t border-hairline" : ""
                }`}
              >
                <p className="text-sm font-medium">
                  {service.tables.length > 1 ? "Tables " : "Table "}
                  {service.tables.map((table) => table.number).join(" + ")}
                </p>
                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {service.toPay > 0 && (
                    <span className="rounded-full border border-ember-1/40 bg-ember-1/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-1">
                      {formatPrice(service.toPay)}
                    </span>
                  )}
                  {service.toServe > 0 && (
                    <span className="rounded-full border border-ember-2/40 bg-ember-2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ember-2">
                      {service.toServe} à servir
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProfileRow
        state={state}
        style={{ animationDelay: `${RISE_STEP_MS * 3}ms` }}
      />
    </div>
  );
}
