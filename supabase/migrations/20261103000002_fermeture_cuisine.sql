-- Le bouton « Fermeture cuisine » d'Aujourd'hui, sur le modèle des fermetures.
--
-- 1. Chaque article porte un marqueur : chaud, froid, ou rien (hors cuisine,
--    les boissons et les chichas restent commandables). Le cuisinier ne peut
--    pas le changer : enforce_item_update_rights ne lui laisse que la
--    disponibilité et le stock.
--
-- 2. Le bouton s'appuie sur des fermetures réservées, au plus une par partie
--    et par établissement, créées à la première pression : « chaud » et
--    « froid » coupent ce qui porte ce marqueur à l'instant où on le lit,
--    « choix » coupe ses closure_targets. « Toute la cuisine » ferme chaud et
--    froid ensemble. Le reste ne change pas : forçage jusqu'à la bascule,
--    réouverture par basculer_fermeture, refus par place_order, qui lit
--    articles_fermes. Un article marqué pendant une fermeture la suit aussitôt
--    et un article démarqué la quitte, comme un plat ajouté à une catégorie
--    fermée.
--
-- Aucune ligne existante n'est modifiée.

alter table public.items
  add column cuisine text check (cuisine in ('chaud', 'froid'));

alter table public.closures
  add column cuisine text check (cuisine in ('chaud', 'froid', 'choix'));

create unique index closures_cuisine_idx
  on public.closures (etablissement_id, cuisine)
  where cuisine is not null;

-- Les articles coupés à l'instant donné, et si le bouton les coupe : le menu
-- dit alors « Cuisine fermée » plutôt que « Plus servi ». Publique comme
-- articles_fermes : ni nom de fermeture, ni rien d'autre que des identifiants
-- d'articles déjà publics.
create function public.articles_fermes_detail(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns table (id uuid, cuisine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, bool_or(c.cuisine is not null)
  from horloge_service(p_etablissement, p_at) h
  join closures c
    on c.etablissement_id = p_etablissement
    and fermeture_active(c, h.service_ts, h.day_end_hour)
  join items i
    on i.etablissement_id = p_etablissement
    and (
      i.cuisine = c.cuisine
      or exists (
        select 1 from closure_targets t
        where t.closure_id = c.id
          and (t.item_id = i.id or t.category_id = i.category_id)
      )
    )
  group by i.id;
$$;

revoke execute on function public.articles_fermes_detail(uuid, timestamptz) from public;
grant execute on function public.articles_fermes_detail(uuid, timestamptz)
  to anon, authenticated;

-- Même signature : place_order refuse d'office ce que le bouton coupe.
create or replace function public.articles_fermes(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id from articles_fermes_detail(p_etablissement, p_at) d;
$$;

-- Fermer ou rouvrir des parties du bouton d'un seul tenant. Le gérant et le
-- cuisinier seulement : c'est le cuisinier qui crée la fermeture réservée, à
-- laquelle RLS ne le laisse pas écrire, d'où security definer. p_articles :
-- la sélection de « choix », remplacée à chaque fermeture.
create function public.basculer_cuisine(
  p_etablissement uuid,
  p_parties text[],
  p_fermee boolean,
  p_articles uuid[] default null
)
returns setof public.closures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partie text;
  v_closure closures;
begin
  if coalesce(current_member_role(p_etablissement)::text, '')
       not in ('gerant', 'cuisinier') then
    raise exception 'Réservé au gérant et à la cuisine.';
  end if;

  foreach v_partie in array p_parties loop
    insert into closures (etablissement_id, name, cuisine)
    values (
      p_etablissement,
      case v_partie
        when 'chaud' then 'Plats chauds'
        when 'froid' then 'Plats froids'
        when 'choix' then 'Articles choisis'
      end,
      v_partie
    )
    on conflict (etablissement_id, cuisine) where cuisine is not null
      do update set cuisine = excluded.cuisine
    returning * into v_closure;

    if v_partie = 'choix' and p_fermee then
      delete from closure_targets where closure_id = v_closure.id;
      insert into closure_targets (closure_id, item_id)
      select v_closure.id, i.id
      from items i
      where i.etablissement_id = p_etablissement
        and i.id = any (p_articles);
    end if;

    return query select * from basculer_fermeture(v_closure.id, p_fermee);
  end loop;
end;
$$;

revoke execute on function public.basculer_cuisine(uuid, text[], boolean, uuid[])
  from public, anon;
grant execute on function public.basculer_cuisine(uuid, text[], boolean, uuid[])
  to authenticated;
