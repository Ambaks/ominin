/**
 * Prévient l'équipe Ominin qu'un compte vient d'être créé. Le serveur retrouve
 * seul ce que l'utilisateur connecté vient de créer ; jamais bloquant.
 */
export function announceSignup(): void {
  void fetch("/api/admin/push/signup", { method: "POST" }).catch(() => {});
}
