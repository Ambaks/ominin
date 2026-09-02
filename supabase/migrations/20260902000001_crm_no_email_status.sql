-- ---------------------------------------------------------------------------
-- Nouveau statut « no_email » : l'agent a qualifié le restaurant mais n'a
-- trouvé aucune adresse (ni sur le site, ni ailleurs). « new » redevient
-- strictement « découvert, pas encore traité » ; ces fiches sortent du
-- pipeline actif et forment le vivier du futur traitement des formulaires
-- de contact.
--
-- Fichier isolé volontairement : ALTER TYPE … ADD VALUE ne peut pas être
-- référencé dans la transaction qui l'ajoute, et db push enveloppe chaque
-- fichier de migration dans une transaction.
-- ---------------------------------------------------------------------------

alter type public.crm_lead_status add value if not exists 'no_email'
  after 'not_interested';
