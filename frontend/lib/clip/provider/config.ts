/*
 * Réglages serveur du prestataire de publication (route handlers uniquement —
 * la clé API ne doit jamais atteindre le client).
 */

/** Base de l'API upload-post, surchargeables pour tests ou bascule d'URL. */
export const PROVIDER_API_URL =
  process.env.UPLOAD_POST_API_URL ?? "https://api.upload-post.com/api";

/** Délai max d'une requête vers le prestataire. */
export const PROVIDER_TIMEOUT_MS = 30_000;

/**
 * Validité de l'URL signée que le prestataire utilise pour télécharger la
 * vidéo : son ingestion asynchrone doit aboutir dans cette fenêtre.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Filet de sécurité du bucket 1 Go : à chaque publication, les objets du
 * clipper plus vieux que ce délai sont purgés (pas de cron sur le tier
 * gratuit). Les clips en échec restent réessayables pendant cette fenêtre.
 */
export const STORAGE_RETENTION_DAYS = 2;

export function providerApiKey(): string {
  const key = process.env.UPLOAD_POST_API_KEY;
  if (!key) {
    throw new Error(
      "UPLOAD_POST_API_KEY manquante — renseigne frontend/.env.local."
    );
  }
  return key;
}
