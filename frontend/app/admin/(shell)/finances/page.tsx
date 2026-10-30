"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarSeries, StatTile } from "@/components/admin/charts";
import { ExpenseForm } from "@/components/admin/finances/expense-form";
import { PaymentCalendar } from "@/components/admin/finances/payment-calendar";
import { SubscriptionForm } from "@/components/admin/finances/subscription-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatEuros } from "@/lib/admin/format";
import { RECEIPT_URL_TTL_S } from "@/lib/admin/constants";
import {
  fetchFinances,
  fetchRevenue,
  ledgerOfMonth,
  revenueLabel,
  revenueTotal,
  type RevenueMonth,
  monthlySubscriptionCost,
  monthTotals,
  receiptUrl,
  shiftMonth,
  todayIso,
  type Expense,
  type Subscription,
} from "@/lib/admin/finances";

const euros = (cents: number) => formatEuros(cents / 100);

const monthTitle = (key: string) =>
  new Date(`${key}-15T12:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

const dayLabel = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7);

type Editing<T> = { row: T | null } | null;

const BUTTON =
  "rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground";

export default function FinancesPage() {
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const today = todayIso();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editExpense, setEditExpense] = useState<Editing<Expense>>(null);
  const [editSubscription, setEditSubscription] = useState<Editing<Subscription>>(null);

  const [revenue, setRevenue] = useState<RevenueMonth[] | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await fetchFinances();
    setExpenses(data.expenses);
    setSubscriptions(data.subscriptions);
  }, []);

  useEffect(() => {
    // Faux positif : le setState de load() suit la réponse réseau.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error) => {
      const message =
        error instanceof Error ? error.message : "Une erreur est survenue.";
      setLoadError(message);
      toast.error(message);
    });
    // Les recettes passent par Stripe, plus lent : elles n'attendent pas l'écran.
    fetchRevenue()
      .then(({ months, stripeError }) => {
        setRevenue(months);
        setRevenueError(stripeError);
      })
      .catch((error) => {
        setRevenue([]);
        setRevenueError(error instanceof Error ? error.message : "Une erreur est survenue.");
      });
    // toast est stable (contexte) ; l'écran ne se charge qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const totals = useMemo(
    () => monthTotals(today, expenses ?? [], subscriptions),
    [today, expenses, subscriptions]
  );
  const entries = useMemo(
    () => ledgerOfMonth(month, expenses ?? [], subscriptions),
    [month, expenses, subscriptions]
  );
  const categories = useMemo(
    () =>
      [
        ...new Set(
          [...(expenses ?? []), ...subscriptions].flatMap((row) =>
            row.category ? [row.category] : []
          )
        ),
      ].sort(),
    [expenses, subscriptions]
  );

  if (loadError) {
    return <EmptyState title="Chargement impossible" body={loadError} />;
  }
  if (!expenses) {
    return (
      <div aria-busy className="flex flex-col gap-3">
        <div className="shimmer h-9 w-44 rounded-xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  const sum = (key: string) =>
    totals
      .filter((total) => total.key.startsWith(key))
      .reduce((acc, total) => acc + total.amountCents, 0);
  const allTime = sum("");
  const allVat = totals.reduce((acc, total) => acc + total.vatCents, 0);
  const monthCents = entries.reduce((acc, entry) => acc + entry.amountCents, 0);
  const monthVat = entries.reduce((acc, entry) => acc + entry.vatCents, 0);

  const received = (key: string) =>
    (revenue ?? [])
      .filter((row) => row.key.startsWith(key))
      .reduce((acc, row) => acc + revenueTotal(row), 0);
  const shown = (cents: number) => (revenue ? euros(cents) : "…");
  const monthRevenue = revenue?.find((row) => row.key === month);
  const revenueLines = monthRevenue?.lines ?? [];

  const openReceipt = async (path: string) => {
    // Ouvert avant l'attente : passé l'appel réseau, le navigateur bloquerait.
    const tab = window.open("", "_blank");
    try {
      const url = await receiptUrl(path, RECEIPT_URL_TTL_S);
      if (tab) tab.location.href = url;
    } catch (error) {
      tab?.close();
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium">Finances</h1>
          <p className="mt-1 text-sm text-muted">
            Ce qu&apos;Ominin gagne, ce qu&apos;elle dépense et les abonnements qu&apos;elle paie.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BUTTON} onClick={() => setEditSubscription({ row: null })}>
            Nouvel abonnement
          </button>
          <button
            type="button"
            className="ember-gradient rounded-full px-5 py-2 text-sm font-semibold text-background"
            onClick={() => setEditExpense({ row: null })}
          >
            Nouvelle dépense
          </button>
        </div>
      </div>

      {revenueError && (
        <p role="alert" className="rounded-2xl border border-ember-3/50 bg-ember-3/10 p-4 text-sm text-ember-3">
          Recettes incomplètes : les factures Stripe n&apos;ont pas pu être lues ({revenueError}).
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Recettes ce mois-ci" value={shown(received(today.slice(0, 7)))} />
        <StatTile label="Recettes cette année" value={shown(received(today.slice(0, 4)))} />
        <StatTile label="Recettes depuis le début" value={shown(received(""))} />
        <StatTile
          label="Résultat depuis le début"
          value={shown(received("") - allTime)}
          hint="recettes moins dépenses, avant impôts"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Dépenses ce mois-ci" value={euros(sum(today.slice(0, 7)))} hint="payé à ce jour, TTC" />
        <StatTile label="Dépenses cette année" value={euros(sum(today.slice(0, 4)))} hint="TTC" />
        <StatTile
          label="Dépenses depuis le début"
          value={euros(allTime)}
          hint={`dont ${euros(allVat)} de TVA`}
        />
        <StatTile
          label="Abonnements"
          value={euros(monthlySubscriptionCost(subscriptions, today))}
          hint="par mois, en cours"
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium capitalize">{monthTitle(month)}</h2>
          <div className="flex gap-2">
            <button type="button" aria-label="Mois précédent" className={BUTTON} onClick={() => setMonth(shiftMonth(month, -1))}>
              ←
            </button>
            <button type="button" className={BUTTON} onClick={() => setMonth(today.slice(0, 7))}>
              Aujourd&apos;hui
            </button>
            <button type="button" aria-label="Mois suivant" className={BUTTON} onClick={() => setMonth(shiftMonth(month, 1))}>
              →
            </button>
          </div>
        </div>
        <PaymentCalendar month={month} today={today} entries={entries} />
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Dépenses du mois</h2>
          <p className="text-sm tabular-nums text-muted">
            {euros(monthCents)} TTC · {euros(monthVat)} de TVA
          </p>
        </div>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucune dépense ce mois-ci.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {entries.map((entry) => (
              <li key={entry.key} className="flex items-center gap-3 py-2.5">
                <span className="w-12 shrink-0 text-xs tabular-nums text-faint">{dayLabel(entry.date)}</span>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() =>
                    entry.expense
                      ? setEditExpense({ row: entry.expense })
                      : setEditSubscription({ row: entry.subscription ?? null })
                  }
                >
                  <span className="block truncate text-sm font-medium">{entry.label}</span>
                  <span className="block truncate text-xs text-muted">
                    {[entry.subscription ? "Abonnement" : "Dépense", entry.category]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </button>
                {entry.expense?.receipt_path && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted hover:text-foreground"
                    onClick={() => void openReceipt(entry.expense?.receipt_path ?? "")}
                  >
                    Justificatif
                  </button>
                )}
                <span className="shrink-0 text-sm font-medium tabular-nums">{euros(entry.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-medium">Recettes du mois</h2>
          <p className="text-sm tabular-nums text-muted">{shown(received(month))}</p>
        </div>
        {revenueLines.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {revenue ? "Aucune recette ce mois-ci." : "Chargement…"}
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {revenueLines.map((line) => (
              <li key={`${line.source}:${line.provider}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{revenueLabel(line)}</span>
                  <span className="block truncate text-xs text-muted">
                    {line.payments} paiement{line.payments > 1 ? "s" : ""} · {euros(line.volumeCents)} encaissés
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium tabular-nums">{euros(line.feeCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="mb-4 font-display text-lg font-medium">Recettes par mois</h2>
        <BarSeries
          data={(revenue ?? []).map((row) => ({
            key: row.key,
            label: `${row.key.slice(5, 7)}/${row.key.slice(2, 4)}`,
            value: revenueTotal(row) / 100,
            title: `${monthTitle(row.key)} · ${euros(revenueTotal(row))}`,
          }))}
          ariaLabel="Recettes par mois"
          formatTick={(value) => formatEuros(value)}
          empty="Aucune recette enregistrée."
        />
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="mb-3 font-display text-lg font-medium">Abonnements</h2>
        {subscriptions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Ajoutez ce que paie Ominin (hébergement, outils, API) : leurs jours de
            paiement rejoignent le calendrier.
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {subscriptions.map((subscription) => (
              <li key={subscription.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                  onClick={() => setEditSubscription({ row: subscription })}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{subscription.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {subscription.frequency === "yearly"
                        ? `Chaque année, le ${dayLabel(subscription.starts_on)}`
                        : `Chaque mois, le ${Number(subscription.starts_on.slice(8, 10))}`}
                      {subscription.ends_on ? ` · jusqu'au ${dayLabel(subscription.ends_on)}/${subscription.ends_on.slice(0, 4)}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{euros(subscription.amount_cents)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h2 className="mb-4 font-display text-lg font-medium">Dépenses par mois</h2>
        <BarSeries
          data={totals.map((total) => ({
            key: total.key,
            label: `${total.key.slice(5, 7)}/${total.key.slice(2, 4)}`,
            value: total.amountCents / 100,
            title: `${monthTitle(total.key)} · ${euros(total.amountCents)}`,
          }))}
          ariaLabel="Dépenses par mois"
          formatTick={(value) => formatEuros(value)}
          empty="Aucune dépense enregistrée."
        />
      </section>

      <datalist id="finance-categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      {editExpense && (
        <ExpenseForm
          expense={editExpense.row}
          defaultDate={today}
          onSaved={load}
          onClose={() => setEditExpense(null)}
        />
      )}
      {editSubscription && (
        <SubscriptionForm
          subscription={editSubscription.row}
          defaultDate={today}
          onSaved={load}
          onClose={() => setEditSubscription(null)}
        />
      )}
    </div>
  );
}
