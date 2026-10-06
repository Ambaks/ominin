-- discard_online_payment est réservée au serveur (webhook Stripe, clé
-- service) : elle supprime une commande en attente de paiement en ligne.
-- 20260915000001 ne la retirait qu'à « public » ; or Supabase accorde aussi
-- l'exécution des fonctions à anon et authenticated par défaut, si bien
-- qu'un visiteur connaissant l'identifiant d'une session Stripe en cours
-- pouvait annuler la commande. Même révocation que begin_square_payment et
-- discard_stale_online_payment (20261004000002).

revoke execute on function public.discard_online_payment(text)
  from public, anon, authenticated;
grant execute on function public.discard_online_payment(text) to service_role;
