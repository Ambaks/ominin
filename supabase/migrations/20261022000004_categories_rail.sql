-- Présentation des catégories du menu QR : barre de pastilles en haut (par
-- défaut, comme jusqu'ici) ou rail d'icônes à gauche. Le gérant la règle
-- dans sa gestion (policy « gerant update » existante) ; l'admin Ominin par
-- la fonction ci-dessous, sans droit d'écriture général sur etablissements.
-- ---------------------------------------------------------------------------

alter table public.etablissements
  add column category_layout text not null default 'top'
    check (category_layout in ('top', 'rail'));

create function public.admin_set_category_layout(p_etablissement uuid, p_layout text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Réservé à l''admin Ominin.';
  end if;
  update etablissements set category_layout = p_layout where id = p_etablissement;
end;
$$;

revoke execute on function public.admin_set_category_layout(uuid, text) from public, anon;
grant execute on function public.admin_set_category_layout(uuid, text) to authenticated;
