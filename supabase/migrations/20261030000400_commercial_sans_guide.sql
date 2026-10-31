-- Le guide de vente n'est plus un lien réglé par l'admin : il est dans le
-- parcours de l'espace commercial.
drop function public.commercial_guide_url();
alter table public.commercial_settings drop column guide_url;
