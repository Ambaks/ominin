-- Le paiement en ligne par Stripe (à table, click & collect) se fait dans la
-- page (Apple Pay, Google Pay, carte) sur un Payment Intent du compte
-- connecté, et non plus par redirection vers Stripe Checkout. La commande
-- garde l'intent à régler ; stripe_session_id ne sert plus qu'aux sessions
-- Checkout encore ouvertes au déploiement.

alter table public.orders
  add column stripe_payment_intent_id text unique;
