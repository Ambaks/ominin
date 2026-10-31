import { ANALYSES, SMALL_BASE } from "./constants";

/*
 * Ce que l'onglet Analyses déduit de la réponse de `gestion_analyses`. Aucune
 * estimation sous les planchers d'ANALYSES : un petit nombre ne doit pas
 * promettre des euros. Tous les montants d'opportunité sont des ordres de
 * grandeur : ils lisent une corrélation, pas un effet démontré.
 */

export interface PeriodSummary {
  orders: number;
  visits: number;
  table_visits: number;
  repeat_visits: number;
  revenue: number;
  revenue_ht: number;
  cost: number;
  cost_exact: number;
  costed_revenue_ht: number;
  free_units: number;
}

export interface AnalysesItem {
  item_id: string;
  name: string;
  category_id: string;
  price: number;
  vat_rate: number;
  disponible: boolean;
  unit_cost: number | null;
  units: number;
  visits: number;
  revenue: number;
  revenue_ht: number;
  cost: number | null;
  sold_out_hours: number;
}

export interface AnalysesCategory {
  category_id: string;
  name: string;
  cost_percent: number | null;
  visits: number;
  units: number;
  revenue: number;
  revenue_ht: number;
}

export interface AnalysesDay {
  day: string;
  revenue: number;
  orders: number;
  visits: number;
}

export interface CancelledSummary {
  orders: number;
  revenue: number;
  lost_orders: number;
  lost_revenue: number;
}

export interface FunnelSummary {
  sessions: number;
  paniers: number;
  commandes: number;
  paiements: number;
}

export interface AnalysesSettings {
  hourly_labor_cost: number | null;
  food_cost_target: number | null;
  labor_cost_target: number | null;
  prime_cost_target: number | null;
}

export interface AnalysesData {
  summary: { current: PeriodSummary; previous: PeriodSummary };
  days: AnalysesDay[];
  heat: { dow: number; hour: number; revenue: number; orders: number }[];
  items: AnalysesItem[];
  categories: AnalysesCategory[];
  active_hours: number;
  labor: { day: string; dow: number; hour: number; hours: number }[];
  settings: AnalysesSettings | null;
  cancelled: { current: CancelledSummary; previous: CancelledSummary };
  funnel: { current: FunnelSummary; previous: FunnelSummary };
  payments: { attempts: number; succeeded: number; failed: number };
  loyalty: {
    member_orders: number;
    member_revenue: number;
    other_orders: number;
    other_revenue: number;
    members: number;
    returning: number;
  };
  accords: { source: string; units: number; revenue: number }[];
  after_meal: { shown: number; added: number; ordered: number };
}

const percent = (value: number) => `${Math.round(value * 100)}\u00a0%`;

export const ratio = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null);

export function quantile(sorted: readonly number[], q: number): number {
  const at = (sorted.length - 1) * q;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low] + (sorted[high] - sorted[low]) * (at - low);
}

const ascending = (values: readonly number[]) => [...values].sort((a, b) => a - b);

/** Lundi = 1, comme `isodow`. Un jour de service reste une date sans fuseau. */
export function isoWeekday(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).getUTCDay() || 7;
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10);
}

export interface Decomposition {
  revenueDelta: number;
  /** Part de l'écart due au nombre de passages, à dépense d'avant. */
  fromVisits: number;
  /** Part due à la dépense par passage, au nombre de passages d'aujourd'hui. */
  fromSpend: number;
}

export function decompose(current: PeriodSummary, previous: PeriodSummary): Decomposition | null {
  if (previous.visits < SMALL_BASE || current.visits === 0) return null;
  const spendBefore = previous.revenue / previous.visits;
  const spendNow = current.revenue / current.visits;
  return {
    revenueDelta: current.revenue - previous.revenue,
    fromVisits: (current.visits - previous.visits) * spendBefore,
    fromSpend: (spendNow - spendBefore) * current.visits,
  };
}

export interface RangeRow {
  day: string;
  median: number;
  low: number;
  high: number;
  /** Absent : une prévision, le jour n'a pas eu lieu. */
  actual?: number;
  outside?: "above" | "below";
}

