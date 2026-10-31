"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ProfileRow } from "@/components/gestion/profile-row";
import { TablesIcon } from "@/components/gestion/icons";
import { Chip, EmptyState, GlassButton, GlassFrame, Plate, StatTile } from "@/components/gestion/ui";
import { WAIT_TICK_MS } from "@/lib/gestion/constants";
import { can } from "@/lib/gestion/permissions";
import { activeTables, serviceDate } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { GestionState } from "@/lib/gestion/types";
import { useNow } from "@/lib/gestion/use-now";
import { formatPrice } from "@/lib/menu/format";
import { CarteEnVente } from "./carte-en-vente";
import { ServiceTime } from "./service-time";

/*
 * L'aperçu de la salle, pour les restaurants qui en veulent un. Le serveur y
 * lit son service d'un regard — ses tables d'abord quand elles lui sont
 * confiées, le reste ensuite — puis retourne à l'écran des commandes, qui
 * reste son poste de travail. Fermé, cet aperçu renvoie droit au service.
 * La carte « En vente » suit le droit `menu.availability`, que le rôle
 * serveur n'a pas encore : l'ouvrir par restaurant demande une capacité et
 * une policy (UX-SIMPLICITÉ § 7, décision 7).
 */

/** La règle d'encaissement de ce restaurant, comme l'état vide de Commandes la dit (§ 3.8). */
function serviceRule(state: GestionState): string {
  const tabs = state.orderTabs;
  const servesFirst =
    tabs.includes("a_servir") &&
    tabs.includes("a_encaisser") &&
    tabs.indexOf("a_servir") < tabs.indexOf("a_encaisser");
  return servesFirst
    ? "Une table paraît ici dès qu’un client commande. La commande part en cuisine aussitôt : encaissez-la après le repas."
    : "Une table paraît ici dès qu’un client commande. Encaissez sa commande : elle part en cuisine.";
}

export function ServeurApercu({ state }: { state: GestionState }) {
  const { hasFeature } = useGestionAccess();
  const now = useNow(WAIT_TICK_MS);
  const services = activeTables(state);
  const today = serviceDate(now, state.dayEndHour).toLocaleDateString("fr-FR", {
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
  const tablesLink = hasFeature("tables");

  let block = 0;
  return (
    <div className="grid gap-5">
      <GlassFrame hero i={block++} entity="orders" eyebrow="Service en direct" icon={<TablesIcon />}>
        <Plate className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-g-h1">La salle</h1>
            <ServiceTime />
          </div>
          <p className="mt-1 text-g-body text-muted first-letter:uppercase">
            {today}
            {shown.length > 0 && (own.length > 0 ? " · vos tables" : " · toutes les tables")}
          </p>
        </Plate>
      </GlassFrame>

      {/* Sans table, les chiffres ne diraient que « rien » : l'état vide suffit. */}
      {shown.length > 0 && (
        <section
          className="g-rise grid grid-cols-2 gap-g-gap sm:grid-cols-3"
          style={{ "--g-i": block++ } as CSSProperties}
        >
          {/* Au téléphone, le compte de tables est dans le titre de la liste, juste dessous. */}
          <div className="max-sm:hidden">
            <StatTile plain entity="orders" label="Tables" value={String(shown.length)} baseline="en service" />
          </div>
          <StatTile
            plain
            entity="money"
            label="À encaisser"
            value={toPay > 0 ? formatPrice(toPay) : "—"}
            baseline={toPay > 0 ? "reste dû" : "rien à encaisser"}
          />
          <StatTile
            plain
            entity="orders"
            label="À servir"
            value={toServe > 0 ? String(toServe) : "—"}
            baseline={toServe > 1 ? "plats en attente" : toServe === 1 ? "plat en attente" : "rien à servir"}
          />
        </section>
      )}

      <section className="g-rise" style={{ "--g-i": block++ } as CSSProperties}>
        {shown.length > 0 ? (
          <Plate className="px-5 pb-3 pt-4">
            <div className="mb-1.5 flex items-baseline gap-3">
              <h2 className="font-display text-g-h2">Le service</h2>
              <small className="whitespace-nowrap text-g-meta text-muted tabular-nums sm:hidden">
                {shown.length} table{shown.length > 1 ? "s" : ""}
              </small>
            </div>
            <ul role="list" className="m-0 grid list-none p-0">
              {shown.map((service) => {
                const body = (
                  <>
                    <span className="text-g-body font-medium">
                      {service.tables.length > 1 ? "Tables " : "Table "}
                      {service.tables.map((table) => table.number).join(" + ")}
                    </span>
                    <span className="flex flex-wrap items-center justify-end gap-1.5">
                      {service.toPay > 0 && <Chip>{formatPrice(service.toPay)} à encaisser</Chip>}
                      {service.toServe > 0 && <Chip>{service.toServe} à servir</Chip>}
                      {tablesLink && (
                        <span aria-hidden className="text-g-meta text-muted">
                          ›
                        </span>
                      )}
                    </span>
                  </>
                );
                const row = "flex min-h-(--g-row-h) items-center justify-between gap-4 py-1.5";
                return (
                  <li key={service.table.id} className="border-t border-hairline first:border-t-0">
                    {tablesLink ? (
                      <Link href="/gestion/tables" className={`g-press ${row}`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={row}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Plate>
        ) : (
          <EmptyState
            text={serviceRule(state)}
            action={
              hasFeature("commandes") ? (
                <GlassButton variant="primary" href="/gestion/commandes" className="shrink-0">
                  Ouvrir les commandes
                </GlassButton>
              ) : undefined
            }
          />
        )}
      </section>

      {can(state.role, "menu.availability") && (
        <section className="g-rise" style={{ "--g-i": block++ } as CSSProperties}>
          <CarteEnVente state={state} />
        </section>
      )}

      <ProfileRow state={state} style={{ "--g-i": block } as CSSProperties} />
    </div>
  );
}
