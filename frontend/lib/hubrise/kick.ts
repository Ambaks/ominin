/**
 * Après un encaissement, une correction, une commande prête ou remise dans
 * l'espace : la caisse HubRise suit tout de suite (sinon au passage du cron).
 * Sans attendre la réponse : la modification, elle, a déjà réussi. Rien pour
 * un établissement sans caisse reliée.
 */
export function syncTill(hubriseConnected: boolean): void {
  if (!hubriseConnected) return;
  void fetch("/api/hubrise/kick", { method: "POST", keepalive: true }).catch(() => {});
}
