import { createClient } from "@/lib/supabase/client";
import type {
  TablesInsert,
  Tables,
} from "@/lib/supabase/database.types";
import { check, must } from "@/lib/supabase/result";

/*
 * La comptabilité de l'entreprise : dépenses saisies et abonnements payés par
 * Ominin. Les dates sont des jours civils (AAAA-MM-JJ) : tout se calcule sur la
 * chaîne ou en UTC, pour qu'aucun fuseau ne décale un paiement d'un jour.
 */

export type Expense = Tables<"finance_expenses">;
export type Subscription = Tables<"finance_subscriptions">;
export type ExpenseInput = TablesInsert<"finance_expenses">;
export type SubscriptionInput = TablesInsert<"finance_subscriptions">;

const RECEIPTS_BUCKET = "finance-docs";

export async function fetchFinances(): Promise<{
  expenses: Expense[];
  subscriptions: Subscription[];
}> {
  const supabase = createClient();
  const [expenses, subscriptions] = await Promise.all([
    supabase
      .from("finance_expenses")
      .select("*")
      .order("spent_on", { ascending: false })
      .then(must),
    supabase
      .from("finance_subscriptions")
      .select("*")
      .order("name", { ascending: true })
      .then(must),
  ]);
  return { expenses, subscriptions };
}

export async function saveExpense(
  id: string | null,
  input: ExpenseInput
): Promise<void> {
  const table = createClient().from("finance_expenses");
  check(await (id ? table.update(input).eq("id", id) : table.insert(input)));
}

export async function deleteExpense(expense: Expense): Promise<void> {
  const supabase = createClient();
  check(await supabase.from("finance_expenses").delete().eq("id", expense.id));
  if (expense.receipt_path) await deleteReceipt(expense.receipt_path);
}

export async function saveSubscription(
  id: string | null,
  input: SubscriptionInput
): Promise<void> {
  const table = createClient().from("finance_subscriptions");
  check(await (id ? table.update(input).eq("id", id) : table.insert(input)));
}

export async function deleteSubscription(id: string): Promise<void> {
  check(await createClient().from("finance_subscriptions").delete().eq("id", id));
}

