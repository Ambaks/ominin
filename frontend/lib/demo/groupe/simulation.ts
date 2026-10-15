import { addDays, between, DAY, gaussian, minutesOf, pick, random, remember, weekdayOf } from "@/lib/demo/sim";
import type { DrinkKind, GroupFixture, Kind, Moment, Venue } from "./data";

/*
 * Une journée simulée du groupe, déterministe : un même jour donne toujours
 * les mêmes tables et les mêmes commandes, à la seconde près. Chaque adresse
 * reçoit ses tables au fil de sa courbe d'affluence, en nombre calé sur son
 * CA ; chaque table commande par tournées ce que le moment appelle (le café
 * du matin, le plat du midi, la pinte de l'apéro), pris dans la vraie carte
 * de l'adresse. Une commande passe par le QR — réglée en ligne, ou encaissée
 * à la table par un serveur — ou est saisie par l'équipe et encaissée à la
 * table ; comme dans l'espace de gestion, son ticket ne part au bar ou en
 * cuisine qu'une fois réglée. Les temps sont en secondes depuis minuit du
 * jour de service (au-delà de 24 h : la nuit).
 */

export interface Product {
  id: string;
  name: string;
  /** Centimes. */
  price: number;
  weight: number;
}

/** Les articles d'un genre : ceux du midi (le menu du midi en plus), et ceux du reste du jour. */
export type Shelf = { lunch: Product[]; other: Product[] };
/** La carte d'une adresse rangée par genre (./catalog, côté serveur). */
export type Catalog = Partial<Record<Kind, Shelf>>;

/** Ce que la simulation d'une adresse reçoit du serveur : sa carte, et la recette d'une table qui dimensionne ses arrivées. */
export interface VenueInput {
  catalog: Catalog;
  tableRevenue: number;
}

export interface GroupLine {
  id: string;
  name: string;
  quantity: number;
  /** Prix unitaire, en centimes. */
  price: number;
}

export interface GroupOrder {
  venue: number;
  /** Le numéro du jour dans son adresse. */
  number: number;
  table: number;
  session: number;
  createdAt: number;
  /** Réglée : en ligne, ou encaissée à la table par un serveur. */
  paidAt: number;
  /** Le ticket part au bar ou en cuisine. */
  ticketAt: number;
  readyAt: number;
  servedAt: number;
  channel: "qr" | "equipe";
  online: boolean;
  /** Centimes. */
  total: number;
  lines: GroupLine[];
  /** Un plat dans la commande : elle passe par la cuisine. */
  kitchen: boolean;
}

interface Session {
  table: number;
  start: number;
  end: number;
}

interface Span {
  open: number;
  close: number;
}

export interface VenueDay {
  /** Ouverture et fermeture, en secondes. */
  open: number;
  close: number;
  kitchen: Span;
  happyHour: Span | null;
  orders: GroupOrder[];
  sessions: Session[];
  /** Affluence de chaque tranche depuis l'ouverture, rapportée à la plus forte (0 à 1). */
  load: number[];
}

export interface GroupDay {
  day: string;
  weekday: number;
  venues: VenueDay[];
  /** Toutes les commandes du groupe, par heure de création. */
  orders: GroupOrder[];
}

type Prep = keyof GroupFixture["timing"]["prepMinutes"];
/** Le poste qui prépare chaque genre : le bar, sauf les assiettes. */
const PREP: Partial<Record<Kind, Prep>> = { partage: "partage", plat: "plat", petitDej: "petitDej", dessert: "dessert" };
/** Ce qui ne sort que cuisine ouverte ; petit-déjeuner et dessert se servent toute la journée. */
const COOKED: readonly Kind[] = ["partage", "plat"];
const MOMENTS: readonly Moment[] = ["matin", "midi", "apresMidi", "apero", "diner", "nuit"];

/** Plage « HH:MM »–« HH:MM » en secondes ; une fin avant le début tombe la nuit suivante. */
export function span([from, to]: readonly [string, string]): Span {
  const open = minutesOf(from) * 60;
  const close = minutesOf(to) * 60;
  return { open, close: close <= open ? close + DAY : close };
}

