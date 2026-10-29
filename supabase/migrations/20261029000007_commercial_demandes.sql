-- Refonte de l'espace commercial : les demandes de visite. Un commercial
-- demande un restaurant suivi par un autre ; celui-ci accepte (le restaurant
-- est libéré) ou refuse dans #demandes. Refusée ou sans réponse, la demande
-- libère le restaurant pour tous après le délai réglé par l'admin, sauf si
-- celui qui le suit a avancé entre-temps : il le garde alors pour de bon.

create table public.commercial_visit_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.crm_restaurants (id) on delete cascade,
  requester_id uuid not null references public.commerciaux (id) on delete cascade,
  holder_id uuid not null references public.commerciaux (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'refused', 'released', 'kept')),
  decided_at timestamptz,
  discord_message_id text
);
-- Une seule demande ouverte par restaurant : la première arrivée passe.
create unique index commercial_visit_requests_open_idx on public.commercial_visit_requests (restaurant_id)
  where status in ('pending', 'refused');
create index commercial_visit_requests_requester_id_idx on public.commercial_visit_requests (requester_id);
create index commercial_visit_requests_holder_id_idx on public.commercial_visit_requests (holder_id);

alter table public.commercial_visit_requests enable row level security;
create policy "admin read" on public.commercial_visit_requests
  for select to authenticated using ((select public.is_admin()));

create function public.commercial_request_visit(p_restaurant uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_holder uuid;
  v_id uuid;
begin
  select commercial_id into v_holder from public.commercial_holds where restaurant_id = p_restaurant;
  if v_holder is null then
    raise exception 'Ce restaurant est libre : tu peux y aller directement.';
  end if;
  if v_holder = me.id then
    raise exception 'Ce restaurant est déjà le tien.';
  end if;
  insert into public.commercial_visit_requests (restaurant_id, requester_id, holder_id)
  values (p_restaurant, me.id, v_holder)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Une demande est déjà en cours sur ce restaurant.';
end;
$$;

-- La réponse du commercial qui suit le restaurant, depuis les boutons de
-- Discord : seul son compte Discord peut répondre. Clé service uniquement.
create function public.commercial_answer_request(p_request uuid, p_discord_user text, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.commercial_visit_requests;
begin
  select * into v from public.commercial_visit_requests where id = p_request for update;
  if v.id is null then
    raise exception 'Demande introuvable.';
  end if;
  if not exists (select 1 from public.commerciaux where id = v.holder_id and discord_user_id = p_discord_user) then
    raise exception 'Seul le commercial qui suit ce restaurant peut répondre.';
  end if;
  if v.status <> 'pending' then
    raise exception 'Cette demande a déjà une réponse.';
  end if;
  if p_accept then
    delete from public.commercial_holds where restaurant_id = v.restaurant_id and commercial_id = v.holder_id;
  end if;
  update public.commercial_visit_requests
  set status = case when p_accept then 'accepted' else 'refused' end, decided_at = now()
  where id = p_request;
end;
$$;
revoke execute on function public.commercial_answer_request(uuid, text, boolean) from public, anon, authenticated;

-- Tâche quotidienne : les demandes échues. Celui qui suit le restaurant a
-- avancé depuis la demande (une visite, une inscription) : il le garde ;
-- sinon le restaurant est libéré pour tous. Sans délai réglé : rien.
create function public.commercial_release_requests()
returns table (id uuid, status text, discord_message_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days int := (public.commercial_cfg()).visit_request_days;
  v public.commercial_visit_requests;
  v_advanced boolean;
begin
  if v_days is null then
    return;
  end if;
  for v in
    select * from public.commercial_visit_requests r
    where r.status in ('pending', 'refused') and r.created_at + make_interval(days => v_days) <= now()
    for update
  loop
    v_advanced := exists (
      select 1 from public.commercial_visits cv
      where cv.restaurant_id = v.restaurant_id and cv.commercial_id = v.holder_id and cv.created_at > v.created_at
    ) or exists (
      select 1 from public.commercial_signups s
      where s.restaurant_id = v.restaurant_id and s.commercial_id = v.holder_id and s.created_at > v.created_at
    );
    if not v_advanced then
      delete from public.commercial_holds where restaurant_id = v.restaurant_id and commercial_id = v.holder_id;
    end if;
    update public.commercial_visit_requests r
    set status = case when v_advanced then 'kept' else 'released' end, decided_at = now()
    where r.id = v.id;
    id := v.id;
    status := case when v_advanced then 'kept' else 'released' end;
    discord_message_id := v.discord_message_id;
    return next;
  end loop;
end;
$$;
revoke execute on function public.commercial_release_requests() from public, anon, authenticated;

-- La carte dit aussi si le commercial a une demande ouverte sur le restaurant.
drop function public.commercial_map(uuid);
create function public.commercial_map(p_restaurant uuid default null)
returns table (
  id uuid, name text, address text, city text, phone text, google_maps_url text,
  latitude double precision, longitude double precision,
  state text, holder text, mine boolean, contacted_by_lea boolean, requested boolean
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
      exists (
        select 1 from public.commercial_visit_requests q
        where q.restaurant_id = r.id and q.requester_id = me.id and q.status in ('pending', 'refused')
      )
    from public.crm_restaurants r
    left join public.commercial_holds h on h.restaurant_id = r.id
    left join public.commerciaux c on c.id = h.commercial_id
    where r.deleted_at is null and r.outreach_opted_out_at is null
      and (p_restaurant is null or r.id = p_restaurant)
      and r.latitude is not null and r.longitude is not null;
end;
$$;
