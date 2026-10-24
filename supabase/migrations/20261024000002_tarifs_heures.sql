-- Les heures de la règle retenue, avec chaque tarif : la carte annonce la
-- happy hour en cours (« jusqu'à 20h », le temps qui reste) et chaque offre
-- dit jusqu'à quand elle vaut, quand deux règles se chevauchent sans finir à
-- la même heure. Rien ne change au calcul.

-- Le type de retour change : la fonction est recréée, ses droits avec elle.
-- place_order en lit item_id, choice_id et price, par leur nom.
drop function public.tarifs_actifs(uuid, timestamptz);

create function public.tarifs_actifs(
  p_etablissement uuid,
  p_at timestamptz default now()
)
returns table (
  item_id uuid,
  choice_id text,
  price numeric,
  rule_name text,
  starts_at time,
  ends_at time
)
language sql
stable
security definer
set search_path = public
as $$
  with moment as (
    select
      p_at at time zone 'Europe/Paris' as local_ts,
      p_at at time zone 'Europe/Paris'
        - make_interval(hours => coalesce(s.day_end_hour, 0)) as service_ts
    from (select 1) seed
    left join etablissement_settings s
      on s.etablissement_id = p_etablissement
  ),
  applicable as (
    select r.*
    from price_rules r, moment m
    where r.etablissement_id = p_etablissement
      and r.actif
      and case
        -- Une journée entière se termine à l'heure de fin de service, pas à
        -- minuit : le dimanche soir reste donc dimanche après 00 h.
        when r.starts_at is null then
          extract(isodow from m.service_ts)::smallint = any (r.days)
        when r.starts_at < r.ends_at then
          extract(isodow from m.service_ts)::smallint = any (r.days)
          and m.local_ts::time >= r.starts_at
          and m.local_ts::time < r.ends_at
        else
          (extract(isodow from m.local_ts)::smallint = any (r.days)
            and m.local_ts::time >= r.starts_at)
          or (extract(isodow from m.local_ts - interval '1 day')::smallint
                = any (r.days)
            and m.local_ts::time < r.ends_at)
      end
  ),
  cible as (
    -- Un article, ou tous ceux d'une catégorie : le prix de la fiche.
    select
      i.id as item_id,
      null::text as choice_id,
      i.price as base,
      a.name,
      a.direction,
      a.unit,
      a.value,
      a.created_at,
      a.starts_at,
      a.ends_at,
      (t.item_id is not null) as precise
    from applicable a
    join price_rule_targets t on t.rule_id = a.id and t.choice_id is null
    join items i
      on i.etablissement_id = p_etablissement
      and (i.id = t.item_id or i.category_id = t.category_id)
    union all
    -- Un format d'un article : son prix entier. Un choix retiré depuis de la
    -- fiche ne trouve plus rien, et la cible reste sans effet.
    select
      i.id,
      t.choice_id,
      i.price + coalesce((choix.value->>'supplement')::numeric, 0),
      a.name,
      a.direction,
      a.unit,
      a.value,
      a.created_at,
      a.starts_at,
      a.ends_at,
      true
    from applicable a
    join price_rule_targets t on t.rule_id = a.id and t.choice_id is not null
    join items i
      on i.id = t.item_id
      and i.etablissement_id = p_etablissement
    cross join lateral (
      select c.value
      from jsonb_array_elements(i.options) g,
        jsonb_array_elements(g.value->'choices') c
      where c.value->>'id' = t.choice_id
      limit 1
    ) choix
  ),
  retenue as (
    select distinct on (cible.item_id, cible.choice_id) cible.*
    from cible
    order by cible.item_id, cible.choice_id, cible.precise desc, cible.created_at desc
  )
  select
    retenue.item_id,
    retenue.choice_id,
    public.prix_ajuste(
      retenue.base,
      retenue.direction,
      retenue.unit,
      retenue.value
    ),
    retenue.name,
    retenue.starts_at,
    retenue.ends_at
  from retenue
  where public.prix_ajuste(
      retenue.base,
      retenue.direction,
      retenue.unit,
      retenue.value
    ) <> retenue.base;
$$;

revoke execute on function public.tarifs_actifs(uuid, timestamptz) from public;
grant execute on function public.tarifs_actifs(uuid, timestamptz)
  to anon, authenticated;
