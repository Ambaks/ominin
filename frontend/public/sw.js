/*
 * Service worker de l'espace de gestion : réception des notifications push
 * (nouvelle commande, commande prête, annulation) et ouverture des commandes
 * au clic. La forme de la charge utile est PushPayload (lib/push/events.ts) —
 * dupliquer ici tout changement là-bas.
 */

self.addEventListener("install", () => {
  // Une nouvelle version du worker prend la main sans attendre la fermeture
  // des onglets : le push est le seul rôle du worker, rien à préserver.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      tag: payload.tag,
      // Une même commande peut sonner plusieurs fois (prête après nouvelle) :
      // renotify fait vibrer même quand le tag remplace une notification.
      renotify: true,
      // Une nouvelle commande ou un appel client reste affiché jusqu'à un
      // geste : c'est un ordre de travail, pas une information.
      requireInteraction:
        payload.event === "nouvelle_commande" ||
        payload.event === "appel_serveur",
      vibrate: [200, 100, 200],
      data: { url: payload.url },
      timestamp: Date.now(),
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/gestion/commandes";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((client) => client.url.includes("/gestion"));
        if (open) {
          open.navigate(url).catch(() => {});
          return open.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Le navigateur a fait tourner l'abonnement : on se réabonne avec la même
  // clé et on remplace l'ancienne ligne côté serveur, identifiée par
  // l'ancien endpoint (capacité non devinable).
  const resubscribe = async () => {
    const oldSubscription = event.oldSubscription;
    if (!oldSubscription) return;
    const subscription = await self.registration.pushManager.subscribe(
      oldSubscription.options
    );
    const json = subscription.toJSON();
    await fetch("/api/push/resubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldEndpoint: oldSubscription.endpoint,
        endpoint: json.endpoint,
        p256dh: json.keys && json.keys.p256dh,
        auth: json.keys && json.keys.auth,
      }),
    });
  };
  event.waitUntil(resubscribe().catch(() => {}));
});
