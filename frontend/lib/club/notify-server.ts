import { CLUB_NOTIF_MAX_AGE_MS } from "@/lib/gestion/constants";
import { sendToSubscriptions } from "@/lib/push/server";
import type { createAdminClient } from "@/lib/supabase/admin";
import { posteOf, readDroits } from "./droits";
import {
  KIND_PREF,
  KIND_TITLES,
  notifLines,
  notifUrl,
  prefsOf,
  type NotifDetails,
  type NotifKind,
} from "./notifications";

type Admin = ReturnType<typeof createAdminClient>;

/*
 * Relève la file des notifications de réservation d'un club et les envoie
 * (service_role + web-push). Appelée après un paiement compté, un
 * remboursement, ou un geste de l'équipe. Idempotente : chaque événement est
 * réclamé une fois (sent_at posé par un update conditionnel, que deux appels
 * simultanés ne peuvent pas obtenir tous les deux), et la file contient tout
 * ce qu'un appel précédent aurait manqué. Un événement trop vieux (un appel
 * perdu, relevé bien plus tard) va à l'historique sans sonner.
 */
export async function flushClubNotifications(admin: Admin, etablissementId: string): Promise<void> {
  const { data, error } = await admin
    .from("club_notifications")
    .update({ sent_at: new Date().toISOString() })
    .eq("etablissement_id", etablissementId)
    .is("sent_at", null)
    .select("id, booking_id, event_id, payment_id, kind, details, actor, created_at");
  if (error) {
    console.error("[club-notif] file illisible", { etablissementId, error });
    return;
  }
  let claimed = data;
  if (!claimed.length) return;

  // Une part marquée remboursée puis rétablie (Stripe a refusé) n'a pas été
  // rendue : l'événement s'efface, une nouvelle tentative le réécrira.
  const refundedParts = claimed.filter((row) => row.kind === "part_remboursee" && row.payment_id);
  if (refundedParts.length) {
    const { data: still } = await admin
      .from("club_payments")
      .select("id")
      .in("id", refundedParts.map((row) => row.payment_id!))
      .eq("status", "remboursee");
    const kept = new Set((still ?? []).map((payment) => payment.id));
    const restored = refundedParts.filter((row) => !kept.has(row.payment_id!)).map((row) => row.id);
    if (restored.length) {
      await admin.from("club_notifications").delete().in("id", restored);
      claimed = claimed.filter((row) => !restored.includes(row.id));
    }
  }

  const [members, prefs, subscriptions, etablissement] = await Promise.all([
    admin.from("memberships").select("user_id, role, club_role").eq("etablissement_id", etablissementId),
    admin
      .from("club_notif_prefs")
      .select("user_id, en_ligne, manuelle, acompte, modification")
      .eq("etablissement_id", etablissementId),
    admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("etablissement_id", etablissementId),
    admin.from("etablissements").select("club_droits").eq("id", etablissementId).single(),
  ]);
  if (members.error || prefs.error || subscriptions.error || etablissement.error) {
    console.error("[club-notif] destinataires illisibles", {
      members: members.error,
      prefs: prefs.error,
      subscriptions: subscriptions.error,
      etablissement: etablissement.error,
    });
    // Rendus à la file : le prochain appel les reprend.
    await admin
      .from("club_notifications")
      .update({ sent_at: null })
      .in("id", claimed.map((row) => row.id));
    return;
  }

  const droits = readDroits(etablissement.data.club_droits);
  const savedByUser = new Map(prefs.data.map(({ user_id, ...values }) => [user_id, values]));
  const team = members.data.map((member) => {
    const poste = posteOf(member.role, member.club_role);
    return {
      userId: member.user_id,
      prefs: prefsOf(poste, savedByUser.get(member.user_id)),
      money: member.role === "gerant" || (member.club_role !== null && droits[member.club_role].includes("acomptes")),
    };
  });

  const oldest = Date.now() - CLUB_NOTIF_MAX_AGE_MS;
  await Promise.all(
    claimed
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map(async (row) => {
        const kind = row.kind as NotifKind;
        const details = row.details as unknown as NotifDetails;
        const concerned = team.filter((member) => member.prefs[KIND_PREF[kind]]);
        const { error: recordError } = await admin
          .from("club_notifications")
          .update({ recipients: concerned.map((member) => member.userId) })
          .eq("id", row.id);
        if (recordError) console.error("[club-notif] historique", { id: row.id, recordError });
        if (Date.parse(row.created_at) < oldest) return;

        // L'auteur du geste n'est pas sonné ; chacun reçoit le texte de ses droits.
        const ringing = concerned.filter((member) => member.userId !== row.actor);
        const payload = (money: boolean) => ({
          title: KIND_TITLES[kind],
          body: notifLines(kind, details, money).join("\n"),
          tag: `reservation-${row.booking_id}`,
          url: notifUrl(row.event_id, row.booking_id),
          event: "club" as const,
        });
        await Promise.all(
          [true, false].map((money) => {
            const users = new Set(ringing.filter((member) => member.money === money).map((member) => member.userId));
            return sendToSubscriptions(
              subscriptions.data.filter((sub) => users.has(sub.user_id)),
              payload(money)
            );
          })
        );
      })
  );
}