function revenueByWeekday(days: readonly AnalysesDay[], before: string): Map<number, number[]> {
  const byWeekday = new Map<number, number[]>();
  for (const day of days) {
    if (day.day >= before || day.revenue <= 0) continue;
    const weekday = isoWeekday(day.day);
    byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), day.revenue]);
  }
  return byWeekday;
}

/**
 * Les derniers jours d'ouverture face aux mêmes jours de la semaine d'avant :
 * médiane ± écart interquartile. Le jour jugé n'entre pas dans sa propre
 * fourchette, et un jour sans vente est un jour fermé : il n'en fait pas partie.
 */
export function weekdayNorms(days: readonly AnalysesDay[], lastDays: number, to: string): RangeRow[] {
  const from = addDays(to, -lastDays);
  return days
    .filter((day) => day.day >= from && day.day < to && day.revenue > 0)
    .flatMap((day) => {
      const history = (revenueByWeekday(days, day.day).get(isoWeekday(day.day)) ?? []).slice(-ANALYSES.historyWeeks);
      if (history.length < ANALYSES.forecastWeeks) return [];
      const sorted = ascending(history);
      const median = quantile(sorted, 0.5);
      const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
      const low = Math.max(0, median - iqr);
      const high = median + iqr;
      return [{
        day: day.day,
        median,
        low,
        high,
        actual: day.revenue,
        outside: day.revenue > high ? ("above" as const) : day.revenue < low ? ("below" as const) : undefined,
      }];
    });
}

/** Les prochains jours : médiane des derniers mêmes jours, avec leur étendue. */
export function forecast(days: readonly AnalysesDay[], to: string): RangeRow[] {
  const byWeekday = revenueByWeekday(days, to);
  return Array.from({ length: ANALYSES.forecastDays }, (_, offset) => addDays(to, offset)).flatMap((day) => {
    const recent = (byWeekday.get(isoWeekday(day)) ?? []).slice(-ANALYSES.forecastWeeks);
    if (recent.length < ANALYSES.forecastWeeks) return [];
    const sorted = ascending(recent);
    return [{ day, median: quantile(sorted, 0.5), low: sorted[0], high: sorted[sorted.length - 1] }];
  });
}

export type Quadrant = "vedette" | "a_ajuster" | "a_pousser" | "a_revoir";

export interface MatrixRow extends AnalysesItem {
  quadrant: Quadrant;
  /** Marge par portion, hors taxes. */
  margin: number;
  /** Part des ventes de sa catégorie. */
  share: number;
}

/**
 * Kasavana-Smith, catégorie par catégorie : on ne compare pas un café à une
 * entrecôte. Populaire : au moins 70 % d'une part égale de la catégorie.
 * Rentable : au moins la marge moyenne de la catégorie, pondérée par les ventes.
 */
export function menuMatrix(data: AnalysesData): { rows: MatrixRow[]; tooFew: number } {
  const percentOf = new Map(data.categories.map((category) => [category.category_id, category.cost_percent]));
  const onMenu = data.items.filter((item) => item.units > 0 || item.disponible);
  const costed = onMenu.flatMap((item) => {
    const htPrice = item.units > 0 ? item.revenue_ht / item.units : item.price / (1 + item.vat_rate / 100);
    const percent = percentOf.get(item.category_id);
    const unitCost = item.unit_cost ?? (percent != null ? (htPrice * percent) / 100 : null);
    return unitCost == null ? [] : [{ item, margin: htPrice - unitCost }];
  });
  const rows: MatrixRow[] = [];
  let tooFew = 0;
  for (const categoryId of new Set(costed.map((row) => row.item.category_id))) {
    // Les parts se mesurent sur toute la catégorie, chiffrée ou non.
    const siblings = onMenu.filter((item) => item.category_id === categoryId);
    const units = siblings.reduce((sum, item) => sum + item.units, 0);
    const group = costed.filter((row) => row.item.category_id === categoryId);
    const groupUnits = group.reduce((sum, row) => sum + row.item.units, 0);
    if (groupUnits === 0) continue;
    const averageMargin = group.reduce((sum, row) => sum + row.margin * row.item.units, 0) / groupUnits;
    const popular = ANALYSES.popularityFactor / siblings.length;
    for (const { item, margin } of group) {
      // Un plat tout juste à la carte n'a pas encore de verdict.
      if (item.units < ANALYSES.minItemUnits) {
        tooFew += 1;
        continue;
      }
      const share = item.units / units;
      const isPopular = share >= popular;
      const isProfitable = margin >= averageMargin;
      const quadrant: Quadrant = isPopular
        ? isProfitable ? "vedette" : "a_ajuster"
        : isProfitable ? "a_pousser" : "a_revoir";
      rows.push({ ...item, quadrant, margin, share });
    }
  }
  return { rows, tooFew };
}

