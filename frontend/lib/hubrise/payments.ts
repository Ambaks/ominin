import type { createAdminClient } from "@/lib/supabase/admin";
import { HUBRISE } from "./config";
import { HubriseError } from "./client";
import { callHubrise, type Connection } from "./connection";
import { money, parseMoney } from "./format";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Les règlements au comptoir, des deux côtés. Encaissée dans Ominin, une
 * commande porte ses jambes chez HubRise, marquées d'un private_ref
 * « ominin:<jambe> » : on les retrouve, on les remplace après une correction,
 * on ne les ajoute jamais deux fois. Encaissée à la caisse, ses règlements
 * (sans cette marque) reviennent dans Ominin, qui la dit réglée — et ne les
 * renvoie pas (order_payments.till_payment). Le pourboire laissé au comptoir
 * suit les jambes : une charge, et le règlement qui la couvre.
 */

/** Une jambe de règlement au comptoir encaissée dans Ominin. */
export interface CounterLeg {
  id: string;
  mode: "especes" | "carte";
  amount: number;
}

/** Un règlement tel que HubRise le rend. */
interface HubrisePayment {
  id: string;
  ref: string | null;
  amount: string;
  private_ref: string | null;
  deleted?: boolean;
}

/** Une charge telle que HubRise la rend. */
interface HubriseCharge {
  id: string;
  price: string;
  private_ref: string | null;
  deleted?: boolean;
}

/** Une jambe telle qu'Ominin la garde (order_payments). */
interface PaymentRow {
  id: string;
  mode: string;
  amount: number;
  till_payment: boolean;
}

const cents = (amount: number) => Math.round(amount * 100);

/**
 * Les jambes d'Ominin à porter chez HubRise : celles du comptoir, si elles
 * règlent toute la marchandise. HubRise veut des règlements égaux au total ;
 * réglée en partie (addition partagée), la commande y reste à régler.
 */
export function counterLegs<T extends PaymentRow>(payments: T[], goods: number): (T & CounterLeg)[] {
  const legs = payments.filter(
    (leg): leg is T & CounterLeg =>
      !leg.till_payment && (leg.mode === "especes" || leg.mode === "carte")
  );
  const paid = legs.reduce((total, leg) => total + leg.amount, 0);
  return cents(paid) >= cents(goods) ? legs : [];
}

/** Le pourboire n'est pas une ligne du registre : sa jambe porte cet id. */
const TIP_LEG_ID = "tip";

/**
 * Le pourboire laissé au comptoir (orders.tip_amount), en jambe : il ne part
 * qu'avec des jambes qui règlent la marchandise. L'encaissement fait couvrir
 * la marchandise aux espèces d'abord, la carte prend le reste — pourboire
 * compris dès qu'une jambe carte existe.
 */
export function counterTip(legs: CounterLeg[], tip: number | null): CounterLeg | null {
  if (!legs.length || !tip || cents(tip) <= 0) return null;
  return {
    id: TIP_LEG_ID,
    mode: legs.some((leg) => leg.mode === "carte") ? "carte" : "especes",
    amount: tip,
  };
}

const privateRef = (leg: CounterLeg) => `${HUBRISE.paymentPrivateRefPrefix}${leg.id}`;
const isOurs = (element: { private_ref: string | null }) =>
  element.private_ref?.startsWith(HUBRISE.paymentPrivateRefPrefix) ?? false;
const sum = (payments: HubrisePayment[]) =>
  payments.reduce((total, payment) => total + (parseMoney(payment.amount) ?? 0), 0);
const sameMoney = (a: string, b: string) => cents(parseMoney(a) ?? 0) === cents(parseMoney(b) ?? 0);

/**
 * La charge du pourboire. Laissé au comptoir, elle porte la marque d'Ominin
 * (la synchronisation des règlements la retrouve) ; en ligne, elle part
 * une fois avec la commande et n'est plus touchée.
 */
export function tipCharge(amount: number, connection: Connection, counter: boolean) {
  return {
    name: HUBRISE.labels.tip,
    price: money(amount),
    ...(connection.tip_charge_ref ? { ref: connection.tip_charge_ref } : {}),
    ...(counter ? { private_ref: `${HUBRISE.paymentPrivateRefPrefix}${TIP_LEG_ID}` } : {}),
  };
}

/** La jambe telle que la caisse la lit : son mode à elle, s'il est réglé. */
export function counterPayment(leg: CounterLeg, connection: Connection) {
  const cash = leg.mode === "especes";
  const ref = cash ? connection.payment_ref_cash : connection.payment_ref_card;
  return {
    name: cash ? HUBRISE.labels.cash : HUBRISE.labels.card,
    ...(ref ? { ref } : {}),
    amount: money(leg.amount),
    private_ref: privateRef(leg),
  };
}

