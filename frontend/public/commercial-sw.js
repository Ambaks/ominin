/*
 * Service worker de l'espace commercial, distinct de /sw.js (gestion) :
 * notifications push, et le deck du Kit gardé pour être montré hors ligne
 * (réseau d'abord, la copie en cache si le réseau manque). Le cache porte le
 * préfixe « commercial: », vidé à la fin du contrat (device.ts).
 */

const DECK_CACHE = "commercial:deck";
const isDeck = (url) => url.pathname.endsWith("/espace/ressources/deck");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !isDeck(url)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(DECK_CACHE).then((cache) => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
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
