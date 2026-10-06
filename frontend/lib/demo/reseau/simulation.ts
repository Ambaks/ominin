import type { Hours, NetworkFixture, NetworkRestaurant, Product } from "./data";

/*
 * Simulation d'une journée du réseau, déterministe : un même jour donne
 * toujours les mêmes commandes, à la seconde près. Chaque restaurant tire ses
 * commandes minute par minute (Poisson) sur une courbe d'affluence — fond
 * d'ouverture, pointes du déjeuner et du dîner —, dimensionnée sur le CA
 * annoncé ; chaque client passe par QR selon la part choisie, les autres
 * commandent en caisse ou aux bornes (withoutQr). Le passe de la cuisine les
 * prend tous ; l'heure annoncée au client en découle, et la préparation réelle
 * s'en écarte d'un aléa. Les temps sont en secondes depuis minuit du jour de
 * service (au-delà de 24 h : la nuit suivante).
 */

export interface OrderLine {
  name: string;
  quantity: number;
}

export interface SimOrder {
  restaurant: number;
  /** Numéro du jour, celui qu'appelle le comptoir. */
  number: number;
  createdAt: number;
  paidAt: number;
  /** L'heure « prête vers » annoncée au client au règlement. */
  estimatedAt: number;
  readyAt: number;
  pickedAt: number;
  online: boolean;
  /** Centimes. */
  total: number;
  lines: OrderLine[];
}

interface TillQueue {
  arrivals: number[];
  ends: number[];
}

interface RestaurantDay {
  /** Plage d'ouverture ; null si le restaurant n'était pas encore ouvert ce jour-là. */
  hours: { open: number; close: number } | null;
  isNew: boolean;
  orders: SimOrder[];
  /** Clients venus sans téléphone (en caisse ou aux bornes) : leur heure d'arrivée. */
  walkIns: number[];
  /** Le passe après chaque arrivée en cuisine (commande par QR ou non), dans l'ordre d'arrivée. */
  pass: { at: number; freeAt: number; qr: boolean }[];
  /** Temps de passe d'une commande, en secondes. */
  passTime: number;
  /** La caisse, avec le QR puis sans (vide aux bornes) : arrivée et sortie de chaque client, dans l'ordre. */
  till: TillQueue;
  tillWithoutQr: TillQueue;
  /** Préparation d'une commande de deux articles dans ce restaurant, en minutes. */
  typicalPrep: number;
}

export interface SimDay {
  day: string;
  weekday: number;
  restaurants: RestaurantDay[];
  /** Toutes les commandes du réseau, par heure de création. */
  orders: SimOrder[];
}

export type QueueStatus = "a_regler" | "en_preparation" | "prete";