function momentAt(fixture: GroupFixture, seconds: number): Moment {
  const minute = seconds / 60;
  if (minute >= 1440) return "nuit";
  let current: Moment = "matin";
  for (const moment of MOMENTS) if (minutesOf(fixture.moments[moment].from) <= minute) current = moment;
  return current;
}

/** Affluence d'une minute : le fond d'ouverture et les pointes du jour. */
function intensity(venue: Venue, minute: number): number {
  return venue.traffic.peaks.reduce(
    (sum, peak) => sum + peak.weight * Math.exp(-((minute - minutesOf(peak.at)) ** 2) / (2 * peak.sigma ** 2)),
    venue.traffic.base
  );
}

interface Hours extends Span {
  kitchen: Span;
}

const hoursOf = (venue: Venue): Hours => ({ ...span(venue.hours), kitchen: span(venue.kitchen) });

/**
 * Les arrivées de `count` tables, réparties sur la courbe d'affluence par
 * quantiles légèrement décalés : la journée garde sa forme sans le bruit d'un
 * tirage au sort minute par minute, qui faisait varier la même heure de ±40 %
 * d'une semaine à l'autre. Plus aucune arrivée avant la fermeture.
 */
function drawArrivals(fixture: GroupFixture, venue: Venue, hours: Span, count: number, rand: () => number): number[] {
  const first = hours.open / 60;
  const last = hours.close / 60 - fixture.timing.lastArrivalMinutes;
  const cumulative: number[] = [];
  let sum = 0;
  for (let m = first; m < last; m++) cumulative.push((sum += intensity(venue, m)));
  const arrivals: number[] = [];
  let m = 0;
  for (let k = 0; k < count; k++) {
    const target = ((k + rand()) / count) * sum;
    while (cumulative[m] < target) m++;
    arrivals.push((first + m) * 60 + Math.floor(rand() * 60));
  }
  return arrivals.sort((a, b) => a - b);
}