export function targetsOf(settings: AnalysesSettings | null) {
  return {
    food: settings?.food_cost_target ?? ANALYSES.foodCostTarget,
    labor: settings?.labor_cost_target ?? ANALYSES.laborCostTarget,
    prime: settings?.prime_cost_target ?? ANALYSES.primeCostTarget,
  };
}

export interface LaborView {
  hours: number;
  cost: number | null;
  /** CA HT des jours pointés : un jour sans pointage ne compte ni d'un côté ni de l'autre. */
  coveredRevenueHt: number;
  percent: number | null;
  revenuePerHour: number | null;
  daysWithSales: number;
  daysCovered: number;
}

function laborView(
  data: AnalysesData,
  from: string,
  to: string,
  revenueHtPerRevenue: number
): LaborView {
  const hoursByDay = new Map<string, number>();
  for (const row of data.labor) {
    if (row.day >= from && row.day < to) hoursByDay.set(row.day, (hoursByDay.get(row.day) ?? 0) + row.hours);
  }
  const salesDays = data.days.filter((day) => day.day >= from && day.day < to && day.revenue > 0);
  const covered = salesDays.filter((day) => hoursByDay.has(day.day));
  const coveredRevenueHt = covered.reduce((sum, day) => sum + day.revenue, 0) * revenueHtPerRevenue;
  const hours = covered.reduce((sum, day) => sum + (hoursByDay.get(day.day) ?? 0), 0);
  const rate = data.settings?.hourly_labor_cost ?? null;
  const cost = rate == null ? null : hours * rate;
  return {
    hours,
    cost,
    coveredRevenueHt,
    percent: cost == null ? null : ratio(cost * 100, coveredRevenueHt),
    revenuePerHour: ratio(coveredRevenueHt, hours),
    daysWithSales: salesDays.length,
    daysCovered: covered.length,
  };
}

export function laborViews(data: AnalysesData, from: string, to: string, previousFrom: string) {
  const { current, previous } = data.summary;
  return {
    current: laborView(data, from, to, ratio(current.revenue_ht, current.revenue) ?? 0),
    previous: laborView(data, previousFrom, from, ratio(previous.revenue_ht, previous.revenue) ?? 0),
  };
}

export interface HeatCell {
  dow: number;
  hour: number;
  /** CA TTC moyen, par jour de vente de ce jour de la semaine. */
  revenue: number;
  orders: number;
  /** Heures moyennes, par jour pointé : un jour sans pointage ne dit pas zéro heure. */
  staffHours: number;
  /** Jours pointés de ce jour de la semaine. */
  coveredDays: number;
}

/** La grille jour × heure, moyennée sur les jours où le restaurant a vendu. */
export function heatGrid(data: AnalysesData, from: string, to: string): HeatCell[] {
  const salesDays = data.days.filter((day) => day.day >= from && day.day < to && day.revenue > 0);
  const clocked = new Set(data.labor.filter((row) => row.day >= from && row.day < to).map((row) => row.day));
  const count = (days: readonly AnalysesDay[], dow: number) =>
    days.filter((day) => isoWeekday(day.day) === dow).length;
  const covered = salesDays.filter((day) => clocked.has(day.day));
  const key = (dow: number, hour: number) => `${dow}/${hour}`;
  const staff = new Map<string, number>();
  for (const row of data.labor) {
    if (!covered.some((day) => day.day === row.day)) continue;
    staff.set(key(row.dow, row.hour), (staff.get(key(row.dow, row.hour)) ?? 0) + row.hours);
  }
  return data.heat.map((cell) => {
    const coveredDays = count(covered, cell.dow);
    return {
      dow: cell.dow,
      hour: cell.hour,
      revenue: cell.revenue / (count(salesDays, cell.dow) || 1),
      orders: cell.orders / (count(salesDays, cell.dow) || 1),
      staffHours: coveredDays > 0 ? (staff.get(key(cell.dow, cell.hour)) ?? 0) / coveredDays : 0,
      coveredDays,
    };
  });
}

