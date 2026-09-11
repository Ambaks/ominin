-- Page d'origine d'une demande de contact. Jusqu'ici seul le formulaire
-- « sur mesure » du portail écrivait dans contact_requests ; la landing
-- Ominin Shop (shop.ominin.com) reçoit désormais ses propres demandes — dont
-- celles amenées par la promotion de MyBox — et il faut pouvoir les distinguer.
-- Les valeurs miroitent CONTACT_SOURCES (frontend/lib/portal/contact.ts) ;
-- 'sur-mesure' est le défaut pour que les lignes existantes gardent leur sens.
alter table public.contact_requests
  add column source text not null default 'sur-mesure'
    check (source in ('sur-mesure', 'shop'));