/** Les tables d'une journée, servies tournée par tournée. */
function serveTables(
  fixture: GroupFixture,
  venue: Venue,
  catalog: Catalog,
  index: number,
  hours: Hours,
  arrivals: number[],
  tables: number,
  rand: () => number
): { orders: GroupOrder[]; sessions: Session[] } {
  const { timing } = fixture;
  const peak = Math.max(...Array.from({ length: (hours.close - hours.open) / 60 }, (_, m) => intensity(venue, hours.open / 60 + m)));
  const load = (t: number) => intensity(venue, t / 60) / peak;
  const kitchenOpen = (t: number) => t >= hours.kitchen.open && t < hours.kitchen.close;
  const lastCall = hours.close - timing.lastCallMinutes * 60;
  const freeAt = new Array<number>(tables).fill(0);
  const orders: GroupOrder[] = [];
  const sessions: Session[] = [];

  const product = (kind: Kind, t: number) => {
    const shelf = catalog[kind];
    if (!shelf) return null;
    const list = momentAt(fixture, t) === "midi" ? shelf.lunch : shelf.other;
    return list.length ? pick(rand, list) : null;
  };

  for (const start of arrivals) {
    const free = freeAt.flatMap((at, table) => (at <= start ? [table] : []));
    if (!free.length) continue;
    const table = free[Math.floor(rand() * free.length)];
    const guests = pick(rand, fixture.partySizes.map((weight, i) => ({ weight, size: i + 1 }))).size;
    const rules = fixture.moments[momentAt(fixture, start)];
    const rounds = Math.floor(between(rand, [rules.rounds[0], rules.rounds[1] + 1]));
    const qr = rand() < venue.qrShare;
    const session = sessions.length;
    const placed: GroupOrder[] = [];
    let t = start + between(rand, timing.firstOrderMinutes) * 60;
    let hadMeal = false;

    for (let round = 0; round < rounds && t < lastCall; round++) {
      const lines = new Map<string, GroupLine>();
      let total = 0;
      let longest: Prep = "bar";
      const kitchen = kitchenOpen(t);
      const add = (kind: Kind, item: Product | null, quantity = 1) => {
        if (!item || (COOKED.includes(kind) && !kitchen)) return;
        total += item.price * quantity;
        const line = lines.get(item.id);
        if (line) line.quantity += quantity;
        else lines.set(item.id, { id: item.id, name: item.name, quantity, price: item.price });
        const prep = PREP[kind];
        if (prep && timing.prepMinutes[prep][1] > timing.prepMinutes[longest][1]) longest = prep;
      };
      const drinks = (Object.entries(rules.drinks) as [DrinkKind, number][]).filter(([kind]) => catalog[kind]);
      const drink = () => (drinks.length ? pick(rand, drinks.map(([kind, weight]) => ({ kind, weight }))).kind : null);
      let bottle: Product | null = null;
      let bottleGuests = 0;
      const pour = (kind: DrinkKind | null) => {
        if (!kind) return;
        const item = product(kind, t);
        if (kind === "vin" && item && item.price > fixture.bottle.above * 100) {
          bottle ??= item;
          bottleGuests++;
        } else add(kind, item);
      };

      if (round === 0) {
        for (let g = 0; g < guests; g++) {
          pour(drink());
          if (rules.food && rand() < rules.food.chance) {
            if (catalog[rules.food.kind]) {
              add(rules.food.kind, product(rules.food.kind, t));
              if (rules.food.kind === "plat" && kitchen) hadMeal = true;
            } else if (rules.food.kind === "plat" && rand() < fixture.shareInsteadOfPlat) {
              add("partage", product("partage", t));
            }
          }
        }
        if (rules.share && rand() < rules.share) add("partage", product("partage", t));
      } else if (hadMeal && rules.afterMeal) {
        for (let g = 0; g < guests; g++) {
          if (rand() < rules.afterMeal.dessert) add("dessert", product("dessert", t));
          if (rand() < rules.afterMeal.cafe) add("cafe", product("cafe", t));
        }
        hadMeal = false;
      } else {
        for (let g = 0; g < guests; g++) if (rand() < rules.again) pour(drink());
        if (rules.share && rand() < rules.share) add("partage", product("partage", t));
      }
      if (bottle) add("vin", bottle, Math.ceil(bottleGuests / fixture.bottle.perGuests));
      if (!lines.size) break;

      const online = qr && rand() < venue.onlineShare;
      const paidAt = online
        ? t + between(rand, timing.onlinePaySeconds)
        : t + between(rand, qr ? timing.counterPayMinutes : timing.staffPayMinutes) * 60;
      const ticketAt = paidAt + between(rand, timing.ticketSeconds);
      const slowdown = 1 + timing.rushSlowdown * load(ticketAt);
      // Une commande sur quelques-unes traîne (un fût à changer, un plat renvoyé) : l'aléa est log-normal.
      const drift = Math.exp(timing.prepNoise * gaussian(rand));
      const readyAt = ticketAt + between(rand, timing.prepMinutes[longest]) * 60 * slowdown * drift;
      const servedAt = readyAt + between(rand, timing.serveMinutes) * 60 * slowdown;
      placed.push({
        venue: index,
        number: 0,
        table: table + 1,
        session,
        createdAt: Math.round(t),
        paidAt: Math.round(paidAt),
        ticketAt: Math.round(ticketAt),
        readyAt: Math.round(readyAt),
        servedAt: Math.round(servedAt),
        channel: qr ? "qr" : "equipe",
        online,
        total,
        lines: [...lines.values()],
        // Cuisine fermée, un petit-déjeuner ou un dessert se prépare au bar.
        kitchen: COOKED.includes(longest as Kind) || (kitchen && (longest as Prep) !== "bar"),
      });
      t = servedAt + between(rand, rules.gapMinutes) * 60;
    }
    if (!placed.length) continue;
    const end = Math.round(Math.min(hours.close, placed[placed.length - 1].servedAt + between(rand, timing.lingerMinutes) * 60));
    orders.push(...placed);
    freeAt[table] = end;
    sessions.push({ table: table + 1, start: Math.round(start), end });
  }
  orders.sort((a, b) => a.createdAt - b.createdAt);
  orders.forEach((order, i) => (order.number = i + 1));
  return { orders, sessions };
}

