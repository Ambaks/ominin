import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CALL_THROTTLE_MS,
  ROLE_DEFAULT_PREFS,
  STATUS_PUSH_EVENT,
  type PushEvent,
  type PushPayload,
} from "./events";

/*
 * Cœur de l'envoi des notifications push (service_role + web-push). Appelé
 * par la route publique /api/push/dispatch et directement par le webhook
 * Stripe qui crée les commandes click & collect. Idempotent : push_notified
 * garantit au plus un envoi par (commande, événement), ce qui rend la route
 * publique inoffensive — rejouer une requête n'envoie rien de plus.
 */

/**
 * Fenêtre d'acceptation d'un événement « nouvelle commande » après création.
 * Au-delà, l'envoi est refusé : borne le rejeu tardif sur la route publique.
 */
const NOUVELLE_COMMANDE_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * Durée de rétention par le service push si l'appareil est injoignable (s).
 * Un événement de service n'a plus d'intérêt une heure plus tard.
 */
const PUSH_TTL_S = 3600;

/** Les horaires en notification s'affichent à l'heure du restaurant. */
const RESTAURANT_TIMEZONE = "Europe/Paris";

const pickupTime = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: RESTAURANT_TIMEZONE,
});

const EVENT_TITLES: Record<PushEvent, string> = {
  nouvelle_commande: "Nouvelle commande",
  commande_prete: "Commande prête",
  commande_annulee: "Commande annulée",
  appel_serveur: "Appel serveur",
};

interface OrderContext {
  id: string;
  etablissement_id: string;
  type: "sur_place" | "collect";
  status: string;
  created_at: string;
  customer_name: string | null;
  pickup_at: string | null;
  tables: { number: number } | null;
  order_items: { quantity: number }[];
}

function composeBody(order: OrderContext): string {
  const count = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const articles = `${count} article${count > 1 ? "s" : ""}`;
  if (order.type === "sur_place") {
    const table = order.tables ? `Table ${order.tables.number}` : "Sur place";
    return `${table} · ${articles}`;
  }
  const retrait = order.pickup_at
    ? `retrait ${pickupTime.format(new Date(order.pickup_at))}`
    : "dès que possible";
  const client = order.customer_name ? ` — ${order.customer_name}` : "";
  return `À emporter${client} · ${articles} · ${retrait}`;
}

/**
 * Envoie l'événement aux appareils abonnés de l'établissement, selon les
 * préférences de chaque membre (défauts du rôle sinon). Sans effet si la
 * clé VAPID n'est pas configurée, si l'événement ne correspond pas au statut
 * réel de la commande, ou s'il a déjà été notifié. `skipUserId` écarte
 * l'auteur de l'action (inutile de sonner le cuisinier qui vient d'appuyer
 * sur « Marquer prête »).
 */
export async function dispatchOrderEvent(
  orderId: string,
  event: PushEvent,
  options?: { skipUserId?: string }
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;

  const db = createAdminClient();

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      "id, etablissement_id, type, status, created_at, customer_name, pickup_at, tables (number), order_items (quantity)"
    )
    .eq("id", orderId)
    .maybeSingle<OrderContext>();
  if (!order) {
    console.error("[push] order not found", { orderId, orderError });
    return;
  }

  // Cohérence événement ↔ statut : la route est publique, seul l'état réel
  // de la commande fait foi. Un événement « nouvelle commande » trop vieux
  // est un rejeu, pas un service à rendre.
  if (STATUS_PUSH_EVENT[order.status as keyof typeof STATUS_PUSH_EVENT] !== event) {
    console.error("[push] status mismatch", { status: order.status, event });
    return;
  }
  if (
    event === "nouvelle_commande" &&
    Date.now() - new Date(order.created_at).getTime() > NOUVELLE_COMMANDE_MAX_AGE_MS
  ) {
    console.error("[push] order too old", { created_at: order.created_at });
    return;
  }

  // Verrou d'idempotence : le premier insert gagne, les suivants s'arrêtent là.
  const { data: claimed, error: claimError } = await db
    .from("push_notified")
    .upsert(
      { order_id: order.id, event },
      { onConflict: "order_id,event", ignoreDuplicates: true }
    )
    .select();
  if (claimError || !claimed?.length) {
    console.error("[push] dedupe claim failed", { claimError, claimed });
    return;
  }

  const [subsResult, membResult, prefsResult] = await Promise.all([
    db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("etablissement_id", order.etablissement_id),
    db
      .from("memberships")
      .select("user_id, role")
      .eq("etablissement_id", order.etablissement_id),
    db
      .from("notification_prefs")
      .select(
        "user_id, nouvelle_commande, commande_prete, commande_annulee, appel_serveur"
      )
      .eq("etablissement_id", order.etablissement_id),
  ]);
  if (subsResult.error || membResult.error || prefsResult.error) {
    console.error("[push] recipient query error", {
      subs: subsResult.error,
      memb: membResult.error,
      prefs: prefsResult.error,
    });
    await db
      .from("push_notified")
      .delete()
      .eq("order_id", order.id)
      .eq("event", event);
    return;
  }
  const { data: subscriptions } = subsResult;
  const { data: memberships } = membResult;
  const { data: prefs } = prefsResult;
  if (!subscriptions.length) {
    console.error("[push] no subscriptions", { etablissement_id: order.etablissement_id });
    return;
  }

  const roleByUser = new Map(memberships?.map((m) => [m.user_id, m.role]));
  const prefsByUser = new Map(prefs?.map((p) => [p.user_id, p]));
  const recipients = subscriptions.filter((sub) => {
    if (sub.user_id === options?.skipUserId) return false;
    const role = roleByUser.get(sub.user_id);
    if (!role) return false;
    const pref = prefsByUser.get(sub.user_id);
    return pref ? pref[event] : ROLE_DEFAULT_PREFS[role][event];
  });
  if (!recipients.length) {
    console.error("[push] no recipients after filtering", {
      total: subscriptions.length,
      skipUserId: options?.skipUserId,
    });
    return;
  }

  await sendToSubscriptions(recipients, {
    title: EVENT_TITLES[event],
    body: composeBody(order),
    tag: `commande-${order.id}`,
    url: "/gestion/commandes",
    event,
  });
}

