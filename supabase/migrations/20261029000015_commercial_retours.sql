-- Retours de Marwan sur l'espace commercial (29/10).
--
-- L'inscription en cours d'un restaurant est toujours la même tant qu'elle
-- n'est pas finie : recharger l'écran de suivi, ou le rouvrir depuis le
-- tableau de bord, retrouve celle que le gérant remplit (avant, une fois son
-- compte créé, une nouvelle inscription vide partait). Une seule en cours par
-- restaurant et par commercial, même lancée deux fois d'un coup.

delete from public.commercial_signups s
using public.commercial_signups t
where s.restaurant_id = t.restaurant_id and s.commercial_id = t.commercial_id
  and s.finished_at is null and t.finished_at is null
  and s.etablissement_id is null and s.created_at < t.created_at;

create unique index commercial_signups_open_key
  on public.commercial_signups (restaurant_id, commercial_id) where finished_at is null;

create or replace function public.commercial_start_signup(p_restaurant uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_id uuid;
begin
  perform public.commercial_take(p_restaurant, me.id);
  insert into public.commercial_signups (restaurant_id, commercial_id)
  values (p_restaurant, me.id)
  on conflict (restaurant_id, commercial_id) where finished_at is null do nothing;
  select id into v_id from public.commercial_signups
  where restaurant_id = p_restaurant and commercial_id = me.id and finished_at is null;
  return v_id;
end;
$$;

-- La carte dit au demandeur où en est sa demande : en attente, ou refusée
-- et jusqu'à quand (au-delà, le restaurant se libère s'il n'a pas avancé).
drop function public.commercial_map(uuid);
create function public.commercial_map(p_restaurant uuid default null)
returns table (
  id uuid, name text, address text, city text, phone text, google_maps_url text,
  latitude double precision, longitude double precision,
  state text, holder text, mine boolean, contacted_by_lea boolean,
  request text, request_ends timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
begin
  return query
    select r.id, r.name, r.address, r.city, r.phone, r.google_maps_url, r.latitude, r.longitude,
      case
        when public.commercial_is_client(r) then 'client'
        when h.restaurant_id is not null then 'visited'
        else 'free'
      end,
      coalesce(c.first_name, c.email),
      h.commercial_id is not distinct from me.id and h.restaurant_id is not null,
      exists (
        select 1 from public.outreach_emails e
        where e.restaurant_id = r.id and e.direction = 'outbound' and e.sent_at is not null
      ),
      q.status,
      q.created_at + make_interval(days => (public.commercial_cfg()).visit_request_days)
    from public.crm_restaurants r
    left join public.commercial_holds h on h.restaurant_id = r.id
    left join public.commerciaux c on c.id = h.commercial_id
    left join public.commercial_visit_requests q
      on q.restaurant_id = r.id and q.requester_id = me.id and q.status in ('pending', 'refused')
    where r.deleted_at is null and r.outreach_opted_out_at is null
      and (p_restaurant is null or r.id = p_restaurant)
      and r.latitude is not null and r.longitude is not null;
end;
$$;
revoke execute on function public.commercial_map(uuid) from public, anon;
grant execute on function public.commercial_map(uuid) to authenticated;

-- Le récap d'un restaurant pour son commercial : ses visites, ce qu'il a
-- récupéré, l'inscription et son état, la commission s'il est client.
create function public.commercial_restaurant_recap(p_restaurant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v jsonb;
begin
  select jsonb_build_object(
    'id', r.id, 'name', r.name, 'address', r.address, 'phone', r.phone,
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'at', x.created_at, 'outcome', x.outcome, 'reason', x.reason, 'note', x.note,
        'contact_name', x.contact_name, 'contact_phone', x.contact_phone, 'contact_email', x.contact_email)
        order by x.created_at desc)
      from public.commercial_visits x where x.restaurant_id = r.id and x.commercial_id = me.id), '[]'),
    'signup', (
      select jsonb_build_object(
        'id', s.id, 'at', s.created_at, 'kind', s.kind, 'account', s.etablissement_id is not null,
        'manager_name', s.manager_name, 'manager_phone', s.manager_phone, 'manager_email', s.manager_email,
        'photos', cardinality(s.photos), 'finished_at', s.finished_at,
        'stripe', exists (select 1 from public.payment_accounts a where a.etablissement_id = s.etablissement_id and a.charges_enabled),
        'hubrise', exists (select 1 from public.hubrise_connections h where h.etablissement_id = s.etablissement_id),
        'stripe_later', s.stripe_later, 'hubrise_later', s.hubrise_later)
      from public.commercial_signups s
      where s.restaurant_id = r.id and s.commercial_id = me.id
      order by s.created_at desc limit 1),
    'client', (
      select jsonb_build_object(
        'commission_from', c.commission_from,
        'commission_until', least(c.commission_from + make_interval(months => (public.commercial_cfg()).term_months), c.ended_at))
      from public.commercial_clients c
      where c.restaurant_id = r.id and c.commercial_id = me.id and c.validated_at is not null
      order by c.commission_from desc limit 1))
  into v
  from public.crm_restaurants r
  where r.id = p_restaurant
    and (exists (select 1 from public.commercial_visits x where x.restaurant_id = r.id and x.commercial_id = me.id)
         or exists (select 1 from public.commercial_signups s where s.restaurant_id = r.id and s.commercial_id = me.id));
  if v is null then
    raise exception 'Tu n''as ni visité ni inscrit ce restaurant.';
  end if;
  return v;
end;
$$;
revoke execute on function public.commercial_restaurant_recap(uuid) from public, anon;
grant execute on function public.commercial_restaurant_recap(uuid) to authenticated;