export interface Opportunity {
  id: string;
  title: string;
  /** Ce qui fonde l'estimation, en chiffres. */
  fact: string;
  /** € par mois ; nul : à faire, sans montant défendable. */
  monthly: number | null;
  /** Ce que mesure le montant : du CA, ou ce qui reste au restaurant. */
  basis: "ca" | "marge";
  /** « jusqu'à » : un plafond, atteint seulement si tout se récupère. */
  ceiling: boolean;
  action: string;
  href: string;
}

/** Noms cités d'un coup dans une piste. */
const NAMES_SHOWN = 3;

const namesOf = (names: readonly string[]) =>
  names.slice(0, NAMES_SHOWN).join(", ") + (names.length > NAMES_SHOWN ? "…" : "");

/**
 * Les pistes d'un mois, hors taxes : les estimations d'abord, puis les plafonds,
 * puis ce qui n'a pas de montant. Elles se recoupent : elles ne s'additionnent pas.
 */
export function opportunities(
  data: AnalysesData,
  periodDays: number,
  from: string,
  to: string,
  formatMoney: (value: number) => string
): Opportunity[] {
  const perMonth = ANALYSES.monthDays / periodDays;
  const { current } = data.summary;
  const targets = targetsOf(data.settings);
  const htShare = ratio(current.revenue_ht, current.revenue) ?? 0;
  const found: Opportunity[] = [];

  if (current.visits >= ANALYSES.minVisits) {
    // La catégorie la moins prise parmi celles qui ont assez de passages : la plus
    // grosse gagnerait toujours le calcul, sans être celle où il reste de la place.
    const uplift = ANALYSES.attachUpliftPoints / 100;
    const best = data.categories
      .filter((category) => category.visits >= ANALYSES.minVisits && category.visits < current.visits)
      .sort((a, b) => a.visits - b.visits)[0];
    if (best) {
      const attach = best.visits / current.visits;
      const gain = Math.min(uplift, 1 - attach) * current.visits * (best.revenue_ht / best.visits);
      found.push({
        id: "attach",
        title: `Vendre plus de « ${best.name} »`,
        fact: `${percent(attach)} des passages en prennent ; à ${percent(attach + Math.min(uplift, 1 - attach))}, ${formatMoney(best.revenue_ht / best.visits)} HT de plus par passage gagné`,
        monthly: gain * perMonth,
        basis: "ca",
        ceiling: false,
        action: "Mettre en avant",
        href: "/gestion/menu",
      });
    }
  }

  const lostToStockouts = data.items.filter(
    (item) =>
      item.sold_out_hours > 0 &&
      item.units >= ANALYSES.minItemUnits &&
      item.sold_out_hours < data.active_hours * ANALYSES.maxSoldOutShare
  );
  const stockoutValue = lostToStockouts.reduce((sum, item) => {
    const perHour = item.units / (data.active_hours - item.sold_out_hours);
    return sum + perHour * item.sold_out_hours * (item.revenue_ht / item.units);
  }, 0);
  if (stockoutValue > 0) {
    const worst = [...lostToStockouts].sort((a, b) => b.sold_out_hours - a.sold_out_hours)[0];
    found.push({
      id: "stockouts",
      title: "Éviter les ruptures",
      fact: `${lostToStockouts.length} article${lostToStockouts.length > 1 ? "s" : ""} · ${worst.name} : en rupture ${worst.sold_out_hours} h pendant le service`,
      monthly: stockoutValue * perMonth,
      basis: "ca",
      ceiling: false,
      action: "Voir la carte",
      href: "/gestion/menu",
    });
  }

  const { lost_orders: lostOrders, lost_revenue: lostRevenue } = data.cancelled.current;
  if (lostOrders >= SMALL_BASE && lostRevenue > 0) {
    found.push({
      id: "cancelled",
      title: "Sauver les commandes annulées",
      fact: `${lostOrders} commandes annulées, non refaites sous ${ANALYSES.replacedMinutes} min`,
      monthly: lostRevenue * htShare * perMonth,
      basis: "ca",
      ceiling: true,
      action: "Voir les commandes",
      href: "/gestion/commandes",
    });
  }

  const overTarget = data.items.flatMap((item) => {
    if (item.unit_cost == null || item.units < ANALYSES.minItemUnits) return [];
    const htPrice = item.revenue_ht / item.units;
    const needed = item.unit_cost / (targets.food / 100);
    return needed > htPrice ? [{ item, gain: (needed - htPrice) * item.units }] : [];
  });
  if (overTarget.length > 0) {
    const sorted = [...overTarget].sort((a, b) => b.gain - a.gain);
    found.push({
      id: "reprice",
      title: "Revoir le prix des plats trop chers à produire",
      fact: `${sorted.length} plat${sorted.length > 1 ? "s" : ""} au-dessus de ${targets.food} % de matière : ${namesOf(sorted.map((row) => row.item.name))} · si les ventes ne baissent pas`,
      monthly: overTarget.reduce((sum, row) => sum + row.gain, 0) * perMonth,
      basis: "marge",
      ceiling: true,
      action: "Revoir les prix",
      href: "/gestion/menu",
    });
  }

  const rate = data.settings?.hourly_labor_cost;
  if (rate != null && current.revenue > 0) {
    // Seules les heures qui vendent : la mise en place n'est pas du temps en trop.
    const excess = heatGrid(data, from, to).flatMap((cell) => {
      const allowed = ((targets.labor / 100) * cell.revenue * htShare) / rate;
      const hours = (cell.staffHours - allowed) * cell.coveredDays;
      return hours > 0 ? [{ cell, hours }] : [];
    });
    if (excess.length > 0) {
      const hours = excess.reduce((sum, row) => sum + row.hours, 0) * perMonth;
      found.push({
        id: "labor",
        title: "Ajuster les heures creuses",
        fact: `≈ ${Math.round(hours)} h par mois au-dessus de ${targets.labor} % d’équipe, sur ${excess.length} créneaux · sans compter l’effectif minimum`,
        monthly: hours * rate,
        basis: "marge",
        ceiling: true,
        action: "Voir le planning",
        href: "/gestion/equipe",
      });
    }
  }

  if (data.payments.failed >= SMALL_BASE && current.orders > 0) {
    found.push({
      id: "payments",
      title: "Récupérer les paiements refusés",
      fact: `${data.payments.failed} refus sans reprise sur ${data.payments.attempts} tentatives`,
      monthly: data.payments.failed * (current.revenue_ht / current.orders) * perMonth,
      basis: "ca",
      ceiling: true,
      action: "Voir les paiements",
      href: "/gestion/paiements",
    });
  }

  if (current.visits >= ANALYSES.minVisits) {
    const rare = data.items.filter(
      (item) => item.disponible && (item.units / current.visits) * 100 < ANALYSES.rareItemPer100Visits
    );
    if (rare.length > 0) {
      found.push({
        id: "rare",
        title: "Alléger la carte",
        fact: `Moins d’une vente pour 100 passages : ${namesOf(rare.map((item) => item.name))}`,
        monthly: null,
        basis: "ca",
        ceiling: false,
        action: "Voir la carte",
        href: "/gestion/menu",
      });
    }
  }

  const rank = (item: Opportunity) => (item.monthly == null ? 2 : item.ceiling ? 1 : 0);
  return found.sort((a, b) => rank(a) - rank(b) || (b.monthly ?? 0) - (a.monthly ?? 0));
}

