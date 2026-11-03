-- Viva rejoint Stripe, Square et la démonstration comme fournisseur du
-- paiement en ligne. Fichier isolé : une valeur d'enum ajoutée ne sert
-- qu'une fois sa transaction validée (même raison que
-- 20260910000003_square_provider.sql). Ses règles suivent en 20261103000021.

alter type public.payment_provider add value if not exists 'viva';
