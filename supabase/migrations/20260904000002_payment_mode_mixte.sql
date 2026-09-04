-- ---------------------------------------------------------------------------
-- Nouveau mode « mixte » : une addition réglée pour partie en carte, pour
-- partie en espèces. Porté par la commande une fois close ; le détail de ce
-- qui a été payé comment vit sur ses lignes (order_items.paid_mode,
-- migration suivante).
--
-- Fichier isolé volontairement : ALTER TYPE … ADD VALUE ne peut pas être
-- référencé dans la transaction qui l'ajoute, et db push enveloppe chaque
-- fichier de migration dans une transaction.
-- ---------------------------------------------------------------------------

alter type public.payment_mode add value if not exists 'mixte';
