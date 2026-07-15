/*
 * Point d'entrée serveur du prestataire de publication. Les route handlers
 * n'importent que clipProvider ; le client importe ses types depuis
 * ./types (jamais d'ici — la clé API vit dans l'adapter).
 */

export { uploadPostProvider as clipProvider } from "./upload-post";
