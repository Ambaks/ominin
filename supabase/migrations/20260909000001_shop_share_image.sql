-- Image de partage d'une boutique. Le logo rond sert d'icône d'onglet, mais
-- fait une mauvaise vignette : Instagram et WhatsApp affichent l'aperçu en
-- large et rogneraient dedans. Une image dédiée, au format paysage, est donc
-- distincte du logo — à défaut, le logo reprend le rôle, ce qui vaut toujours
-- mieux que l'absence d'aperçu.

alter table public.shops add column share_image_url text;
