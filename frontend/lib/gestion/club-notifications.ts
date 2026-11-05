import { posteOf, type Poste } from "@/lib/club/droits";
import { prefsOf, type NotifDetails, type NotifKind, type NotifPrefs } from "@/lib/club/notifications";
import { createClient } from "@/lib/supabase/client";
import { check, must, type ListPage } from "@/lib/supabase/result";

/*
 * Côté gestion des notifications de réservation : relever la file après un
 * geste, les réglages (les siens, ceux de l'équipe pour la direction) et
 * l'historique paginé en base.
 */

/**
 * Après une fonction SQL qui a pu écrire un événement (saisie, annulation,
 * changement de table) : le serveur relève la file et envoie. Sans attendre
 * ni échouer — la notification est un à-côté — et `keepalive` survit à une
 * navigation.
 */
export function notifyClub(bookingId: string): void {
  void fetch("/api/club/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
    keepalive: true,
  }).catch(() => {});
}

const PREF_COLUMNS = "user_id, en_ligne, manuelle, acompte, modification";

/** Un membre du club et ce qu'il reçoit (ses réglages, à défaut ceux de son poste). */
export interface MemberNotifs {
  userId: string;
  name: string;
  poste: Poste | null;
  prefs: NotifPrefs;
  /** Réglages enregistrés : faux tant que les défauts du poste s'appliquent. */
  saved: boolean;
}

/** Toute l'équipe (direction) ; un membre ne lit que sa propre ligne de réglages. */
export async function loadClubNotifs(etablissementId: string, userId: string, team: boolean): Promise<MemberNotifs[]> {
  const supabase = createClient();
  let members = supabase
    .from("memberships")
    .select("user_id, email, display_name, role, club_role, created_at")
    .eq("etablissement_id", etablissementId)
    .order("created_at", { ascending: true });
  if (!team) members = members.eq("user_id", userId);
  const [rows, prefs] = await Promise.all([
    members.then(must),
    supabase.from("club_notif_prefs").select(PREF_COLUMNS).eq("etablissement_id", etablissementId).then(must),
  ]);
  const saved = new Map(prefs.map(({ user_id, ...values }) => [user_id, values]));
  return rows.map((row) => {
    const poste = posteOf(row.role, row.club_role);
    return {
      userId: row.user_id,
      name: row.display_name ?? row.email,
      poste,
      prefs: prefsOf(poste, saved.get(row.user_id)),
      saved: saved.has(row.user_id),
    };
  });
}

/** Enregistre ce que reçoit un membre (le sien, ou n'importe lequel pour la direction : RLS). */
export async function saveClubNotifs(etablissementId: string, userId: string, prefs: NotifPrefs): Promise<void> {
  check(
    await createClient()
      .from("club_notif_prefs")
      .upsert({ user_id: userId, etablissement_id: etablissementId, ...prefs, updated_at: new Date().toISOString() })
  );
}

/** Une notification de l'historique. */
export interface ClubNotification {
  id: string;
  bookingId: string;
  eventId: string;
  kind: NotifKind;
  details: NotifDetails;
  createdAt: string;
}

/** L'historique, page par page : tout pour la direction, le sien pour un membre (club_notifications_page). */
export async function fetchClubNotifications(
  etablissementId: string,
  search: string,
  limit: number,
  offset: number
): Promise<ListPage<ClubNotification>> {
  const rows = must(
    await createClient().rpc("club_notifications_page", {
      p_etablissement: etablissementId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    })
  );
  return {
    rows: rows.map((row) => ({
      id: row.id,
      bookingId: row.booking_id,
      eventId: row.event_id,
      kind: row.kind as NotifKind,
      details: row.details as unknown as NotifDetails,
      createdAt: row.created_at,
    })),
    total: rows[0]?.total_count ?? 0,
  };
}
