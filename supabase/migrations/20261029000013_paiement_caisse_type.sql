-- Réglée à la caisse sans que la caisse dise comment : une commande que la
-- caisse HubRise termine sans transmettre de règlement (OrderLine, certaines
-- caisses). Seule dans son fichier : une valeur d'enum ne sert qu'une fois
-- validée (20261029000014 s'en sert).
alter type public.payment_mode add value if not exists 'caisse';