/**
 * Recette moyenne d'une arrivée — une table qui s'assoit, qu'elle commande
 * ou non —, mesurée sur une journée étalon dans une salle sans limite (ce
 * que dépense une table, pas la place qu'il reste) : elle dimensionne les
 * arrivées. Calculée côté serveur, une fois par carte (./catalog).
 */
export function tableRevenueOf(fixture: GroupFixture, venue: Venue, catalog: Catalog): number {
  const rand = random(`${fixture.slug}:${venue.slug}:etalon`);
  const hours = hoursOf(venue);
  const count = fixture.calibrationTables;
  const arrivals = drawArrivals(fixture, venue, hours, count, rand);
  const { orders } = serveTables(fixture, venue, catalog, 0, hours, arrivals, count, rand);
  return orders.reduce((s, o) => s + o.total, 0) / arrivals.length;
}

function simulateVenue(fixture: GroupFixture, venue: Venue, input: VenueInput, index: number, day: string, weekday: number): VenueDay {
  const rand = random(`${fixture.slug}:${venue.slug}:${day}`);
  const hours = hoursOf(venue);
  const noise = Math.exp(fixture.dailyNoise * gaussian(rand) - fixture.dailyNoise ** 2 / 2);
  const meanWeekday = fixture.weekday.reduce((sum, w) => sum + w, 0) / 7;
  const daily = (venue.revenue.annualHT * (1 + fixture.vatAverage) * 100) / 365;
  const count = Math.round((daily * (fixture.weekday[weekday] / meanWeekday) * noise) / input.tableRevenue);
  const arrivals = drawArrivals(fixture, venue, hours, count, rand);
  const { orders, sessions } = serveTables(fixture, venue, input.catalog, index, hours, arrivals, venue.tables, rand);
  const slot = fixture.display.bucketMinutes * 60;
  const raw = Array.from({ length: Math.ceil((hours.close - hours.open) / slot) }, (_, i) =>
    intensity(venue, (hours.open + (i + 0.5) * slot) / 60)
  );
  const top = Math.max(...raw);
  return {
    open: hours.open,
    close: hours.close,
    kitchen: hours.kitchen,
    happyHour: venue.happyHour ? span(venue.happyHour) : null,
    orders,
    sessions,
    load: raw.map((v) => v / top),
  };
}

/**
 * Les journées déjà simulées, par cartes : bornées à ce qu'une vue lit (la
 * période, celle d'avant, aujourd'hui et la semaine dernière), la moins
 * récemment lue sortant la première — une page publique ne remplit pas la
 * mémoire du serveur jour après jour. Le cache suit les objets du groupe et
 * de ses cartes : relus (rechargement à chaud), ils repartent de zéro.
 */
const simulated = new WeakMap<VenueInput[], Map<string, GroupDay>>();

export function simulateDay(fixture: GroupFixture, inputs: VenueInput[], day: string): GroupDay {
  let days = simulated.get(inputs);
  if (!days) simulated.set(inputs, (days = new Map()));
  return remember(days, day, 2 * fixture.display.periodDays + 2, () => {
    const weekday = weekdayOf(day);
    const venues = fixture.venues.map((venue, i) => simulateVenue(fixture, venue, inputs[i], i, day, weekday));
    return {
      day,
      weekday,
      venues,
      orders: venues.flatMap((v) => v.orders).sort((a, b) => a.createdAt - b.createdAt),
    };
  });
}

/** Le paiement en ligne en cours ; à encaisser par un serveur ; au bar ou en cuisine ; prête ; servie. */
export type OrderStatus = "paiement" | "a_encaisser" | "en_preparation" | "a_servir" | "servie";