/** CA HT par heure d'équipe, jour de la semaine par jour de la semaine : lundi d'abord. */
export function revenuePerStaffHour(
  data: AnalysesData,
  from: string,
  to: string
): { dow: number; value: number | null }[] {
  const htShare = ratio(data.summary.current.revenue_ht, data.summary.current.revenue) ?? 0;
  const hoursByDay = new Map<string, number>();
  for (const row of data.labor) {
    if (row.day >= from && row.day < to) hoursByDay.set(row.day, (hoursByDay.get(row.day) ?? 0) + row.hours);
  }
  return [1, 2, 3, 4, 5, 6, 7].map((dow) => {
    const days = data.days.filter(
      (day) => day.day >= from && day.day < to && day.revenue > 0 && hoursByDay.has(day.day) && isoWeekday(day.day) === dow
    );
    const hours = days.reduce((sum, day) => sum + (hoursByDay.get(day.day) ?? 0), 0);
    const revenue = days.reduce((sum, day) => sum + day.revenue, 0) * htShare;
    return { dow, value: ratio(revenue, hours) };
  });
}

export type StaffTeam = "cuisine" | "salle";

/** Ce que chaque personne a pointé, par jour de la semaine, sur la période lue. */
export interface StaffHabit {
  staff_id: string;
  team: StaffTeam;
  dow: number;
  days: number;
  hours: number;
}

