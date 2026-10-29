-- Refonte de l'espace commercial : la visite. Chaque visite enregistre son
-- résultat ; la première rend le restaurant « Visité par » son commercial.

create table public.commercial_visits (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.crm_restaurants (id) on delete cascade,
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  created_at timestamptz not null default now(),
  outcome text not null check (outcome in ('not_interested', 'absent')),
  -- Pas intéressé : le motif, et ses arguments.
  reason text check (reason in ('price', 'tool', 'time', 'other')),
  note text,
  -- Responsable absent : le contact récupéré pour le rappeler.
  contact_name text,
  contact_phone text,
  contact_email text,
  check (outcome <> 'not_interested' or reason is not null),
  check (outcome <> 'absent' or contact_phone is not null or contact_email is not null)
);
create index commercial_visits_restaurant_id_idx on public.commercial_visits (restaurant_id);
create index commercial_visits_commercial_id_idx on public.commercial_visits (commercial_id);

alter table public.commercial_visits enable row level security;
create policy "admin read" on public.commercial_visits
  for select to authenticated using ((select public.is_admin()));

-- La carte, ou un seul de ses restaurants (l'écran de visite).
drop function public.commercial_map();
create function public.commercial_map(p_restaurant uuid default null)
returns table (
  id uuid, name text, address text, city text, phone text, google_maps_url text,
  latitude double precision, longitude double precision,
  state text, holder text, mine boolean, contacted_by_lea boolean
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
      )
    from public.crm_restaurants r
    left join public.commercial_holds h on h.restaurant_id = r.id
    left join public.commerciaux c on c.id = h.commercial_id
    where r.deleted_at is null and r.outreach_opted_out_at is null
      and (p_restaurant is null or r.id = p_restaurant)
      and r.latitude is not null and r.longitude is not null;
end;
$$;

-- Enregistre une visite. Un restaurant libre devient celui du commercial ;
-- un restaurant suivi par un autre se demande (demande de visite).
create function public.commercial_visit(p_restaurant uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  r public.crm_restaurants;
  v_holder uuid;
  v_id uuid;
begin
  select * into r from public.crm_restaurants where id = p_restaurant and deleted_at is null;
  if r.id is null then
    raise exception 'Restaurant introuvable.';
  end if;
  if r.outreach_opted_out_at is not null then
    raise exception 'Ce restaurant ne veut plus être contacté.';
  end if;
  if public.commercial_is_client(r) then
    raise exception 'Ce restaurant est déjà client.';
  end if;

  insert into public.commercial_holds (restaurant_id, commercial_id)
  values (p_restaurant, me.id)
  on conflict (restaurant_id) do nothing;
  select commercial_id into v_holder from public.commercial_holds where restaurant_id = p_restaurant;
  if v_holder <> me.id then
    raise exception 'Ce restaurant est suivi par un autre commercial : fais une demande de visite.';
  end if;

  insert into public.commercial_visits (
    restaurant_id, commercial_id, outcome, reason, note, contact_name, contact_phone, contact_email)
  values (
    p_restaurant, me.id, p ->> 'outcome', nullif(p ->> 'reason', ''), nullif(btrim(p ->> 'note'), ''),
    nullif(btrim(p ->> 'contact_name'), ''), nullif(btrim(p ->> 'contact_phone'), ''),
    nullif(lower(btrim(p ->> 'contact_email')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