/** Où en est une commande à `t` ; null si elle n'est pas encore passée. */
export function statusAt(order: GroupOrder, t: number): OrderStatus | null {
  if (order.createdAt > t) return null;
  if (t < order.paidAt) return order.online ? "paiement" : "a_encaisser";
  if (t < order.readyAt) return "en_preparation";
  if (t < order.servedAt) return "a_servir";
  return "servie";
}

/** Depuis combien de secondes une commande non servie attend son service, son ticket parti ; null sinon. */
export function waitingSince(order: GroupOrder, t: number): number | null {
  const status = statusAt(order, t);
  return (status === "en_preparation" || status === "a_servir") && t >= order.ticketAt ? t - order.ticketAt : null;
}

export function isLate(fixture: GroupFixture, order: GroupOrder, t: number): boolean {
  const waited = waitingSince(order, t);
  return waited != null && waited > (order.kitchen ? fixture.lateMinutes.cuisine : fixture.lateMinutes.bar) * 60;
}

/** Une commande à encaisser depuis plus de `paymentWaitMinutes` : son ticket n'est pas parti. */
function isStuck(fixture: GroupFixture, order: GroupOrder, t: number): boolean {
  return statusAt(order, t) === "a_encaisser" && t - order.createdAt > fixture.paymentWaitMinutes * 60;
}

/**
 * Du ticket au service, en minutes, des commandes servies dans les `window`
 * dernières secondes : boissons seules, et avec un plat ; null sans commande.
 */
export function serviceAverages(orders: GroupOrder[], t: number, window: number): { bar: number | null; kitchen: number | null } {
  const sums = { bar: [0, 0], kitchen: [0, 0] };
  for (const order of orders) {
    if (order.createdAt > t) break;
    if (order.servedAt > t || t - order.servedAt >= window) continue;
    const cell = order.kitchen ? sums.kitchen : sums.bar;
    cell[0] += order.servedAt - order.ticketAt;
    cell[1]++;
  }
  const average = ([sum, count]: number[]) => (count ? sum / count / 60 : null);
  return { bar: average(sums.bar), kitchen: average(sums.kitchen) };
}

/** Le CA réglé (centimes) à `t`. */
export const revenueAt = (orders: GroupOrder[], t: number) => orders.reduce((s, o) => (o.paidAt <= t ? s + o.total : s), 0);

export interface VenueSnapshot {
  open: boolean;
  kitchenOpen: boolean;
  happyHour: boolean;
  /** Centimes encaissés depuis l'ouverture. */
  revenue: number;
  orders: number;
  qrOrders: number;
  onlineOrders: number;
  /** Tables occupées : de l'arrivée au départ. */
  occupiedTables: number;
  /** À encaisser par un serveur, ticket pas encore parti : le montant, et l'heure de la plus ancienne ; null sans. */
  toCollect: number;
  oldestToCollect: number | null;
  /** À encaisser, au bar, en cuisine, prêtes à servir. */
  awaitingPayment: number;
  bar: number;
  cuisine: number;
  toServe: number;
  /** Les commandes en retard, et celles qui attendent d'être encaissées depuis trop longtemps, de la plus ancienne à la plus récente. */
  late: GroupOrder[];
  stuck: GroupOrder[];
  serviceBar: number | null;
  serviceKitchen: number | null;
  /** Les articles qui ont rapporté le plus depuis l'ouverture. */
  top: { id: string; name: string; quantity: number; revenue: number }[];
  /** Équipe pointée, et heures travaillées depuis l'ouverture. */
  staff: number;
  staffHours: number;
  lastOrderAt: number | null;
}

