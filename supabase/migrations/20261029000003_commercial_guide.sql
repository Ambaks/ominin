-- Le guide de vente des commerciaux (un message du salon #ressources sur
-- Discord), saisi par l'admin et ouvert depuis la page Ressources.
alter table public.commercial_settings
  add column guide_url text check (guide_url ~ '^https://');

create function public.commercial_guide_url()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.commercial_me('work');
  return (public.commercial_cfg()).guide_url;
end;
$$;