/**
 * Appel serveur depuis le menu QR (route publique /api/push/call-server).
 * Tous les membres abonnés à l'événement sont prévenus ; call_throttle borne
 * à un appel par table par fenêtre.
 */
export async function dispatchCallServer(
  slug: string,
  tableNumber: number
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;

  const db = createAdminClient();

  const { data: etablissement } = await db
    .from("etablissements")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!etablissement) return;

  const { data: table } = await db
    .from("tables")
    .select("id, number")
    .eq("etablissement_id", etablissement.id)
    .eq("number", tableNumber)
    .maybeSingle();
  if (!table) return;

  // Anti-spam : l'upsert conditionné à l'ancienneté sert de verrou — s'il ne
  // touche aucune ligne alors qu'une existe, l'appel précédent est trop récent.
  const threshold = new Date(Date.now() - CALL_THROTTLE_MS).toISOString();
  const { data: refreshed, error: throttleError } = await db
    .from("call_throttle")
    .update({ called_at: new Date().toISOString() })
    .eq("table_id", table.id)
    .lt("called_at", threshold)
    .select("table_id");
  if (throttleError) {
    console.error("[push] call throttle error", { throttleError });
    return;
  }
  if (!refreshed.length) {
    const { error: insertError } = await db
      .from("call_throttle")
      .insert({ table_id: table.id });
    if (insertError) return; // Ligne récente déjà présente : appel étouffé.
  }

  const [subsResult, membResult, prefsResult] = await Promise.all([
    db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("etablissement_id", etablissement.id),
    db
      .from("memberships")
      .select("user_id, role")
      .eq("etablissement_id", etablissement.id),
    db
      .from("notification_prefs")
      .select("user_id, appel_serveur")
      .eq("etablissement_id", etablissement.id),
  ]);
  if (subsResult.error || membResult.error || prefsResult.error) {
    console.error("[push] call recipient query error", {
      subs: subsResult.error,
      memb: membResult.error,
      prefs: prefsResult.error,
    });
    return;
  }

  const roleByUser = new Map(membResult.data.map((m) => [m.user_id, m.role]));
  const prefsByUser = new Map(prefsResult.data.map((p) => [p.user_id, p]));
  const recipients = subsResult.data.filter((sub) => {
    const role = roleByUser.get(sub.user_id);
    if (!role) return false;
    const pref = prefsByUser.get(sub.user_id);
    return pref
      ? pref.appel_serveur
      : ROLE_DEFAULT_PREFS[role].appel_serveur;
  });
  if (!recipients.length) return;

  await sendToSubscriptions(recipients, {
    title: "Appel serveur",
    body: `La table ${table.number} vous appelle.`,
    tag: `appel-${table.id}`,
    url: "/gestion/commandes",
    event: "appel_serveur",
  });
}

interface Deliverable {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envoi web-push brut vers des abonnements, avec purge des endpoints morts
 * (404/410 : abonnement révoqué, app désinstallée — inutile de les repayer à
 * chaque commande). Sans effet si la clé VAPID n'est pas configurée.
 */
export async function sendToSubscriptions(
  subscriptions: Deliverable[],
  payload: PushPayload
): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject || !subscriptions.length) return;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        // urgency high : réveille l'appareil même en économie d'énergie —
        // une commande qui arrive en cuisine n'attend pas.
        { TTL: PUSH_TTL_S, urgency: "high" }
      )
    )
  );

  const dead = subscriptions
    .filter((_, index) => {
      const result = results[index];
      if (result.status !== "rejected") return false;
      const statusCode = (result.reason as { statusCode?: number }).statusCode;
      return statusCode === 403 || statusCode === 404 || statusCode === 410;
    })
    .map((sub) => sub.id);
  if (dead.length) {
    const db = createAdminClient();
    await db.from("push_subscriptions").delete().in("id", dead);
  }
}