export function venueSnapshot(fixture: GroupFixture, venueDay: VenueDay, venue: Venue, t: number): VenueSnapshot {
  const { display } = fixture;
  const snap: VenueSnapshot = {
    open: t >= venueDay.open && t < venueDay.close,
    kitchenOpen: t >= venueDay.kitchen.open && t < venueDay.kitchen.close,
    happyHour: venueDay.happyHour != null && t >= venueDay.happyHour.open && t < venueDay.happyHour.close,
    revenue: 0,
    orders: 0,
    qrOrders: 0,
    onlineOrders: 0,
    occupiedTables: venueDay.sessions.filter((s) => s.start <= t && t < s.end).length,
    toCollect: 0,
    oldestToCollect: null,
    awaitingPayment: 0,
    bar: 0,
    cuisine: 0,
    toServe: 0,
    late: [],
    stuck: [],
    serviceBar: null,
    serviceKitchen: null,
    top: [],
    staff: 0,
    staffHours: 0,
    lastOrderAt: null,
  };
  const sold = new Map<string, { id: string; name: string; quantity: number; revenue: number }>();

  for (const order of venueDay.orders) {
    if (order.createdAt > t) break;
    snap.orders++;
    snap.lastOrderAt = order.createdAt;
    if (order.channel === "qr") snap.qrOrders++;
    if (order.online) snap.onlineOrders++;
    if (order.paidAt <= t) snap.revenue += order.total;
    for (const line of order.lines) {
      const item = sold.get(line.id) ?? { id: line.id, name: line.name, quantity: 0, revenue: 0 };
      item.quantity += line.quantity;
      item.revenue += line.quantity * line.price;
      sold.set(line.id, item);
    }
    const status = statusAt(order, t);
    if (status === "a_encaisser") {
      snap.awaitingPayment++;
      snap.toCollect += order.total;
      snap.oldestToCollect ??= order.createdAt;
    } else if (status === "en_preparation") {
      if (order.kitchen) snap.cuisine++;
      else snap.bar++;
    } else if (status === "a_servir") snap.toServe++;
    if (isLate(fixture, order, t)) snap.late.push(order);
    if (isStuck(fixture, order, t)) snap.stuck.push(order);
  }
  const service = serviceAverages(venueDay.orders, t, display.serviceWindowMinutes * 60);
  snap.serviceBar = service.bar;
  snap.serviceKitchen = service.kitchen;
  snap.top = [...sold.values()]
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, "fr"))
    .slice(0, display.topItems);

  // L'équipe suit l'affluence de chaque tranche : le fond, et des renforts au plus fort.
  const slot = display.bucketMinutes * 60;
  const staffAt = (i: number) => venue.staff[0] + Math.round(venue.staff[1] * venueDay.load[i]);
  const until = Math.min(t, venueDay.close);
  for (let i = 0; venueDay.open + i * slot < until; i++) {
    const from = venueDay.open + i * slot;
    snap.staffHours += (staffAt(i) * (Math.min(until, from + slot) - from)) / 3600;
  }
  if (snap.open) snap.staff = staffAt(Math.floor((t - venueDay.open) / slot));
  return snap;
}

/**
 * L'encaissé cumulé à chaque borne de tranche, de `start` à `until`, puis à
 * `until` lui-même : une courbe qui ne redescend jamais, et dont le dernier
 * point est l'instant — pas une tranche à moitié écoulée.
 */
export function cumulative(orders: GroupOrder[], start: number, until: number, bucket: number): number[] {
  if (until < start) return [];
  const points: number[] = [];
  for (let at = start; at <= until; at += bucket) points.push(revenueAt(orders, at));
  if ((until - start) % bucket !== 0) points.push(revenueAt(orders, until));
  return points;
}

/** La semaine dernière avait-elle, à cette heure, assez encaissé pour qu'un pourcentage ou une estimation veuille dire quelque chose ? */
export function comparable(fixture: GroupFixture, lastWeek: GroupOrder[], t: number): boolean {
  const lastFull = lastWeek.reduce((s, o) => s + o.total, 0);
  return lastFull > 0 && revenueAt(lastWeek, t) >= fixture.display.projectionFrom * lastFull;
}

/**
 * La fin de journée au rythme de la semaine dernière, en euros arrondis à
 * `projectionRoundEuros` : l'encaissé de maintenant multiplié par ce que la
 * semaine dernière a fait en tout sur ce qu'elle avait fait à cette heure ;
 * null tant que la comparaison ne veut rien dire.
 */
