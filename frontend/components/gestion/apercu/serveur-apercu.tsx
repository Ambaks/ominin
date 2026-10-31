"use client";

import type { CSSProperties } from "react";
import { ProfileRow } from "@/components/gestion/profile-row";
import { TablesIcon } from "@/components/gestion/icons";
import { Chip, EmptyState, GlassButton, GlassFrame, Plate, StatTile } from "@/components/gestion/ui";
import { activeTables, serviceDate } from "@/lib/gestion/selectors";
import { useGestionAccess } from "@/lib/gestion/store";
import type { GestionState } from "@/lib/gestion/types";
import { formatPrice } from "@/lib/menu/format";
import { CarteEnVente } from "./carte-en-vente";
import { ServiceClock } from "./service-clock";

/*
 * L'aperçu de la salle, pour les restaurants qui en veulent un. Le serveur y
 * lit son service d'un regard — ses tables d'abord quand elles lui sont
 * confiées, le reste ensuite — puis retourne à l'écran des commandes, qui
 * reste son poste de travail. Fermé, cet aperçu renvoie droit au service.
 * La carte avec « En vente » n'y paraît que si le restaurant lui a ouvert ce
 * droit (UX-SIMPLICITÉ § 7, décision 7).
 */

export function ServeurApercu({ state }: { state: GestionState }) {
  const { can, hasFeature } = useGestionAccess();
  const services = activeTables(state);
  const today = serviceDate(new Date(), state.dayEndHour).toLocaleDateString("fr-FR", {
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

  let block = 0;
  return (
    <div className="grid gap-5">
      <section className="g-rise" style={{ "--g-i": block++ } as CSSProperties}>
        <GlassFrame hero entity="orders" eyebrow="Service en direct" icon={<TablesIcon />}>
          <Plate className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 p-5">
            <div className="min-w-0">
              <h1 className="font-display text-g-h1">La salle</h1>
              <p className="mt-1.5 text-g-body text-muted">
                <span className="capitalize">{today}</span> ·{" "}
                {own.length > 0 ? "vos tables" : "toutes les tables en service"}
              </p>
            </div>
            <ServiceClock />
          </Plate>
        </GlassFrame>
      </section>

      <section
        className="g-rise grid gap-g-gap sm:grid-cols-3"
        style={{ "--g-i": block++ } as CSSProperties}
      >
        <StatTile
          plain
          entity="orders"
          label="Tables"
          value={String(shown.length)}
          baseline={shown.length > 0 ? "en service" : "aucune table en service"}
        />
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

      <section className="g-rise" style={{ "--g-i": block++ } as CSSProperties}>
        {shown.length > 0 ? (
          <Plate className="px-5 pb-4 pt-4.5">
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-g-h2">Le service</h2>
              <GlassButton href="/gestion/tables">Voir les tables</GlassButton>
            </div>
            <ul className="m-0 grid list-none p-0">
              {shown.map((service) => (
                <li
                  key={service.table.id}
                  className="flex min-h-(--g-row-h) items-center justify-between gap-4 border-t border-hairline py-1 first:border-t-0"
                >
                  <p className="text-g-body font-medium">
                    {service.tables.length > 1 ? "Tables " : "Table "}
                    {service.tables.map((table) => table.number).join(" + ")}
                  </p>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {service.toPay > 0 && <Chip>{formatPrice(service.toPay)}</Chip>}
                    {service.toServe > 0 && <Chip>{service.toServe} à servir</Chip>}
                  </span>
                </li>
              ))}
            </ul>
          </Plate>
        ) : (
          <EmptyState
            text="Aucune table en service. Les commandes arrivent dans Commandes dès qu’un client commande."
            action={<GlassButton href="/gestion/commandes">Ouvrir les commandes</GlassButton>}
          />
        )}
      </section>

      {can("menu.availability") && (
        <section className="g-rise" style={{ "--g-i": block++ } as CSSProperties}>
          <CarteEnVente state={state} />
        </section>
      )}

      <ProfileRow state={state} style={{ "--g-i": block } as CSSProperties} />
    </div>
  );
}
