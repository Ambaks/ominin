/*
 * Ce que l'espace garde sur l'appareil, et rien côté serveur (article 2.3 du
 * contrat : aucun suivi d'assiduité) : la dernière ouverture, pour les
 * nouveautés d'Aujourd'hui, et la note en cours quand le réseau tombe.
 */

const PREFIX = "commercial:";
const LAST_OPEN = `${PREFIX}last-open`;
const draftKey = (declarationId: string) => `${PREFIX}draft:${declarationId}`;

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Dernière ouverture d'Aujourd'hui (null : première fois sur cet appareil). */
export const readLastOpen = () => storage()?.getItem(LAST_OPEN) ?? null;

/** Notée seulement une fois l'écran chargé : un échec ne fait rien manquer. */
export const markOpened = () => storage()?.setItem(LAST_OPEN, new Date().toISOString());

export const readDraft = (declarationId: string) => storage()?.getItem(draftKey(declarationId)) ?? "";

export function writeDraft(declarationId: string, text: string) {
  const store = storage();
  if (text) store?.setItem(draftKey(declarationId), text);
  else store?.removeItem(draftKey(declarationId));
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
