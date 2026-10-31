"use client";

import { useEffect, useState } from "react";
import { BarSeries, StatTile } from "@/components/admin/charts";
import { useToast } from "@/components/ui/toast";
import {
  PILOTAGE_READY_BATCH_SECONDS,
  PILOTAGE_RETURN_DAYS,
} from "@/lib/admin/constants";
import {
  formatEuros,
  formatPercent,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/admin/format";
import {
  conversionRate,
  fetchMeasures,
  fetchPilotage,
  periodOf,
  savePilotageFrom,
  type ClientOverview,
  type Measures,
  type Pilotage,
} from "@/lib/admin/metrics";
import { SESSION_RETENTION_DAYS } from "@/lib/menu/analytics/constants";

/*
 * Ce qu'il faut suivre pour décider, et ce qu'on ne sait pas encore mesurer.
 * Chaque ligne du tableau dit la décision qu'elle commande et son état : un
 * chiffre manquant s'affiche comme manquant, jamais comme une estimation.
 */

type Availability = "mesure" | "partiel" | "indisponible";

const AVAILABILITY: Record<Availability, { label: string; className: string }> = {
  mesure: { label: "Mesuré", className: "border-hairline text-foreground" },
  partiel: { label: "Partiel", className: "border-hairline text-muted" },
  indisponible: {
    label: "Indisponible",
    className: "border-dashed border-hairline text-faint",
  },
};

interface Row {
  goal: string;
  metric: string;
  decision: string;
  availability: Availability;
  value: string;
  note?: string;
}

const NO_DATA = "Rien sur la période";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes === 0) return `${rest} s`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
  return `${minutes} min ${String(rest).padStart(2, "0")}`;
}

function share(part: number, total: number): string {
  return total === 0 ? "—" : formatPercent(conversionRate(total, part));
}

function count(value: number, word: string): string {
  return `${value} ${word}${value > 1 ? "s" : ""}`;
}

/** Là où un plan de salle existe, une table sans zone n'a pas de carte imprimée. */
function printedTables(reach: Pilotage["reach"]): Pilotage["reach"]["tables"] {
  const zoned = reach.tables.filter((table) => table.zone !== null);
  return zoned.length > 0 ? zoned : reach.tables;
}

function closedAttempts(measures: Measures): number {
  return measures.succeeded + measures.expired + measures.failed + measures.counter;
}

