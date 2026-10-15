-- Fournisseur de démonstration : la commande se règle « en ligne » dans la
-- page, sans aucun débit. Une valeur d'enum ajoutée ne sert qu'une fois sa
-- transaction validée : ses règles suivent en 20261015000005.
alter type public.payment_provider add value if not exists 'demo';