export interface StaffingData {
  volumes: { day: string; dow: number; hour: number; orders: number }[];
  waits: { dow: number; hour: number; orders: number; median_seconds: number }[];
  staff: { day: string; dow: number; hour: number; team: StaffTeam; hours: number }[];
  habits: StaffHabit[];
  settings: { hourly_labor_cost: number | null; orders_per_server_hour: number | null } | null;
}

export interface DraftShift {
  day: string;
  team: StaffTeam;
  startHour: number;
  endHour: number;
  /** Nul : personne de disponible, à pourvoir par le gérant. */
  staffId: string | null;
}

export interface WeekDraft {
  shifts: DraftShift[];
  /** Les heures d'une semaine habituelle, sur les jours que couvre le brouillon. */
  usualHours: number;
}

export interface DayNeed {
  day: string;
  dow: number;
  /** Serveurs nécessaires par heure d'ouverture. */
  servers: Map<number, number>;
}

const medianOf = (values: readonly number[]) => quantile(ascending(values), 0.5);

export const shiftHours = (run: { startHour: number; endHour: number }) => run.endHour - run.startHour;

/**
 * Des effectifs heure par heure, en créneaux : chaque personne en plus est une couche.
 * Un trou trop court se comble, un créneau trop court s'allonge, dans l'ouverture.
 */
function runsOf(headcount: ReadonlyMap<number, number>): { startHour: number; endHour: number }[] {
  const { minShiftHours, maxShiftHours, minBreakHours } = ANALYSES.staffing;
  const open = [...headcount.entries()].filter(([, count]) => count > 0).map(([hour]) => hour);
  if (open.length === 0) return [];
  const opening = Math.min(...open);
  const closing = Math.max(...open) + 1;
  const runs: { startHour: number; endHour: number }[] = [];
  for (let layer = 1; layer <= Math.max(...headcount.values()); layer += 1) {
    const layerRuns: { startHour: number; endHour: number }[] = [];
    for (let hour = opening; hour < closing; hour += 1) {
      if ((headcount.get(hour) ?? 0) < layer) continue;
      const last = layerRuns.at(-1);
      if (last && hour - last.endHour < minBreakHours) last.endHour = hour + 1;
      else layerRuns.push({ startHour: hour, endHour: hour + 1 });
    }
    for (const run of layerRuns) {
      const endHour = Math.min(closing, Math.max(run.endHour, run.startHour + minShiftHours));
      const startHour = Math.max(opening, Math.min(run.startHour, endHour - minShiftHours));
      // Trop long pour une seule personne : deux créneaux égaux, qui se passent le relais.
      const pieces = Math.ceil((endHour - startHour) / maxShiftHours);
      for (let piece = 0; piece < pieces; piece += 1) {
        runs.push({
          startHour: startHour + Math.round(((endHour - startHour) * piece) / pieces),
          endHour: startHour + Math.round(((endHour - startHour) * (piece + 1)) / pieces),
        });
      }
    }
  }
  return runs;
}

/** Le lundi de la semaine qui suit le jour de service `to`. */
export const nextMondayAfter = (to: string) => addDays(to, 8 - isoWeekday(to));

/**
 * Prévision, charge, effectif. Les commandes attendues heure par heure donnent le nombre
 * de serveurs. Une heure où l'attente dépasse déjà la limite ne descend jamais sous son
 * effectif habituel : on ne retire personne là où les clients attendent déjà trop.
 */