function buildRows(data: Pilotage, measures: Measures | null): Row[] {
  const { bar, basket, conversion, loyalty, menu, payment, reach, suggestions, till } = data;
  const visits = reach.visits;
  const converted = conversion.hours.reduce((sum, hour) => sum + hour.converted, 0);
  const printed = printedTables(reach);
  const neverScanned = printed.filter((table) => table.visits === 0).length;
  const shown = suggestions.reduce((sum, row) => sum + row.shown, 0);
  const accepted = suggestions.reduce((sum, row) => sum + row.orders, 0);
  const peak = data.saturation.at(-1);

  return [
    {
      goal: "Gain réel",
      metric: "Part du QR dans le CA de la caisse ; CA avant et après lancement",
      decision: "Le produit marche-t-il ?",
      availability: till.sales > 0 ? "partiel" : "indisponible",
      value:
        till.sales > 0
          ? `${share(till.qr_revenue, till.qr_revenue + till.revenue)} du CA`
          : "—",
      note:
        till.sales > 0
          ? "L'avant-lancement reste à reprendre de la caisse."
          : till.connected
            ? "Popina est connectée, mais aucune vente de caisse sur la période."
            : "Il faut connecter Popina : aucune vente de caisse n'arrive ici.",
    },
    {
      goal: "Portée",
      metric: "Scans par table et par zone ; cartes jamais scannées",
      decision: "Placement des cartes, consigne à l'équipe",
      availability: "partiel",
      value: visits
        ? `${count(visits, "visite")}, ${neverScanned}/${printed.length} cartes jamais scannées`
        : NO_DATA,
      note: "Les QR d'affiche ne portent pas de source : on les voit tous « hors table ».",
    },
    {
      goal: "Conversion",
      metric: "Du scan à la commande, par heure, et où l'on décroche",
      decision: "Ce qu'il faut corriger dans le menu",
      availability: "mesure",
      value: visits
        ? `${share(converted, visits)}, en ${formatDuration(conversion.median_to_order_s)}`
        : NO_DATA,
    },
    {
      goal: "Vitesse au bar",
      metric: "Du paiement à « prête », de « prête » à la remise, attente totale",
      decision: "Effectif, ralentir les commandes au pic",
      availability: bar.with_ready > 0 ? "mesure" : "partiel",
      value: bar.orders
        ? bar.with_ready > 0
          ? `${formatDuration(bar.paid_to_ready_median_s)} puis ${formatDuration(bar.ready_to_handed_median_s)}`
          : `${formatDuration(bar.paid_to_handed_median_s)} au total`
        : NO_DATA,
      note:
        bar.with_ready > 0
          ? "Ne vaut que si l'équipe touche « prête » à temps : voir la fiabilité plus bas."
          : "L'heure de « prête » n'est enregistrée que depuis ce déploiement.",
    },
    {
      goal: "Remise",
      metric: "Commandes jamais remises ; prêtes et pas récupérées",
      decision: "Former l'équipe ; les métriques du bar en dépendent",
      availability: "mesure",
      value: bar.closed_days_orders
        ? `${share(bar.never_handed, bar.closed_days_orders)} (${bar.never_handed}/${bar.closed_days_orders})`
        : NO_DATA,
      note: "Scan ou « Remettre », c'est l'heure du geste qui compte. Journée en cours exclue.",
    },
    {
      goal: "Capacité",
      metric: "Commandes ouvertes au bar au paiement, contre attente",
      decision: "Le point où le bar sature",
      availability: "mesure",
      value: peak
        ? `Pic : ${count(peak.open_orders, "ouverte")}, ${formatDuration(peak.paid_to_handed_s)}`
        : NO_DATA,
    },
    {
      goal: "Panier",
      metric: "Panier par heure ; catégories prises ensemble",
      decision: "Suggestions et combos",
      availability: "partiel",
      value: basket.orders
        ? `${formatEuros(basket.average ?? 0)} ; ${share(basket.several_lines, basket.orders)} à plusieurs lignes`
        : NO_DATA,
      note: "La carte ne distingue pas plat et boisson : on lit les paires de catégories.",
    },
    {
      goal: "Carte",
      metric: "Plats vus contre plats vendus",
      decision: "Photos, prix, position à changer",
      availability: measures?.views_since ? "mesure" : "partiel",
      value: measures?.views_since
        ? `${measures.views} ${measures.views > 1 ? "fiches ouvertes" : "fiche ouverte"}, ${menu.sold}/${menu.items} plats vendus`
        : `${menu.sold}/${menu.items} plats vendus`,
      note: measures?.views_since
        ? "Le détail plat par plat est dans l'onglet Analytique."
        : "Les fiches ouvertes ne se comptent que depuis ce déploiement.",
    },
    {
      goal: "Suggestions",
      metric: "Proposées puis retenues : accords et suite du repas",
      decision: "Garder ou retirer chaque fonction",
      availability: "partiel",
      value: shown ? `${share(accepted, shown)} (${accepted}/${shown})` : NO_DATA,
      note: "Comptées depuis ce déploiement. La suite du repas reste en démo : rien à compter en production pour l'instant.",
    },
    {
      goal: "Happy hour",
      metric: "Volume et recette par heure, contre des semaines sans",
      decision: "La remise se rembourse-t-elle ?",
      availability: "partiel",
      value: "Voir par heure",
      note: "Sans semaines témoins ni caisse, ces chiffres ne prouvent pas la rentabilité.",
    },
    {
      goal: "Marge",
      metric: "Profit par plat",
      decision: "Pousser le profit, pas seulement les ventes",
      availability: "indisponible",
      value: "—",
      note: "Les coûts des plats ne sont pas enregistrés.",
    },
    {
      goal: "Retour",
      metric: `Inscriptions par commande ; retour sous ${PILOTAGE_RETURN_DAYS} jours`,
      decision: "Récompenses et roue valent-elles leur coût ?",
      availability: loyalty.cohort > 0 ? "mesure" : "partiel",
      value:
        loyalty.cohort > 0
          ? `${share(loyalty.returned, loyalty.cohort)} reviennent (${loyalty.returned}/${loyalty.cohort})`
          : count(loyalty.signups, "inscription"),
      note:
        loyalty.cohort > 0
          ? "Membres seulement : on ne reconnaît pas les autres clients."
          : `Il faut ${PILOTAGE_RETURN_DAYS} jours de recul pour lire le retour.`,
    },
    {
      goal: "Paiement",
      metric: "En ligne contre au bar ; paiements échoués",
      decision: "Commission et ventes perdues",
      availability: measures?.attempts_since ? "mesure" : "partiel",
      value: payment.online + payment.at_bar
        ? `${share(payment.online, payment.online + payment.at_bar)} en ligne${
            measures?.attempts_since
              ? ` ; ${measures.succeeded}/${closedAttempts(measures)} tentatives réussies`
              : ""
          }`
        : NO_DATA,
      note: measures?.attempts_since
        ? `${count(measures.failed, "refusée")}, ${count(measures.expired, "expirée")}, ${count(measures.counter, "passée")} au bar.`
        : "Les tentatives en ligne ne se comptent que depuis ce déploiement.",
    },
  ];
}

