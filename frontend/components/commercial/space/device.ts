/*
 * Ce que l'espace garde sur l'appareil, et rien côté serveur (article 2.3 du
 * contrat : aucun suivi d'assiduité) : ce que le worker garde en cache.
 */

const PREFIX = "commercial:";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Fin du contrat : brouillons et cache de l'appareil effacés (art. 6.5 et 8.3). */
export function clearDeviceData() {
  const store = storage();
  if (store) {
    for (const key of Object.keys(store)) {
      if (key.startsWith(PREFIX)) store.removeItem(key);
    }
  }
  if ("caches" in window) {
    void caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith(PREFIX)).map((key) => caches.delete(key)))
    );
  }
}
