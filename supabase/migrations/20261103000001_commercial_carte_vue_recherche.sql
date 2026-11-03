-- La carte du commercial ne charge plus que les restaurants de sa vue, et il
-- cherche un établissement par son nom dans un rayon autour de lui, réglé par
-- l'admin (Réglages communs).

alter table public.commercial_settings
  add column search_radius_km int not null default 20 check (search_radius_km > 0);

drop function public.commercial_map_points();
create function public.commercial_map_points(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work'))
  select coalesce(jsonb_agg(jsonb_build_array(r.id, r.latitude, r.longitude,
    case
      when public.commercial_is_client(r) then 'c'
      when h.commercial_id = me.id then 'm'
      when h.restaurant_id is not null then 'v'
      when exists (
        select 1 from public.outreach_emails e
        where e.restaurant_id = r.id and e.direction = 'outbound' and e.sent_at is not null
      ) then 'l'
      else 'f'
    end)), '[]')
  from public.crm_restaurants r
  left join public.commercial_holds h on h.restaurant_id = r.id
  cross join me
  where r.deleted_at is null and r.outreach_opted_out_at is null
    and r.latitude between p_south and p_north
    and r.longitude between p_west and p_east;
$$;
revoke execute on function public.commercial_map_points(double precision, double precision, double precision, double precision) from public, anon;
grant execute on function public.commercial_map_points(double precision, double precision, double precision, double precision) to authenticated;

-- « L'Étoile » se trouve en tapant « l etoile » : sans casse, accents ni ponctuation.
create function public.commercial_search_key(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(replace(lower(p_text), 'œ', 'oe'), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g'
  ));
$$;
revoke execute on function public.commercial_search_key(text) from public, anon, authenticated;

create function public.commercial_map_search(
  p_query text,
  p_lat double precision,
  p_lng double precision,
  p_limit int
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  search as (
    select public.commercial_search_key(p_query) as key,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as origin
  )
  select jsonb_build_object(
    'radius_km', cfg.search_radius_km,
    'results', coalesce((
      select jsonb_agg(found order by found.distance_m)
      from (
        select r.id, r.name, r.city, r.latitude, r.longitude,
          extensions.st_distance(place.point, search.origin) as distance_m
        from public.crm_restaurants r
        cross join lateral (
          select extensions.st_setsrid(extensions.st_makepoint(r.longitude, r.latitude), 4326)::extensions.geography as point
        ) place
        where r.deleted_at is null and r.outreach_opted_out_at is null
          and r.latitude is not null and r.longitude is not null
          and search.key <> ''
          and position(search.key in public.commercial_search_key(r.name)) > 0
          and extensions.st_dwithin(place.point, search.origin, cfg.search_radius_km * 1000)
        order by distance_m
        limit p_limit
      ) found
    ), '[]')
  )
  from me, cfg, search;
$$;
revoke execute on function public.commercial_map_search(text, double precision, double precision, int) from public, anon;
grant execute on function public.commercial_map_search(text, double precision, double precision, int) to authenticated;