export const SUGGESTION_LABELS: Record<Pilotage["suggestions"][number]["kind"], string> = {
  panier: "Au panier",
  fiche: "Sur la fiche d'un plat",
  formule: "Formule à compléter",
  apres_repas: "Suite du repas",
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-hairline text-sm text-muted">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-[10px] uppercase tracking-[0.18em] text-faint">
            {head.map((label, index) => (
              <th
                key={label}
                className={`whitespace-nowrap py-2 pr-3 font-semibold last:pr-0 ${index > 0 ? "text-right" : ""}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-hairline last:border-0">
              {row.cells.map((cell, index) => (
                <td
                  key={index}
                  className={`py-2.5 pr-3 last:pr-0 ${index > 0 ? "text-right tabular-nums" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StartDate({
  etablissementId,
  value,
  onSaved,
}: {
  etablissementId: string;
  value: string | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState(value ? toDatetimeLocalValue(value) : "");

  const save = (next: string | null) =>
    savePilotageFrom(etablissementId, next)
      .then(onSaved)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
      );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 text-sm">
      <label htmlFor="pilotage-from" className="text-muted">
        Compter à partir du
      </label>
      <input
        id="pilotage-from"
        type="datetime-local"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="rounded-xl border border-hairline bg-surface-raised px-3 py-2 tabular-nums"
      />
      <button
        type="button"
        disabled={!draft}
        onClick={() => save(fromDatetimeLocalValue(draft))}
        className="rounded-full border border-hairline px-4 py-2 font-medium disabled:opacity-50"
      >
        Enregistrer
      </button>
      {value && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            save(null);
          }}
          className="text-muted underline underline-offset-2"
        >
          Tout compter
        </button>
      )}
      <p className="w-full text-xs text-muted">
        Ce qui précède cette date est ignoré ici : les essais d&apos;avant l&apos;ouverture ne sont pas des clients.
      </p>
    </div>
  );
}

export function ClientPilotage({
  client,
  days,
}: {
  client: ClientOverview;
  days: number;
}) {
  const toast = useToast();
  const [data, setData] = useState<Pilotage | null>(null);
  const [measures, setMeasures] = useState<Measures | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la période a changé, l'écran repart en chargement.
    setData(null);
    const period = periodOf(days);
    fetchPilotage(client.etablissement_id, period)
      .then(async (next) => {
        // Même début de décompte que le reste de l'onglet.
        const nextMeasures = await fetchMeasures(client.etablissement_id, {
          from: next.venue.from_at,
          to: period.to,
        });
        setMeasures(nextMeasures);
        setData(next);
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Une erreur est survenue.")
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.etablissement_id, days, reload]);

  if (data === null) {
    return <div aria-busy className="shimmer h-96 rounded-2xl" />;
  }

  const rows = buildRows(data, measures);
  const { bar, bar_hours, bar_people, basket, conversion, loyalty, payment, reach, saturation, sold_out, suggestions } = data;

  const zones = new Map<string, { visits: number; orders: number; tables: number; silent: number }>();
  for (const table of printedTables(reach)) {
    const zone = zones.get(table.zone ?? "Sans zone") ?? { visits: 0, orders: 0, tables: 0, silent: 0 };
    zone.visits += table.visits;
    zone.orders += table.orders;
    zone.tables += 1;
    if (table.visits === 0) zone.silent += 1;
    zones.set(table.zone ?? "Sans zone", zone);
  }
  const silentTables = printedTables(reach).filter((table) => table.visits === 0);

  return (
    <div className="flex flex-col gap-6">
      <StartDate
        key={data.venue.pilotage_from}
        etablissementId={client.etablissement_id}
        value={data.venue.pilotage_from}
        onSaved={() => setReload((count) => count + 1)}
      />

      <Section
        title="Ce qu'on suit"
        hint={
          days > SESSION_RETENTION_DAYS
            ? `Les visites brutes ne remontent qu'à ${SESSION_RETENTION_DAYS} jours : portée et conversion s'arrêtent là.`
            : undefined
        }
      >
        <ul className="divide-y divide-hairline">
          {rows.map((row) => (
            <li key={row.goal} className="grid gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <p className="font-medium">{row.goal}</p>
                <p className="text-xs text-muted">{row.metric}</p>
                <p className="text-xs text-faint">{row.decision}</p>
              </div>
              <div className="sm:text-right">
                <p className="tabular-nums">{row.value}</p>
                <span
                  className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${AVAILABILITY[row.availability].className}`}
                >
                  {AVAILABILITY[row.availability].label}
                </span>
              </div>
              {row.note && (
                <p className="text-xs text-muted sm:col-span-2">{row.note}</p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Par heure" hint="Heure de Paris : conversion, panier, et le volume à lire pour les happy hours.">
        <BarSeries
          ariaLabel="Commandes par heure"
          formatTick={(value) => String(Math.round(value))}
          data={conversion.hours.map((hour) => ({
            key: String(hour.hour),
            label: `${hour.hour} h`,
            value: hour.orders,
            title: `${hour.hour} h : ${hour.orders} commandes`,
          }))}
        />
        <div className="mt-4">
          <Table
            head={["Heure", "Visites", "Paniers", "Commandes", "Conversion", "Recette", "Panier moyen"]}
            empty={NO_DATA}
            rows={conversion.hours.map((hour) => ({
              key: String(hour.hour),
              cells: [
                `${hour.hour} h`,
                hour.visits,
                hour.baskets,
                hour.orders,
                share(hour.converted, hour.visits),
                formatEuros(hour.revenue),
                hour.basket === null ? "—" : formatEuros(hour.basket),
              ],
            }))}
          />
        </div>
      </Section>

      <Section
        title="Portée"
        hint={`${count(reach.without_table, "visite")} hors table (affiches, lien direct).`}
      >
        <Table
          head={["Zone", "Cartes", "Jamais scannées", "Visites", "Commandes"]}
          empty="Aucune table enregistrée."
          rows={[...zones].map(([name, zone]) => ({
            key: name,
            cells: [name, zone.tables, zone.silent, zone.visits, zone.orders],
          }))}
        />
        {silentTables.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Jamais scannées : {silentTables.map((table) => table.number).join(", ")}
          </p>
        )}
      </Section>

      {data.venue.bar_pickup && (
        <Section title="Bar" hint="Médiane, puis le cas le plus long.">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Paiement → prête"
              value={formatDuration(bar.paid_to_ready_median_s)}
              hint={`max ${formatDuration(bar.paid_to_ready_max_s)}`}
            />
            <StatTile
              label="Prête → remise"
              value={formatDuration(bar.ready_to_handed_median_s)}
              hint={`max ${formatDuration(bar.ready_to_handed_max_s)}`}
            />
            <StatTile
              label="Paiement → remise"
              value={formatDuration(bar.paid_to_handed_median_s)}
              hint={`max ${formatDuration(bar.paid_to_handed_max_s)}`}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Prêtes, en attente"
              value={String(bar.waiting_now)}
              hint={`aujourd'hui, depuis ${formatDuration(bar.waiting_median_s)} en médiane`}
            />
            <StatTile
              label="Prêtes, jamais récupérées"
              value={String(bar.ready_never_collected)}
              hint="jours passés"
            />
            <StatTile
              label="Remises sans « prête »"
              value={String(bar.handed_without_ready)}
              hint={`sur ${count(bar.orders, "commande")} : le temps de préparation y manque`}
            />
          </div>
          {bar.ready_batched > 0 && (
            <p className="mt-3 text-xs text-muted">
              Marquées par lot : {bar.ready_batched}/{bar.with_ready}, à moins de {PILOTAGE_READY_BATCH_SECONDS} s d&apos;une autre. Leur heure de « prête » est celle du geste, pas forcément celle de la fin de préparation.
            </p>
          )}
          {bar.promised > 0 && (
            <p className="mt-3 text-xs text-muted">
              Heure annoncée tenue : {share(bar.promise_kept, bar.promised)} ({bar.promise_kept}/{bar.promised}).
            </p>
          )}
          <h3 className="mt-6 mb-2 text-sm font-medium">Par heure de paiement</h3>
          <Table
            head={["Heure", "Commandes", "Paiement → prête", "Prête → remise", "Paiement → remise"]}
            empty={NO_DATA}
            rows={bar_hours.map((row) => ({
              key: String(row.hour),
              cells: [
                `${row.hour} h`,
                row.orders,
                formatDuration(row.paid_to_ready_s),
                formatDuration(row.ready_to_handed_s),
                formatDuration(row.paid_to_handed_s),
              ],
            }))}
          />
          <h3 className="mt-6 mb-2 text-sm font-medium">Par compte</h3>
          <p className="mb-2 text-xs text-muted">
            Le compte connecté au moment du geste : sur une tablette partagée, il ne désigne pas une personne.
          </p>
          <Table
            head={["Compte", "Marquées prêtes", "Paiement → prête", "Remises", "Prête → remise"]}
            empty="Enregistré depuis ce déploiement : rien sur la période."
            rows={bar_people.map((row) => ({
              key: row.name,
              cells: [
                row.name,
                row.marked_ready,
                formatDuration(row.paid_to_ready_s),
                row.handed_over,
                formatDuration(row.ready_to_handed_s),
              ],
            }))}
          />
          <h3 className="mt-6 mb-2 text-sm font-medium">Où le bar sature</h3>
          <p className="mb-2 text-xs text-muted">
            Commandes encore à remettre au moment du paiement, et l&apos;attente qui a suivi.
          </p>
          <Table
            head={["Ouvertes", "Commandes", "Paiement → prête", "Paiement → remise"]}
            empty={NO_DATA}
            rows={saturation.map((row) => ({
              key: String(row.open_orders),
              cells: [
                row.open_orders,
                row.orders,
                formatDuration(row.paid_to_ready_s),
                formatDuration(row.paid_to_handed_s),
              ],
            }))}
          />
        </Section>
      )}

      <Section
        title="Ruptures"
        hint="Plats les plus longtemps coupés sur la période. Un plat déjà coupé avant ce déploiement n'apparaît qu'à sa prochaine bascule."
      >
        <Table
          head={["Plat", "Coupures", "Durée", "État"]}
          empty="Aucune coupure enregistrée sur la période."
          rows={sold_out.map((row) => ({
            key: row.name,
            cells: [
              row.name,
              row.times,
              formatDuration(row.seconds),
              row.still_out ? "Coupé" : "Revenu",
            ],
          }))}
        />
      </Section>

      <Section
        title="Panier"
        hint={`${basket.quantity_average === null ? "—" : basket.quantity_average.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} articles par commande. Catégories les plus souvent prises ensemble :`}
      >
        <Table
          head={["Catégories", "Commandes"]}
          empty="Aucune commande à plusieurs catégories."
          rows={basket.pairs.map((pair) => ({
            key: `${pair.first}|${pair.second}`,
            cells: [`${pair.first} + ${pair.second}`, pair.orders],
          }))}
        />
      </Section>

      <Section
        title="Suggestions"
        hint="Proposé : une fois par visite et par sorte. Retenu : commandes qui contiennent une ligne venue de la suggestion. Ne compare que ces deux chiffres : ceux qui acceptent achetaient déjà plus."
      >
        <Table
          head={["Où", "Proposées", "Retenues", "Taux", "Recette"]}
          empty={NO_DATA}
          rows={suggestions.map((row) => ({
            key: row.kind,
            cells: [
              SUGGESTION_LABELS[row.kind],
              row.shown,
              row.orders,
              share(row.orders, row.shown),
              formatEuros(row.revenue),
            ],
          }))}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Fidélité">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile label="Inscriptions" value={String(loyalty.signups)} />
            <StatTile
              label="Commandes de membres"
              value={share(loyalty.orders_with_member, basket.orders)}
            />
            <StatTile label="Tours de roue" value={String(loyalty.wheel_spins)} />
            <StatTile label="Récompenses prises" value={String(loyalty.redemptions)} />
          </div>
        </Section>
        <Section title="Paiement">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile
              label="En ligne"
              value={formatEuros(payment.online_revenue)}
              hint={count(payment.online, "commande")}
            />
            <StatTile
              label="Au bar"
              value={formatEuros(payment.at_bar_revenue)}
              hint={count(payment.at_bar, "commande")}
            />
            <StatTile
              label="Impayées, annulées"
              value={`${payment.unpaid}, ${payment.cancelled}`}
              hint={count(payment.refunded, "remboursée")}
            />
            <StatTile label="Pourboires" value={formatEuros(payment.tips)} />
            {measures?.attempts_since && (
              <StatTile
                label="Tentatives réussies"
                value={`${measures.succeeded}/${closedAttempts(measures)}`}
                hint={`${count(measures.failed, "refusée")}, ${count(measures.expired, "expirée")}, ${count(measures.counter, "passée")} au bar, ${measures.attempts_open} en cours`}
              />
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
