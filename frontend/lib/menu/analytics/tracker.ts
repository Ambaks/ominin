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

export interface MenuTracker {
  track: (stage: MenuStage, options?: TrackOptions) => void;
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

function post(body: Record<string, unknown>, keepalive: boolean): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  void fetch(`${url}/rest/v1/rpc/menu_track`, {
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

export function createTracker(
  slug: string,
  tableNumber: number | null
): MenuTracker {
  const session = readSession(slug);
  let stage: MenuStage = "vue";
  let items: string[] = [];
  let orderId: string | null = null;
  let pending: number | null = null;
  let heartbeat: number | null = null;

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
      },
      keepalive
    );
    items = [];
    orderId = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush(true);
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
    start() {
      flush();
      heartbeat = window.setInterval(() => {
        if (document.visibilityState === "visible") flush();
      }, HEARTBEAT_MS);
      document.addEventListener("visibilitychange", onVisibility);
    },
    stop() {
      clearPending();
      if (heartbeat !== null) window.clearInterval(heartbeat);
      heartbeat = null;
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