async function remoteOrder(
  admin: Admin,
  connection: Connection,
  hubriseOrderId: string
): Promise<{ payments: HubrisePayment[]; charges: HubriseCharge[] }> {
  const order = await callHubrise<{ payments?: HubrisePayment[]; charges?: HubriseCharge[] }>(
    admin,
    connection,
    `/location/orders/${hubriseOrderId}`
  );
  return {
    payments: (order.payments ?? []).filter((payment) => !payment.deleted),
    charges: (order.charges ?? []).filter((charge) => !charge.deleted),
  };
}

/**
 * Ce qu'Ominin a porté chez HubRise face à ce qu'il veut y voir : HubRise ne
 * modifie pas un élément, il le retire et en ajoute un autre. Un même
 * private_ref au montant changé (pourboire d'un second règlement) est donc
 * retiré puis renvoyé.
 */
function reconcile<R extends { id: string; private_ref: string | null }, W extends { private_ref?: string }>(
  remote: R[],
  wanted: W[],
  same: (remote: R, wanted: W) => boolean
) {
  const ours = remote.filter(isOurs);
  return {
    stale: ours.filter((element) => !wanted.some((want) => same(element, want))),
    missing: wanted.filter((want) => !ours.some((element) => same(element, want))),
  };
}

/**
 * Aligne chez HubRise les règlements d'Ominin sur ses jambes, pourboire
 * compris : ajoute ce qui manque, retire ce qu'une correction a remplacé.
 * Rien n'est ajouté si la caisse a déjà encaissé la commande de son côté
 * (marchandise couverte) : elle serait réglée deux fois.
 */
export async function syncCounterPayments(
  admin: Admin,
  connection: Connection,
  hubriseOrderId: string,
  legs: CounterLeg[],
  goods: number,
  tip: number | null
): Promise<void> {
  const remote = await remoteOrder(admin, connection, hubriseOrderId);
  const tipLeg = counterTip(legs, tip);
  const payments = reconcile(
    remote.payments,
    (tipLeg ? [...legs, tipLeg] : legs).map((leg) => counterPayment(leg, connection)),
    (payment, want) => payment.private_ref === want.private_ref && sameMoney(payment.amount, want.amount)
  );
  const charges = reconcile(
    remote.charges,
    tipLeg ? [tipCharge(tipLeg.amount, connection, true)] : [],
    (charge, want) => charge.private_ref === want.private_ref && sameMoney(charge.price, want.price)
  );
  const tillPaid = cents(sum(remote.payments.filter((payment) => !isOurs(payment)))) >= cents(goods);
  const deletions = (elements: { id: string }[]) =>
    elements.map((element) => ({ id: element.id, deleted: true }));
  const patch = {
    payments: [...deletions(payments.stale), ...(tillPaid ? [] : payments.missing)],
    charges: [...deletions(charges.stale), ...(tillPaid ? [] : charges.missing)],
  };
  if (!patch.payments.length && !patch.charges.length) return;
  await callHubrise(admin, connection, `/location/orders/${hubriseOrderId}`, {
    method: "PATCH",
    body: JSON.stringify(
      Object.fromEntries(Object.entries(patch).filter(([, elements]) => elements.length))
    ),
  });
}

/**
 * Encaissée à la caisse : ses règlements (hors ceux d'Ominin) relus chez
 * HubRise ; s'ils couvrent la commande, Ominin la dit réglée
 * (hubrise_record_till_payment décide, et ne fait rien d'une commande déjà
 * réglée). Le mode espèces se reconnaît au code de la caisse ; tout autre
 * règlement compte pour la carte. Une relecture refusée (commande supprimée
 * chez HubRise, jeton révoqué) n'y changera rien au prochain essai : on
 * laisse la commande à régler plutôt que de faire rejouer le callback.
 * Renvoie true si la commande vient d'être réglée.
 */
export async function recordTillPayments(
  admin: Admin,
  connection: Connection,
  orderId: string,
  hubriseOrderId: string
): Promise<boolean> {
  let remote: HubrisePayment[];
  try {
    remote = (await remoteOrder(admin, connection, hubriseOrderId)).payments;
  } catch (error) {
    if (error instanceof HubriseError && error.status >= 400 && error.status < 500 && error.status !== 429) {
      console.error("[hubrise] règlements illisibles", { orderId, status: error.status });
      return false;
    }
    throw error;
  }
  const till = remote.filter((payment) => !isOurs(payment));
  if (!till.length) return false;
  const { data: settled, error } = await admin.rpc("hubrise_record_till_payment", {
    p_order: orderId,
    p_payments: till.map((payment) => ({
      amount: parseMoney(payment.amount) ?? 0,
      cash: connection.payment_ref_cash !== null && payment.ref === connection.payment_ref_cash,
    })),
  });
  if (error) throw new Error(error.message);
  return Boolean(settled);
}