export function projection(fixture: GroupFixture, today: GroupOrder[], lastWeek: GroupOrder[], t: number): number | null {
  if (!comparable(fixture, lastWeek, t)) return null;
  const lastFull = lastWeek.reduce((s, o) => s + o.total, 0);
  const euros = (revenueAt(today, t) * lastFull) / revenueAt(lastWeek, t) / 100;
  const step = fixture.display.projectionRoundEuros;
  return Math.round(euros / step) * step;
}

/** Ventes de chaque tranche (à l'heure de la commande), adresse par adresse : stacks[tranche][adresse]. */
export function salesBuckets(day: GroupDay, start: number, until: number, bucket: number): number[][] {
  const count = Math.max(0, Math.floor((until - start) / bucket) + 1);
  const stacks = Array.from({ length: count }, () => new Array<number>(day.venues.length).fill(0));
  for (const order of day.orders) {
    if (order.createdAt > until) break;
    if (order.createdAt < start) continue;
    stacks[Math.floor((order.createdAt - start) / bucket)][order.venue] += order.total;
  }
  return stacks;
}

export function latestOrders(day: GroupDay, t: number, count: number): GroupOrder[] {
  const result: GroupOrder[] = [];
  for (let i = day.orders.length - 1; i >= 0 && result.length < count; i--) {
    if (day.orders[i].createdAt <= t) result.push(day.orders[i]);
  }
  return result;
}

export interface PeriodVenue {
  revenue: number;
  tables: number;
  averageBill: number;
  onlineShare: number;
  /** Du ticket au service, en minutes : boissons seules, et avec un plat. */
  serviceBar: number;
  serviceKitchen: number;
  /** CA de chaque jour, du plus ancien au plus récent. */
  daily: number[];
  /** CA moyen de chaque heure de la journée de service, commandes rangées à l'heure où elles sont passées ; la première commence à `dayStartHour`. */
  hourly: number[];
  /** Le même total sur la période d'avant, pour la tendance. */
  previous: number;
}

export interface Period {
  days: string[];
  venues: PeriodVenue[];
}

/** Bilan des `count` jours de service avant `day` (exclu), adresse par adresse, et la période d'avant. */
export function periodSummary(fixture: GroupFixture, inputs: VenueInput[], day: string, count: number): Period {
  const days = Array.from({ length: count }, (_, i) => addDays(day, i - count));
  const sims = days.map((d) => simulateDay(fixture, inputs, d));
  const previousSims = Array.from({ length: count }, (_, i) => simulateDay(fixture, inputs, addDays(day, i - 2 * count)));
  const venues = fixture.venues.map((_, v) => {
    let revenue = 0;
    let orders = 0;
    let tables = 0;
    let online = 0;
    const service = { bar: [0, 0], kitchen: [0, 0] };
    const hourly = new Array<number>(24).fill(0);
    const daily = sims.map((sim) => {
      const venueDay = sim.venues[v];
      const total = venueDay.orders.reduce((s, o) => s + o.total, 0);
      revenue += total;
      orders += venueDay.orders.length;
      tables += venueDay.sessions.length;
      for (const order of venueDay.orders) {
        if (order.online) online++;
        const cell = order.kitchen ? service.kitchen : service.bar;
        cell[0] += order.servedAt - order.ticketAt;
        cell[1]++;
        hourly[Math.floor(order.createdAt / 3600) - fixture.dayStartHour] += order.total / count;
      }
      return total;
    });
    const previous = previousSims.reduce((s, sim) => s + sim.venues[v].orders.reduce((t, o) => t + o.total, 0), 0);
    return {
      revenue,
      tables,
      averageBill: tables ? revenue / tables : 0,
      onlineShare: orders ? online / orders : 0,
      serviceBar: service.bar[1] ? service.bar[0] / service.bar[1] / 60 : 0,
      serviceKitchen: service.kitchen[1] ? service.kitchen[0] / service.kitchen[1] / 60 : 0,
      daily,
      hourly,
      previous,
    };
  });
  return { days, venues };
}
