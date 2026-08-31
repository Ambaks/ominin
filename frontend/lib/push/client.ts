/*
 * Côté appareil : enregistrement du service worker, permission, abonnement
 * Web Push et synchronisation avec /api/push/subscriptions. Tout est par
 * appareil — un membre active ses notifications sur chaque téléphone ou
 * tablette qu'il utilise.
 */

export type PushStatus =
  /** Navigateur sans Web Push (ou clé VAPID absente de la config). */
  | "unsupported"
  /** iPhone/iPad : Safari n'offre le push qu'une fois le site installé. */
  | "needs-install"
  /** Permission refusée dans le navigateur : à rouvrir dans ses réglages. */
  | "denied"
  /** Prêt mais pas encore abonné sur cet appareil. */
  | "off"
  /** Abonné : cet appareil reçoit les notifications. */
  | "on";

export interface DeviceSubscription {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  endpoint: string;
}

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  // iPadOS se présente comme macOS mais avec écran tactile.
  (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  ("standalone" in navigator &&
    (navigator as { standalone?: boolean }).standalone === true);

function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) {
    return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "on" : "off";
}

/** Libellé lisible de l'appareil courant, pour la liste « Mes appareils ». */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : "Appareil";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
      ? "Samsung Internet"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "";
  return browser ? `${device} · ${browser}` : device;
}

/** La clé VAPID publique attendue en Uint8Array par pushManager.subscribe. */
function vapidKey(): Uint8Array {
  const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function syncSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("Abonnement incomplet renvoyé par le navigateur.");
  }
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      deviceLabel: deviceLabel(),
    }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Enregistrement de l'appareil impossible.");
  }
}

/**
 * Active les notifications sur cet appareil. À appeler depuis un geste
 * utilisateur (la demande de permission l'exige). Lève une erreur en
 * français destinée au toast.
 */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) {
    throw new Error("Ce navigateur ne permet pas les notifications.");
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission refusée : notifications non activées.");
  }
  await navigator.serviceWorker.ready;
  const expected = vapidKey();
  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const existing = new Uint8Array(
      subscription.options.applicationServerKey ?? new ArrayBuffer(0)
    );
    if (
      existing.length !== expected.length ||
      existing.some((byte, i) => byte !== expected[i])
    ) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: expected as BufferSource,
  });
  try {
    await syncSubscription(subscription);
  } catch (error) {
    // Sans ligne en base, l'abonnement navigateur ne recevra jamais rien :
    // on le retire pour laisser l'appareil dans un état propre.
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }
}

/** Désactive les notifications sur cet appareil. */
export async function disablePush(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const response = await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (!response.ok) {
    throw new Error("Désactivation impossible côté serveur.");
  }
  await subscription.unsubscribe();
}

/** Endpoint de l'abonnement de cet appareil, pour le marquer dans la liste. */
export async function currentEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}

/** Appareils abonnés du membre connecté (tous ses appareils, cet établissement). */
export async function listDevices(): Promise<DeviceSubscription[]> {
  const response = await fetch("/api/push/subscriptions");
  if (!response.ok) throw new Error("Chargement des appareils impossible.");
  const body = (await response.json()) as { devices: DeviceSubscription[] };
  return body.devices;
}

/**
 * Retire un appareil de la liste (le sien uniquement, vérifié côté serveur).
 * Si l'appareil retiré est le courant, désabonne aussi le navigateur pour
 * garder un état cohérent entre browser et serveur.
 */
export async function removeDevice(id: string): Promise<void> {
  const response = await fetch("/api/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error("Suppression de l'appareil impossible.");
  const body = (await response.json().catch(() => null)) as {
    endpoint?: string;
  } | null;
  const ownEp = await currentEndpoint();
  if (ownEp && body?.endpoint === ownEp) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  }
}

/** Notification d'essai, envoyée par le serveur aux appareils du membre. */
export async function sendTestNotification(): Promise<void> {
  const response = await fetch("/api/push/test", { method: "POST" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Envoi de la notification d'essai impossible.");
  }
}