export function dayNeeds(
  data: StaffingData,
  to: string,
  ordersPerServerHour: number,
  maxWaitMinutes: number
): DayNeed[] {
  const { forecastQuantile, minPerTeam, minSamples } = ANALYSES.staffing;
  const nextMonday = nextMondayAfter(to);
  const salesDays = [...new Set(data.volumes.map((row) => row.day))];
  const volumes = new Map(data.volumes.map((row) => [`${row.day}/${row.hour}`, row.orders]));
  const present = new Map(
    data.staff.filter((row) => row.team === "salle").map((row) => [`${row.day}/${row.hour}`, row.hours])
  );
  const slowHours = new Set(
    data.waits
      .filter((row) => row.orders >= minSamples && row.median_seconds / 60 >= maxWaitMinutes)
      .map((row) => `${row.dow}/${row.hour}`)
  );
  return [1, 2, 3, 4, 5, 6, 7].flatMap((dow) => {
    const days = salesDays.filter((sample) => isoWeekday(sample) === dow);
    if (days.length < minSamples) return [];
    const clocked = days.filter((sample) => data.staff.some((row) => row.team === "salle" && row.day === sample));
    // Toutes les commandes payées comptent, quel que soit le mode de paiement.
    const orders = new Map<number, number>();
    const usual = new Map<number, number>();
    const open: number[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const forecast = quantile(ascending(days.map((sample) => volumes.get(`${sample}/${hour}`) ?? 0)), forecastQuantile);
      orders.set(hour, forecast);
      const median = clocked.length > 0 ? medianOf(clocked.map((sample) => present.get(`${sample}/${hour}`) ?? 0)) : 0;
      usual.set(hour, Math.round(median));
      if (forecast > 0 || median >= 0.5) open.push(hour);
    }
    if (open.length === 0) return [];
    const servers = new Map<number, number>();
    for (let hour = Math.min(...open); hour <= Math.max(...open); hour += 1) {
      const fromOrders = Math.max(minPerTeam.salle, Math.ceil((orders.get(hour) ?? 0) / ordersPerServerHour));
      servers.set(hour, slowHours.has(`${dow}/${hour}`) ? Math.max(fromOrders, usual.get(hour) ?? 0) : fromOrders);
    }
    return [{ day: addDays(nextMonday, dow - 1), dow, servers }];
  });
}

/**
 * Le brouillon de la semaine prochaine, construit depuis la demande et non depuis les
 * habitudes : les serveurs suivent les commandes prévues, un cuisinier couvre toute
 * l'ouverture si le restaurant en a. Les journées chargées se pourvoient d'abord. Chaque
 * créneau va à qui vient d'habitude ce jour-là, puis au reste de l'équipe, sans chevauchement
 * ni dépassement de ses heures habituelles. Rien ne connaît les contrats, les congés ni les
 * pauses : le gérant relit tout.
 */
