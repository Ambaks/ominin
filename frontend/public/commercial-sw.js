/*
 * Service worker de l'espace commercial, distinct de /sw.js (gestion) :
 * notifications push, et les decks gardés pour être montrés hors ligne
 * (réseau d'abord, la copie en cache si le réseau manque) : le PDF du Kit,
 * les tutos, les decks par type d'établissement et ce que leurs pages
 * chargent (styles, scripts, captures), reconnu à leur referrer. Un deck se
 * garde sans son ?restaurant= : une copie pour toutes les visites. Le cache
 * porte le préfixe « commercial: », vidé à la fin du contrat (device.ts).
 */

const DECK_CACHE = "commercial:deck";
const isDeck = (url) => url.pathname.endsWith("/espace/ressources/deck") || url.pathname.includes("/espace/ressources/decks/");
const isTuto = (url) => url.pathname.startsWith("/commercial/tutos/");
const fromDeck = (request) => request.referrer !== "" && isDeck(new URL(request.referrer));

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!isDeck(url) && !isTuto(url) && !fromDeck(event.request)) return;
  const key = isDeck(url) ? url.origin + url.pathname : event.request;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(DECK_CACHE).then((cache) => cache.put(key, copy)));
        }
        return response;
      })
      .catch(() => caches.match(key).then((cached) => cached || Response.error()))
  );
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
      data: { url: payload.url },
      timestamp: Date.now(),
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (open) return open.navigate(url).then((client) => client && client.focus());
      return self.clients.openWindow(url);
    })
  );
});
