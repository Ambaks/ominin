-- ---------------------------------------------------------------------------
-- Nouveau statut « interested » : un prospect a répondu positivement à la
-- prospection (e-mail entrant classé intéressé / demande de RDV / question)
-- mais aucun RDV n'est encore fixé. S'insère entre contacted et visited.
--
-- Fichier isolé volontairement : ALTER TYPE … ADD VALUE ne peut pas être
-- référencé dans la transaction qui l'ajoute, et db push enveloppe chaque
-- fichier de migration dans une transaction.
-- ---------------------------------------------------------------------------

alter type public.crm_lead_status add value if not exists 'interested'
  after 'contacted';