export function draftWeek(
  data: StaffingData,
  to: string,
  ordersPerServerHour: number,
  maxWaitMinutes: number
): WeekDraft {
  const { habits } = data;
  const present = new Map(data.staff.map((row) => [`${row.day}/${row.hour}/${row.team}`, row.hours]));
  const salesDays = [...new Set(data.volumes.map((row) => row.day))];
  const hasCooks = data.staff.some((row) => row.team === "cuisine") || habits.some((row) => row.team === "cuisine");
  const weekly = new Map<string, number>();
  for (const habit of habits) {
    weekly.set(habit.staff_id, (weekly.get(habit.staff_id) ?? 0) + habit.hours / ANALYSES.forecastWeeks);
  }
  let usualHours = 0;
  const plans: { day: string; dow: number; team: StaffTeam; runs: ReturnType<typeof runsOf> }[] = [];
  for (const need of dayNeeds(data, to, ordersPerServerHour, maxWaitMinutes)) {
    const samples = salesDays.filter((day) => isoWeekday(day) === need.dow);
    for (const team of ["cuisine", "salle"] as const) {
      const clocked = samples.filter((day) => data.staff.some((row) => row.team === team && row.day === day));
      // Les heures telles qu'elles sont pointées : arrondir une demi-heure gonflerait l'économie.
      for (let hour = 0; hour < 24 && clocked.length > 0; hour += 1) {
        usualHours += medianOf(clocked.map((day) => present.get(`${day}/${hour}/${team}`) ?? 0));
      }
    }
    plans.push({ day: need.day, dow: need.dow, team: "salle", runs: runsOf(need.servers) });
    if (hasCooks) {
      const cook = new Map([...need.servers.keys()].map((hour) => [hour, ANALYSES.staffing.minPerTeam.cuisine]));
      plans.push({ day: need.day, dow: need.dow, team: "cuisine", runs: runsOf(cook) });
    }
  }
  const loadOf = (day: string) =>
    plans.filter((plan) => plan.day === day).flatMap((plan) => plan.runs).reduce((sum, run) => sum + shiftHours(run), 0);
  plans.sort((a, b) => loadOf(b.day) - loadOf(a.day) || a.day.localeCompare(b.day));

  type Plan = (typeof plans)[number];
  type Run = Plan["runs"][number];
  const assigned = new Map<string, number>();
  const shifts: DraftShift[] = [];
  const habitOn = (id: string, dow: number) =>
    habits.find((habit) => habit.staff_id === id && habit.dow === dow)?.days ?? 0;
  const place = (plan: Plan, run: Run, people: string[]) => {
    const free = people.find((id) => {
      const ofDay = shifts.filter((shift) => shift.staffId === id && shift.day === plan.day);
      return (
        !ofDay.some((shift) => shift.startHour < run.endHour && run.startHour < shift.endHour) &&
        ofDay.reduce((sum, shift) => sum + shiftHours(shift), shiftHours(run)) <= ANALYSES.staffing.maxShiftHours &&
        (assigned.get(id) ?? 0) + shiftHours(run) <= (weekly.get(id) ?? 0)
      );
    });
    if (!free) return false;
    assigned.set(free, (assigned.get(free) ?? 0) + shiftHours(run));
    shifts.push({ day: plan.day, team: plan.team, ...run, staffId: free });
    return true;
  };
  // D'abord les jours où chacun vient d'habitude (au moins une semaine sur deux), puis le reste.
  const leftover: { plan: Plan; run: Run; people: string[] }[] = [];
  for (const plan of plans) {
    const people = [...new Set(habits.filter((habit) => habit.team === plan.team).map((habit) => habit.staff_id))].sort(
      (a, b) => habitOn(b, plan.dow) - habitOn(a, plan.dow) || (weekly.get(b) ?? 0) - (weekly.get(a) ?? 0)
    );
    const regular = people.filter((id) => habitOn(id, plan.dow) * 2 >= ANALYSES.forecastWeeks);
    for (const run of [...plan.runs].sort((a, b) => shiftHours(b) - shiftHours(a))) {
      if (!place(plan, run, regular)) leftover.push({ plan, run, people });
    }
  }
  for (const { plan, run, people } of leftover) {
    if (!place(plan, run, people)) shifts.push({ day: plan.day, team: plan.team, ...run, staffId: null });
  }
  shifts.sort((a, b) => a.day.localeCompare(b.day) || a.team.localeCompare(b.team) || a.startHour - b.startHour);
  return { shifts, usualHours };
}

/** Heures en moins sur une semaine, un mois et une année qui ressembleraient à celle-ci. */
export function weekSavings(usualHours: number, draftHours: number) {
  const week = usualHours - draftHours;
  const year = week * ANALYSES.staffing.weeksPerYear;
  return { week, month: year / 12, year };
}

/** Les heures pointées la dernière semaine complète, du lundi au dimanche. Nul : aucune. */
export function lastWeekHours(data: StaffingData, to: string): number | null {
  const monday = addDays(nextMondayAfter(to), -14);
  const end = addDays(monday, 7);
  const rows = data.staff.filter((row) => row.day >= monday && row.day < end);
  return rows.length > 0 ? rows.reduce((sum, row) => sum + row.hours, 0) : null;
}

/** Le ratio du restaurant, ou la valeur par défaut de l'application. */
export const serverRatio = (data: StaffingData) =>
  data.settings?.orders_per_server_hour ?? ANALYSES.staffing.ordersPerServerHour;