const DAY = 86_400;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 : générateur 32 bits, léger et reproductible. */
function random(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Partie fractionnaire du nombre d'or : une suite k·φ (mod 1) couvre [0, 1) régulièrement. */
const GOLDEN = (Math.sqrt(5) - 1) / 2;

const between = (rand: () => number, [min, max]: readonly [number, number]) =>
  min + (max - min) * rand();

function gaussian(rand: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

function poisson(rand: () => number, lambda: number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = rand();
  while (p > limit) {
    k++;
    p *= rand();
  }
  return k;
}

function pick<T extends { weight: number }>(rand: () => number, items: readonly T[]): T {
  let r = rand() * items.reduce((sum, item) => sum + item.weight, 0);
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

/** « HH:MM » → minutes depuis minuit. */
export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function dayIndex(day: string): number {
  return Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / (DAY * 1000);
}

export function addDays(day: string, delta: number): string {
  return new Date((dayIndex(day) + delta) * DAY * 1000).toISOString().slice(0, 10);
}

function weekdayOf(day: string): number {
  return (dayIndex(day) + 4) % 7;
}

/** Ouverture et fermeture d'un jour, en minutes ; la fermeture après minuit passe au-delà de 24 h. */
function hoursOn(restaurant: NetworkRestaurant, weekday: number): { open: number; close: number } {
  const [open, close]: Hours = restaurant.hoursByDay?.[weekday] ?? restaurant.hours;
  const o = minutesOf(open);
  const c = minutesOf(close);
  return { open: o, close: c <= o ? c + 1440 : c };
}

/** Panier moyen attendu du modèle, en centimes : dimensionne le nombre de commandes. */
function expectedTicket({ basket }: NetworkFixture): number {
  const mean = (items: readonly { product: Product; weight: number }[]) =>
    items.reduce((s, i) => s + i.product.price * i.weight, 0) /
    items.reduce((s, i) => s + i.weight, 0);
  const menus = basket.menus.reduce((s, m) => {
    const quantity =
      m.quantities.reduce((q, p, i) => q + p * (i + 1), 0) / m.quantities.reduce((q, p) => q + p, 0);
    return s + m.weight * m.product.price * quantity;
  }, 0);
  const alaCarte = basket.alaCarteWeight * mean(basket.alaCarte) * ((1 + basket.alaCarteMax) / 2);
  const totalWeight = basket.menus.reduce((s, m) => s + m.weight, 0) + basket.alaCarteWeight;
  const extras = basket.extraChances.reduce((s, c) => s + c, 0) * mean(basket.extras);
  return (menus + alaCarte) / totalWeight + extras;
}

function drawBasket(rand: () => number, { basket }: NetworkFixture): { lines: OrderLine[]; total: number } {
  const lines = new Map<string, OrderLine>();
  let total = 0;
  const add = ({ name, price }: Product) => {
    total += price;
    const line = lines.get(name);
    if (line) line.quantity++;
    else lines.set(name, { name, quantity: 1 });
  };
  const totalWeight = basket.menus.reduce((s, m) => s + m.weight, 0) + basket.alaCarteWeight;
  if (rand() * totalWeight < basket.alaCarteWeight) {
    const count = 1 + Math.floor(rand() * basket.alaCarteMax);
    for (let i = 0; i < count; i++) add(pick(rand, basket.alaCarte).product);
  } else {
    const menu = pick(rand, basket.menus);
    const quantity = pick(rand, menu.quantities.map((weight, i) => ({ weight, n: i + 1 }))).n;
    for (let i = 0; i < quantity; i++) add(menu.product);
  }
  for (const chance of basket.extraChances) {
    if (rand() < chance) add(pick(rand, basket.extras).product);
  }
  return { lines: [...lines.values()], total };
}

const itemCount = (lines: OrderLine[]) => lines.reduce((s, l) => s + l.quantity, 0);

function simulateRestaurant(
  fixture: NetworkFixture,
  index: number,
  day: string,
  weekday: number,
  ticket: number,
  adoption: number
): RestaurantDay {
  const restaurant = fixture.restaurants[index];
  const sim = fixture.simulation;
  const age = dayIndex(day) - dayIndex(restaurant.openedOn);
  if (age < 0) {
    const empty = { arrivals: [], ends: [] };
    return { hours: null, isNew: false, orders: [], walkIns: [], pass: [], passTime: 0, till: empty, tillWithoutQr: empty, typicalPrep: 0 };
  }

  // Traits stables du restaurant, puis l'aléa du jour.
  const traits = random(`${fixture.slug}|${restaurant.id}`);
  const share = adoption + sim.adoption.spread * (2 * traits() - 1);
  const onlineShare = between(traits, sim.onlineShare);
  const drawnLoad = between(traits, sim.kitchen.peakLoad);
  const prepSpeed = between(traits, sim.kitchen.prepSpeed);
  const rand = random(`${fixture.slug}|${restaurant.id}|${day}`);

  const { open, close } = hoursOn(restaurant, weekday);
  const { opening, kitchen } = sim;
  const buzz = 1 + opening.buzz * Math.exp(-age / opening.buzzDays);
  // Dans un restaurant récent, le QR gagne des clients peu à peu : sa part monte, pas la foule.
  const qrShare =
    share * (opening.adoptionStart + (1 - opening.adoptionStart) * Math.min(1, age / opening.adoptionDays));
  // Clients d'un jour ordinaire, tous canaux : le CA annoncé au panier attendu.
  const usual = ((sim.dailyRevenue * 100) / ticket) * restaurant.volume;
  const crowd = usual * sim.weekday[weekday] * buzz * Math.exp(sim.dailyNoise * gaussian(rand));

  const weights: number[] = [];
  for (let m = open; m < close; m++) {
    let w = sim.baseWeight / (close - open);
    for (const peak of sim.peaks) {
      const z = (m + 0.5 - minutesOf(peak.at)) / peak.sigmaMinutes;
      w += (peak.weight * Math.exp(-0.5 * z * z)) / (peak.sigmaMinutes * Math.sqrt(2 * Math.PI));
    }
    weights.push(w);
  }
  const weightSum = weights.reduce((s, w) => s + w, 0);

  const orders: SimOrder[] = [];
  const walkIns: number[] = [];
  // Le k-ième client du jour passe par QR si (départ + k·φ) mod 1 < part : la
  // part choisie tombe juste à une commande près dans chaque restaurant, et
  // les clients du QR à 10 % le restent à 30 et 50 %.
  const routeStart = traits();
  let arrived = 0;
  // Aléas de cuisine et de retrait de chaque commande, tirés avec elle.
  const drawn = new Map<SimOrder, { prepFactor: number; pickup: number }>();
  weights.forEach((w, i) => {
    const count = poisson(rand, (crowd * w) / weightSum);
    for (let k = 0; k < count; k++) {
      // Chaque client tire son propre sort : la part QR choisie ne fait que
      // le router, la foule du jour et ses paniers restent les mêmes.
      const client = random(`${fixture.slug}|${restaurant.id}|${day}|${i}|${k}`);
      const createdAt = (open + i) * 60 + Math.floor(client() * 60);
      if ((routeStart + arrived++ * GOLDEN) % 1 >= qrShare) {
        walkIns.push(createdAt);
        continue;
      }
      const { lines, total } = drawBasket(client, fixture);
      const online = client() < onlineShare;
      const order: SimOrder = {
        restaurant: index,
        number: 0,
        createdAt,
        paidAt: online ? createdAt : createdAt + Math.round(between(client, sim.counterPayMinutes) * 60),
        estimatedAt: 0,
        readyAt: 0,
        pickedAt: 0,
        online,
        total,
        lines,
      };
      orders.push(order);
      drawn.set(order, {
        prepFactor: Math.exp(kitchen.prepNoise * gaussian(client) - (kitchen.prepNoise * kitchen.prepNoise) / 2),
        pickup: between(client, sim.pickupMinutes),
      });
    }
  });
  orders.sort((a, b) => a.createdAt - b.createdAt);
  // Un seul carnet de numéros au comptoir : les clients sans téléphone en
  // prennent aussi, ceux du QR s'y intercalent.
  walkIns.sort((a, b) => a - b);
  orders.forEach((order, i) => (order.number = i + 1 + countUntil(walkIns, order.createdAt, arrival)));

  // La caisse : ceux qui ont commandé par QR sans payer en ligne y règlent
  // (paidAt, en attendant, porte leur arrivée au comptoir) ; en caisse, les
  // clients venus sans téléphone y commandent aussi. Sans QR, tous y seraient
  // passés : la même file, rejouée avec toutes les commandes. Aux bornes, ils
  // n'y passent pas.
  const atTill = sim.withoutQr === "caisse";
  const counterPaid = orders.filter((order) => !order.online).sort((a, b) => a.paidAt - b.paidAt);
  const arrivals = [
    ...(atTill ? walkIns.map((at) => ({ at, order: null })) : []),
    ...counterPaid.map((order) => ({ at: order.paidAt, order })),
  ].sort((a, b) => a.at - b.at);
  const tillTime = sim.tillMinutes * 60;
  const tillEnds = till(arrivals.map((a) => a.at), tillTime, sim.tills);
  arrivals.forEach((arrival, i) => {
    if (arrival.order) arrival.order.paidAt = tillEnds[i];
  });
  const withoutQr = atTill ? [...walkIns, ...orders.map((order) => order.createdAt)].sort((a, b) => a - b) : [];

  // Le passe, à `peakLoad` de sa capacité à la pointe, clients sans téléphone
  // compris : les commandes réglées en ligne y arrivent tout de suite, les
  // autres au sortir de la caisse ou de la borne.
  const { maturityDays } = kitchen;
  const peakLoad =
    maturityDays == null
      ? drawnLoad
      : kitchen.peakLoad[0] + (kitchen.peakLoad[1] - kitchen.peakLoad[0]) * Math.exp(-age / maturityDays);
  const sizedFor = maturityDays == null ? usual * sim.weekday[weekday] * buzz : usual * Math.max(...sim.weekday);
  const peakRate = (sizedFor * Math.max(...weights)) / weightSum;
  const passTime = Math.min(kitchen.passMaxMinutes, peakLoad / peakRate) * 60;
  const kitchenQueue = [
    ...orders.map((order) => ({ at: order.paidAt, order })),
    ...(atTill
      ? arrivals.flatMap((arrival, i) => (arrival.order ? [] : [{ at: tillEnds[i], order: null }]))
      : walkIns.map((at) => ({ at, order: null }))),
  ].sort((a, b) => a.at - b.at);
  const pass: RestaurantDay["pass"] = [];
  let free = open * 60;
  for (const { at, order } of kitchenQueue) {
    const start = Math.max(at, free);
    free = start + passTime;
    pass.push({ at, freeAt: free, qr: order != null });
    if (!order) continue;
    const { prepFactor, pickup } = drawn.get(order)!;
    const extra = itemCount(order.lines) - 1;
    const prep = (kitchen.prepMinutes + kitchen.prepPerItem * extra) * prepSpeed * 60;
    order.estimatedAt = Math.ceil((start + prep) / 60) * 60;
    order.readyAt = Math.round(start + prep * prepFactor);
    order.pickedAt = order.readyAt + Math.round(pickup * 60);
  }

  return {
    hours: { open, close },
    isNew: age < sim.newDays,
    orders,
    walkIns,
    pass,
    passTime,
    till: { arrivals: arrivals.map((a) => a.at), ends: tillEnds },
    tillWithoutQr: { arrivals: withoutQr, ends: till(withoutQr, tillTime, sim.tills) },
    typicalPrep: (kitchen.prepMinutes + kitchen.prepPerItem) * prepSpeed,
  };
}

/**
 * File en caisse, premier arrivé premier servi, sur `tills` caisses : l'heure
 * où chacun en sort, dans l'ordre d'arrivée (croissante : le service dure
 * toujours `service`).
 */
function till(arrivals: number[], service: number, tills: number): number[] {
  const free: number[] = Array(tills).fill(0);
  return arrivals.map((at) => {
    const k = free.indexOf(Math.min(...free));
    free[k] = Math.max(at, free[k]) + service;
    return free[k];
  });
}

// Par objet de données : une donnée modifiée (rechargée) ne relit pas une
// journée calculée sur l'ancienne.
const cache = new WeakMap<NetworkFixture, Map<string, SimDay>>();

/** La journée `day` du réseau, `adoption` de ses commandes passant par QR. */
export function simulateDay(fixture: NetworkFixture, day: string, adoption: number): SimDay {
  const days = cache.get(fixture) ?? new Map<string, SimDay>();
  cache.set(fixture, days);
  const key = `${day}|${adoption}`;
  const hit = days.get(key);
  if (hit) return hit;
  const weekday = weekdayOf(day);
  const ticket = expectedTicket(fixture);
  const restaurants = fixture.restaurants.map((_, i) =>
    simulateRestaurant(fixture, i, day, weekday, ticket, adoption)
  );
  const orders = restaurants.flatMap((r) => r.orders).sort((a, b) => a.createdAt - b.createdAt);
  const result = { day, weekday, restaurants, orders };
  days.set(key, result);
  return result;
}

/** Nombre d'éléments datés de `t` ou avant, dans une liste triée par date. */
function countUntil<T>(items: T[], t: number, at: (item: T) => number): number {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (at(items[mid]) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const created = (order: SimOrder) => order.createdAt;
const arrival = (time: number) => time;

/** Clients dans une file de caisse à `t` : arrivés, pas encore sortis. */
const inLine = (queue: TillQueue, t: number) =>
  countUntil(queue.arrivals, t, arrival) - countUntil(queue.ends, t, arrival);

function statusAt(order: SimOrder, t: number): QueueStatus | "remise" | null {
  if (t < order.createdAt) return null;
  if (t < order.paidAt) return "a_regler";
  if (t < order.readyAt) return "en_preparation";
  if (t < order.pickedAt) return "prete";
  return "remise";
}

export interface RestaurantSnapshot {
  index: number;
  open: boolean;
  /** Plage du jour, en minutes ; null avant l'ouverture du restaurant. */
  hours: { open: number; close: number } | null;
  isNew: boolean;
  orders: number;
  /** Clients venus commander au comptoir, sans téléphone. */
  walkIns: number;
  /** Centimes. */
  revenue: number;
  online: number;
  /** Attente annoncée à un client qui commanderait maintenant, à la minute. */
  waitNow: number | null;
  /** Clients en caisse (file et comptoir), avec le QR et sans. */
  tillLine: number;
  tillLineWithoutQr: number;
  /** Somme des attentes annoncées (s) et nombre de commandes réglées. */
  waitTotal: number;
  paid: number;
  /** Commandes prêtes, et celles prêtes dans la marge annoncée. */
  ready: number;
  onTime: number;
  recent: number;
  queue: Record<QueueStatus, number>;
  /** Commandes en cuisine, tous canaux confondus, et celles passées par QR. */
  kitchen: { total: number; qr: number };
  rush: boolean;
  last: SimOrder | null;
}

export function restaurantSnapshot(
  fixture: NetworkFixture,
  sim: SimDay,
  index: number,
  t: number
): RestaurantSnapshot {
  const day = sim.restaurants[index];
  const { simulation } = fixture;
  const open = day.hours != null && t >= day.hours.open * 60 && t < day.hours.close * 60;
  const count = countUntil(day.orders, t, created);
  const queue: Record<QueueStatus, number> = { a_regler: 0, en_preparation: 0, prete: 0 };
  const tolerance = simulation.estimateToleranceMinutes * 60;
  const since = t - simulation.recentMinutes * 60;
  let revenue = 0;
  let online = 0;
  let waitTotal = 0;
  let paid = 0;
  let ready = 0;
  let onTime = 0;
  let recent = 0;
  for (let i = 0; i < count; i++) {
    const order = day.orders[i];
    revenue += order.total;
    if (order.online) online++;
    if (order.createdAt > since) recent++;
    if (order.paidAt <= t) {
      paid++;
      waitTotal += order.estimatedAt - order.paidAt;
    }
    if (order.readyAt <= t) {
      ready++;
      if (Math.abs(order.readyAt - order.estimatedAt) <= tolerance) onTime++;
    }
    const status = statusAt(order, t);
    if (status && status !== "remise") queue[status]++;
  }

  let backlog = 0;
  const kitchen = { total: 0, qr: 0 };
  for (const entry of day.pass) {
    if (entry.at > t) break;
    backlog = entry.freeAt - t;
    // En cuisine jusqu'à sa préparation faite : prise au passe, puis préparée.
    if (entry.freeAt - day.passTime + day.typicalPrep * 60 > t) {
      kitchen.total++;
      if (entry.qr) kitchen.qr++;
    }
  }
  backlog = Math.max(0, backlog) / 60;
  const waitNow = open ? Math.round(backlog + day.typicalPrep) : null;

  return {
    index,
    open,
    hours: day.hours,
    isNew: day.isNew,
    orders: count,
    walkIns: countUntil(day.walkIns, t, arrival),
    revenue,
    online,
    waitNow,
    waitTotal,
    paid,
    ready,
    onTime,
    recent,
    queue,
    kitchen,
    tillLine: inLine(day.till, t),
    tillLineWithoutQr: inLine(day.tillWithoutQr, t),
    rush: waitNow != null && waitNow >= simulation.rush.waitMinutes,
    last: count > 0 ? day.orders[count - 1] : null,
  };
}

interface NetworkTotals {
  orders: number;
  walkIns: number;
  tillLine: number;
  tillLineWithoutQr: number;
  revenue: number;
  online: number;
  paid: number;
  waitTotal: number;
  ready: number;
  onTime: number;
  openCount: number;
  rushCount: number;
}

export function networkTotals(snapshots: RestaurantSnapshot[]): NetworkTotals {
  return snapshots.reduce<NetworkTotals>(
    (sum, s) => ({
      orders: sum.orders + s.orders,
      walkIns: sum.walkIns + s.walkIns,
      tillLine: sum.tillLine + s.tillLine,
      tillLineWithoutQr: sum.tillLineWithoutQr + s.tillLineWithoutQr,
      revenue: sum.revenue + s.revenue,
      online: sum.online + s.online,
      paid: sum.paid + s.paid,
      waitTotal: sum.waitTotal + s.waitTotal,
      ready: sum.ready + s.ready,
      onTime: sum.onTime + s.onTime,
      openCount: sum.openCount + (s.open ? 1 : 0),
      rushCount: sum.rushCount + (s.rush ? 1 : 0),
    }),
    { orders: 0, walkIns: 0, tillLine: 0, tillLineWithoutQr: 0, revenue: 0, online: 0, paid: 0, waitTotal: 0, ready: 0, onTime: 0, openCount: 0, rushCount: 0 }
  );
}

/** Les dernières commandes créées à `t` ou avant, la plus récente d'abord. */
export function latestOrders(sim: SimDay, t: number, count: number): SimOrder[] {
  const end = countUntil(sim.orders, t, created);
  return sim.orders.slice(Math.max(0, end - count), end).reverse();
}

/** Les commandes d'un restaurant encore au comptoir à `t`. */
export function queueAt(sim: SimDay, index: number, t: number) {
  const orders = sim.restaurants[index].orders;
  return orders
    .slice(0, countUntil(orders, t, created))
    .map((order) => ({ order, status: statusAt(order, t) }))
    .filter(
      (entry): entry is { order: SimOrder; status: QueueStatus } =>
        entry.status != null && entry.status !== "remise"
    );
}

/**
 * Fenêtre commune des courbes, à l'heure pleine : de la première ouverture à
 * la fermeture de `closingQuantile` des restaurants — les deux ou trois qui
 * servent jusqu'à 1 h ou 2 h n'étirent pas l'axe d'une traîne vide.
 */
export function activityWindow(sims: SimDay[], closingQuantile: number): { start: number; end: number } {
  const hours = sims.flatMap((sim) => sim.restaurants.flatMap((r) => (r.hours ? [r.hours] : [])));
  const closes = hours.map((h) => h.close).sort((a, b) => a - b);
  return {
    start: Math.floor(Math.min(...hours.map((h) => h.open)) / 60) * 3600,
    end: Math.ceil(closes[Math.ceil(closingQuantile * closes.length) - 1] / 60) * 3600,
  };
}

/**
 * Commandes des `bucket` dernières secondes, relevées tous les `step`, de
 * `start` à `until` ; le dernier point, s'il tombe entre deux relevés, compte
 * la fenêtre qui finit à `until` — la courbe s'arrête sur l'instant, et la
 * même journée revue plus tard repasse par ce point.
 */
export function activity(
  orders: SimOrder[],
  start: number,
  until: number,
  bucket: number,
  step: number
): { at: number; count: number }[] {
  if (until < start) return [];
  const points: { at: number; count: number }[] = [];
  const count = (to: number) => countUntil(orders, to, created) - countUntil(orders, to - bucket, created);
  for (let at = start; at <= until; at += step) points.push({ at, count: count(at) });
  if ((until - start) % step !== 0) points.push({ at: until, count: count(until) });
  return points;
}

/** Commandes QR prêtes et pas encore remises, sur tout le réseau, à la fin de chaque pas jusqu'à `until`. */
export function readyWaiting(sim: SimDay, start: number, until: number, bucket: number): number[] {
  const count = until < start ? 0 : Math.floor((until - start) / bucket) + 1;
  return Array.from({ length: count }, (_, i) => {
    const t = start + (i + 1) * bucket;
    return sim.orders.filter((order) => order.readyAt <= t && t < order.pickedAt).length;
  });
}

/** Délai moyen entre « prête » et la remise, en minutes, des commandes remises à `t` ; null s'il n'y en a pas. */
export function handoffMinutes(sim: SimDay, t: number): number | null {
  let sum = 0;
  let count = 0;
  for (const order of sim.orders) {
    if (order.createdAt > t) break;
    if (order.pickedAt > t) continue;
    sum += order.pickedAt - order.readyAt;
    count++;
  }
  return count ? sum / count / 60 : null;
}

/**
 * Attente moyenne en caisse (minutes, avant d'être servi) des clients
 * arrivés dans chaque pas, sur tout le réseau : avec le QR, et sans.
 */
export function tillWaits(
  sim: SimDay,
  start: number,
  until: number,
  bucket: number,
  service: number
): { withQr: number; withoutQr: number }[] {
  const count = until < start ? 0 : Math.floor((until - start) / bucket) + 1;
  const sums = Array.from({ length: count }, () => ({ withQr: [0, 0], withoutQr: [0, 0] }));
  for (const day of sim.restaurants) {
    for (const key of ["withQr", "withoutQr"] as const) {
      const queue = key === "withQr" ? day.till : day.tillWithoutQr;
      queue.arrivals.forEach((at, i) => {
        if (at < start || at > until) return;
        const cell = sums[Math.floor((at - start) / bucket)][key];
        cell[0] += queue.ends[i] - service - at;
        cell[1]++;
      });
    }
  }
  return sums.map(({ withQr, withoutQr }) => ({
    withQr: withQr[1] ? withQr[0] / withQr[1] / 60 : 0,
    withoutQr: withoutQr[1] ? withoutQr[0] / withoutQr[1] / 60 : 0,
  }));
}

/** Somme de `value` sur les commandes de chaque pas entier, de `start` jusqu'à `until`. */
export function bucketed(
  orders: SimOrder[],
  start: number,
  until: number,
  bucket: number,
  value: (order: SimOrder) => number
): number[] {
  const sums: number[] = [];
  for (const order of orders) {
    if (order.createdAt > until) break;
    if (order.createdAt < start) continue;
    const i = Math.floor((order.createdAt - start) / bucket);
    while (sums.length <= i) sums.push(0);
    sums[i] += value(order);
  }
  const count = until < start ? 0 : Math.floor((until - start) / bucket) + 1;
  while (sums.length < count) sums.push(0);
  return sums;
}

export interface Clock {
  day: string;
  seconds: number;
  /** Secondes simulées par seconde réelle ; 0 fige l'horloge. */
  speed: number;
  /** Suit l'heure de Paris (aucun paramètre) : bascule seule au jour suivant. */
  follow: boolean;
}

const PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Jour de service et secondes à Paris : avant `dayStartHour`, c'est encore la nuit de la veille. */
export function parisClock(now: Date, dayStartHour: number): { day: string; seconds: number } {
  const parts = Object.fromEntries(PARIS.formatToParts(now).map((p) => [p.type, p.value]));
  const seconds = +parts.hour * 3600 + +parts.minute * 60 + +parts.second;
  const day = `${parts.year}-${parts.month}-${parts.day}`;
  return seconds < dayStartHour * 3600
    ? { day: addDays(day, -1), seconds: seconds + DAY }
    : { day, seconds };
}

/**
 * ?heure=12:34 (ou 12h34, 12:34:56) fige le point de départ de l'horloge,
 * qui avance ensuite en temps réel : chaque chargement rejoue la même
 * séquence. ?vitesse=0 l'arrête, ?vitesse=60 fait défiler une heure par
 * minute. ?jour=AAAA-MM-JJ choisit la journée simulée — par défaut celle de
 * référence dès que l'heure est imposée, aujourd'hui sinon.
 */
export function resolveClock(
  fixture: NetworkFixture,
  params: { heure?: string; jour?: string; vitesse?: string },
  now: Date
): Clock {
  const { dayStartHour, referenceDay } = fixture.simulation;
  const live = parisClock(now, dayStartHour);
  const time = params.heure?.match(/^(\d{1,2})[:h](\d{2})(?::(\d{2}))?$/);
  const day =
    params.jour && /^\d{4}-\d{2}-\d{2}$/.test(params.jour) && !Number.isNaN(dayIndex(params.jour))
      ? params.jour
      : null;
  const speed = Number(params.vitesse);
  let seconds = live.seconds;
  if (time && +time[1] < 24 && +time[2] < 60) {
    seconds = +time[1] * 3600 + +time[2] * 60 + +(time[3] ?? 0);
    if (seconds < dayStartHour * 3600) seconds += DAY;
  }
  return {
    day: day ?? (time ? referenceDay : live.day),
    seconds,
    speed: Number.isFinite(speed) && speed >= 0 ? speed : 1,
    follow: !time && !day,
  };
}