export async function uploadReceipt(file: File, folder = ""): Promise<string> {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  const path = `${folder}${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
  check(await createClient().storage.from(RECEIPTS_BUCKET).upload(path, file));
  return path;
}

export async function deleteReceipt(path: string): Promise<void> {
  check(await createClient().storage.from(RECEIPTS_BUCKET).remove([path]));
}

export async function receiptUrl(path: string, ttlSeconds: number): Promise<string> {
  const { signedUrl } = must(
    await createClient()
      .storage.from(RECEIPTS_BUCKET)
      .createSignedUrl(path, ttlSeconds)
  );
  return signedUrl;
}

/** Une source de recettes sur un mois : ce que le client a encaissé, ce qui revient à Ominin. */
export interface RevenueLine {
  source: "menu" | "collect" | "shop" | "club" | "manual" | "invoice";
  provider: string | null;
  payments: number;
  volumeCents: number;
  feeCents: number;
}

/** Recettes d'un mois (AAAA-MM), en centimes. */
export interface RevenueMonth {
  key: string;
  lines: RevenueLine[];
}

export const revenueTotal = (month: RevenueMonth): number =>
  month.lines.reduce((sum, line) => sum + line.feeCents, 0);

const SOURCE_LABELS: Record<RevenueLine["source"], string> = {
  menu: "Commission Menu",
  collect: "Commission Collect",
  shop: "Commission Shop",
  club: "Frais Club",
  manual: "Encaissements hors Stripe",
  invoice: "Factures Stripe",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  square: "Square",
};

/** « Commission Menu via Square » */
export function revenueLabel(line: RevenueLine): string {
  const source = SOURCE_LABELS[line.source];
  if (line.source === "invoice" || !line.provider) return source;
  return `${source} via ${PROVIDER_LABELS[line.provider] ?? line.provider}`;
}

/** stripeError : les factures n'ont pas pu être lues, le reste du chiffre vaut. */
export async function fetchRevenue(): Promise<{
  months: RevenueMonth[];
  stripeError: string | null;
}> {
  const response = await fetch("/api/admin/finances/recettes");
  const body = (await response.json().catch(() => null)) as {
    months?: RevenueMonth[];
    stripeError?: string | null;
    error?: string;
  } | null;
  if (!response.ok || !body?.months) {
    throw new Error(body?.error ?? "Une erreur est survenue.");
  }
  return { months: body.months, stripeError: body.stripeError ?? null };
}

/** Une ligne de la comptabilité : dépense saisie ou paiement d'un abonnement. */
export interface LedgerEntry {
  key: string;
  date: string;
  label: string;
  category: string | null;
  amountCents: number;
  vatCents: number;
  expense?: Expense;
  subscription?: Subscription;
}

const pad = (value: number) => String(value).padStart(2, "0");

export const monthKey = (year: number, month: number): string =>
  `${year}-${pad(month)}`;

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export function todayIso(): string {
  const now = new Date();
  return `${monthKey(now.getFullYear(), now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Le jour où l'abonnement se paie dans ce mois, s'il s'y paie. Un abonnement du
 * 31 se paie le dernier jour des mois plus courts.
 */
export function paymentDate(
  subscription: Subscription,
  key: string
): string | null {
  const [, startMonth, startDay] = subscription.starts_on.split("-").map(Number);
  const [year, month] = key.split("-").map(Number);
  if (subscription.frequency === "yearly" && month !== startMonth) return null;
  const date = `${key}-${pad(Math.min(startDay, daysInMonth(year, month)))}`;
  const ended = subscription.ends_on !== null && date > subscription.ends_on;
  return date >= subscription.starts_on && !ended ? date : null;
}

/** Dépenses et paiements d'abonnements d'un mois, du plus ancien au plus récent. */
export function ledgerOfMonth(
  key: string,
  expenses: readonly Expense[],
  subscriptions: readonly Subscription[]
): LedgerEntry[] {
  const entries: LedgerEntry[] = expenses
    .filter((expense) => expense.spent_on.startsWith(key))
    .map((expense) => ({
      key: expense.id,
      date: expense.spent_on,
      label: expense.label,
      category: expense.category,
      amountCents: expense.amount_cents,
      vatCents: expense.vat_cents,
      expense,
    }));
  for (const subscription of subscriptions) {
    const date = paymentDate(subscription, key);
    if (date) {
      entries.push({
        key: `${subscription.id}:${key}`,
        date,
        label: subscription.name,
        category: subscription.category,
        amountCents: subscription.amount_cents,
        vatCents: subscription.vat_cents,
        subscription,
      });
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export interface MonthTotal {
  key: string;
  amountCents: number;
  vatCents: number;
}

/** Le débours de chaque mois, du tout premier jusqu'au mois de `upTo`. Un
 * paiement à venir du mois courant n'est pas encore une dépense. */
export function monthTotals(
  upTo: string,
  expenses: readonly Expense[],
  subscriptions: readonly Subscription[]
): MonthTotal[] {
  const starts = [
    ...expenses.map((expense) => expense.spent_on),
    ...subscriptions.map((subscription) => subscription.starts_on),
  ].filter((date) => date <= upTo);
  if (starts.length === 0) return [];
  const last = upTo.slice(0, 7);
  const totals: MonthTotal[] = [];
  for (let key = starts.reduce((a, b) => (a < b ? a : b)).slice(0, 7); key <= last; key = shiftMonth(key, 1)) {
    const entries = ledgerOfMonth(key, expenses, subscriptions).filter(
      (entry) => entry.date <= upTo
    );
    totals.push({
      key,
      amountCents: entries.reduce((sum, entry) => sum + entry.amountCents, 0),
      vatCents: entries.reduce((sum, entry) => sum + entry.vatCents, 0),
    });
  }
  return totals;
}

/** Ce que les abonnements en cours coûtent, ramené au mois. */
export function monthlySubscriptionCost(
  subscriptions: readonly Subscription[],
  today: string
): number {
  return subscriptions
    .filter((subscription) => !subscription.ends_on || subscription.ends_on >= today)
    .reduce(
      (sum, subscription) =>
        sum +
        (subscription.frequency === "yearly"
          ? subscription.amount_cents / 12
          : subscription.amount_cents),
      0
    );
}

/** Saisie en euros (« 12,50 ») vers des centimes ; null si illisible. */
export function parseCents(value: string): number | null {
  const amount = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

export const centsToInput = (cents: number): string =>
  (cents / 100).toFixed(2).replace(".", ",");
