-- La carte du commercial ne charge plus que les points : position et état de
-- chaque restaurant, en tableaux compacts [id, latitude, longitude, état].
-- Le détail (nom, adresse, téléphone, demande de visite) vient de
-- commercial_map(id) quand il en touche un.
--   c client · m suivi par lui · v suivi par un autre · l contacté par Léa · f libre
create function public.commercial_map_points()
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
    and r.latitude is not null and r.longitude is not null;
$$;
revoke execute on function public.commercial_map_points() from public, anon;
grant execute on function public.commercial_map_points() to authenticated;
