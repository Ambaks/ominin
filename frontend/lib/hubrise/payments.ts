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
 * renvoie pas (order_payments.till_payment).
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

const privateRef = (leg: CounterLeg) => `${HUBRISE.paymentPrivateRefPrefix}${leg.id}`;
const isOurs = (payment: HubrisePayment) =>
  payment.private_ref?.startsWith(HUBRISE.paymentPrivateRefPrefix) ?? false;
const sum = (payments: HubrisePayment[]) =>
  payments.reduce((total, payment) => total + (parseMoney(payment.amount) ?? 0), 0);

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

async function remotePayments(
  admin: Admin,
  connection: Connection,
  hubriseOrderId: string
): Promise<HubrisePayment[]> {
  const order = await callHubrise<{ payments?: HubrisePayment[] }>(
    admin,
    connection,
    `/location/orders/${hubriseOrderId}`
  );
  return (order.payments ?? []).filter((payment) => !payment.deleted);
}

/**
 * Aligne chez HubRise les règlements d'Ominin sur ses jambes : ajoute ceux qui
 * manquent, retire ceux qu'une correction a remplacés. Rien n'est ajouté si
 * la caisse a déjà encaissé la commande de son côté (total couvert) : elle
 * serait réglée deux fois.
 */
export async function syncCounterPayments(
  admin: Admin,
  connection: Connection,
  hubriseOrderId: string,
  legs: CounterLeg[],
  total: number
): Promise<void> {
  const remote = await remotePayments(admin, connection, hubriseOrderId);
  const ours = remote.filter(isOurs);
  const wanted = legs.map((leg) => counterPayment(leg, connection));
  const stale = ours.filter(
    (payment) => !wanted.some((want) => want.private_ref === payment.private_ref)
  );
  const missing = wanted.filter(
    (want) => !ours.some((payment) => payment.private_ref === want.private_ref)
  );
  const tillPaid = cents(sum(remote.filter((payment) => !isOurs(payment)))) >= cents(total);
  const additions = tillPaid ? [] : missing;
  if (!stale.length && !additions.length) return;
  await callHubrise(admin, connection, `/location/orders/${hubriseOrderId}`, {
    method: "PATCH",
    body: JSON.stringify({
      payments: [
        ...stale.map((payment) => ({ id: payment.id, deleted: true })),
        ...additions,
      ],
    }),
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
 */
export async function recordTillPayments(
  admin: Admin,
  connection: Connection,
  orderId: string,
  hubriseOrderId: string
): Promise<void> {
  let remote: HubrisePayment[];
  try {
    remote = await remotePayments(admin, connection, hubriseOrderId);
  } catch (error) {
    if (error instanceof HubriseError && error.status >= 400 && error.status < 500 && error.status !== 429) {
      console.error("[hubrise] règlements illisibles", { orderId, status: error.status });
      return;
    }
    throw error;
  }
  const till = remote.filter((payment) => !isOurs(payment));
  if (!till.length) return;
  const { error } = await admin.rpc("hubrise_record_till_payment", {
    p_order: orderId,
    p_payments: till.map((payment) => ({
      amount: parseMoney(payment.amount) ?? 0,
      cash: connection.payment_ref_cash !== null && payment.ref === connection.payment_ref_cash,
    })),
  });
  if (error) throw new Error(error.message);
}
