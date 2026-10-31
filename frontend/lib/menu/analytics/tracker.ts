import type { Database } from "@/lib/supabase/database.types";
import {
  CLICK_FLUSH_MS,
  HEARTBEAT_MS,
  type MenuStage,
  STAGE_RANK,
} from "./constants";

/*
 * Mouchard du menu QR : sans cookie, sans IP, sans user-agent, sans rien qui
 * survive à l'onglet. L'identifiant de visite est tiré au hasard et rangé en
 * sessionStorage — il meurt avec l'onglet et ne suit personne d'un site à
 * l'autre. C'est ce qui permet de mesurer sans bannière (exemption « mesure
 * d'audience » de la CNIL), et donc de ne pas interrompre un client attablé.
 *
 * On n'appelle pas la base par le client Supabase : le dernier envoi part au
 * masquage de l'onglet et a besoin de `keepalive`, que le SDK n'expose pas.
 */

export interface TrackOptions {
  items?: string[];
  orderId?: string;
}

export type SuggestionKind = Database["public"]["Enums"]["menu_suggestion_kind"];
export type AfterMealEvent = Database["public"]["Enums"]["after_meal_event"];

export interface MenuTracker {
  track: (stage: MenuStage, options?: TrackOptions) => void;
  /** Une sorte de suggestion s'est affichée : comptée une fois par visite. */
  markShown: (kind: SuggestionKind) => void;
  /** La fiche d'un plat s'ouvre : un compteur par plat et par jour, sans la visite. */
  markViewed: (itemId: string) => void;
  start: () => void;
  stop: () => void;
}

/** Une clé par restaurant : deux menus ouverts dans le même onglet sont deux
 * visites, et une session ne peut pas être rejouée chez le voisin. */
function readSession(slug: string): string | null {
  try {
    const key = `ominin-menu-session:${slug}`;
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    // Navigation privée, stockage bloqué : on renonce à mesurer, en silence.
    return null;
  }
}

/** Ce que la visite a déjà compté : un rechargement n'est pas un nouvel affichage. */
function readShown(slug: string): Set<SuggestionKind> {
  try {
    const saved = sessionStorage.getItem(`ominin-menu-shown:${slug}`);
    return new Set(saved ? (JSON.parse(saved) as SuggestionKind[]) : []);
  } catch {
    return new Set();
  }
}

function writeShown(slug: string, shown: Set<SuggestionKind>): void {
  try {
    sessionStorage.setItem(`ominin-menu-shown:${slug}`, JSON.stringify([...shown]));
  } catch {
    // Stockage bloqué : au pire, un rechargement compte une fois de plus.
  }
}

function post(
  body: Record<string, unknown>,
  keepalive: boolean,
  rpc = "menu_track"
): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  void fetch(`${url}/rest/v1/rpc/${rpc}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    keepalive,
  }).catch(() => {
    // Un mouchard ne casse jamais la page qu'il mesure.
  });
}

/** Un geste sur la feuille de la suite du repas : sans la visite, voir after_meal_events. */
export function trackAfterMeal(
  slug: string,
  appearance: string,
  event: AfterMealEvent,
  details: {
    moment?: string;
    shownItems?: string[];
    item?: string;
    order?: string;
    ms?: number;
  } = {},
  keepalive = false
): void {
  post(
    {
      p_slug: slug,
      p_appearance: appearance,
      p_event: event,
      p_moment: details.moment,
      p_shown_items: details.shownItems,
      p_item: details.item,
      p_order: details.order,
      p_ms: details.ms,
    },
    keepalive,
    "after_meal_track"
  );
}

export function createTracker(
  slug: string,
  tableNumber: number | null
): MenuTracker {
  const session = readSession(slug);
  let stage: MenuStage = "vue";
  let items: string[] = [];
  let orderId: string | null = null;
  const shown = readShown(slug);
  let unsentShown: SuggestionKind[] = [];
  let pending: number | null = null;
  let heartbeat: number | null = null;
  let viewed: string[] = [];
  let pendingViews: number | null = null;

  // Son propre envoi, sans l'identifiant de visite : ouvrir une fiche ne doit
  // ni réveiller menu_track, ni se rattacher à la visite.
  const flushViews = (keepalive = false) => {
    if (pendingViews !== null) window.clearTimeout(pendingViews);
    pendingViews = null;
    if (!viewed.length) return;
    post({ p_slug: slug, p_items: viewed }, keepalive, "menu_track_views");
    viewed = [];
  };

  const clearPending = () => {
    if (pending !== null) window.clearTimeout(pending);
    pending = null;
  };

  const flush = (keepalive = false) => {
    clearPending();
    if (!session) return;
    post(
      {
        p_slug: slug,
        p_session: session,
        p_stage: stage,
        p_table: tableNumber,
        p_items: items.length ? items : null,
        p_order: orderId,
        // Absent plutôt que null : la base d'avant ce paramètre refuserait l'appel.
        ...(unsentShown.length ? { p_shown: unsentShown } : {}),
      },
      keepalive
    );
    items = [];
    orderId = null;
    unsentShown = [];
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      flush(true);
      flushViews(true);
    }
  };

  return {
    track(next, options) {
      const advanced = STAGE_RANK[next] > STAGE_RANK[stage];
      if (advanced) stage = next;
      if (options?.items?.length) items.push(...options.items);
      if (options?.orderId) orderId = options.orderId;
      // Une étape franchie part tout de suite ; un clic sur un plat attend ses
      // voisins.
      if (advanced || options?.orderId) flush();
      else if (pending === null) pending = window.setTimeout(flush, CLICK_FLUSH_MS);
    },
    markShown(kind) {
      if (shown.has(kind)) return;
      shown.add(kind);
      writeShown(slug, shown);
      unsentShown.push(kind);
      if (pending === null) pending = window.setTimeout(flush, CLICK_FLUSH_MS);
    },
    markViewed(itemId) {
      viewed.push(itemId);
      if (pendingViews === null) {
        pendingViews = window.setTimeout(flushViews, CLICK_FLUSH_MS);
      }
    },
    start() {
      flush();
      heartbeat = window.setInterval(() => {
        if (document.visibilityState === "visible") flush();
      }, HEARTBEAT_MS);
      document.addEventListener("visibilitychange", onVisibility);
    },
    stop() {
      clearPending();
      flushViews(true);
      if (heartbeat !== null) window.clearInterval(heartbeat);
      heartbeat = null;
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
