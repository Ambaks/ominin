-- Contrat de commercial : un document versionné de plus, et une portée de
-- signature de plus. Fichier à part : une valeur ajoutée à un enum n'est
-- utilisable qu'une fois sa transaction validée, et la migration suivante
-- s'en sert dans une contrainte.

alter type public.legal_doc add value 'commercial';
alter type public.legal_scope add value 'commercial';
