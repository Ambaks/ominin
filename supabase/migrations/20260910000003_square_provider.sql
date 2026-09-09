-- Square rejoint Stripe et SumUp comme fournisseur du paiement à table.
--
-- Fichier isolé volontairement : ALTER TYPE … ADD VALUE ne peut pas être
-- référencé dans la transaction qui l'ajoute, et db push enveloppe chaque
-- fichier de migration dans une transaction (même raison qu'au « mixte »,
-- 20260904000002_payment_mode_mixte.sql).

alter type public.payment_provider add value if not exists 'square';
