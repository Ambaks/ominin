-- Refonte de l'espace commercial : l'inscription d'un restaurant pendant la
-- visite. Une ligne par inscription ; son id est le jeton du questionnaire
-- (QR montré au gérant, ou ouvert sur le téléphone du commercial). Les
-- étapes s'écrivent par la clé service, depuis les routes du questionnaire.

create table public.commercial_signups (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.crm_restaurants (id) on delete cascade,
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  created_at timestamptz not null default now(),
  etablissement_id uuid unique references public.etablissements (id) on delete set null,
  -- Type d'établissement et responsable à recontacter.
  kind text check (kind in ('restaurant', 'bar', 'club', 'fast_food', 'cafe', 'boulangerie')),
  manager_name text,
  manager_phone text,
  manager_email text,
  photos text[] not null default '{}',
  stripe_later boolean not null default false,
  hubrise_later boolean not null default false,
  finished_at timestamptz
);
create index commercial_signups_restaurant_id_idx on public.commercial_signups (restaurant_id);
create index commercial_signups_commercial_id_idx on public.commercial_signups (commercial_id);

alter table public.commercial_signups enable row level security;
create policy "admin read" on public.commercial_signups
  for select to authenticated using ((select public.is_admin()));

-- Le commercial prend le restaurant : refusé s'il est client, opposé, ou
-- suivi par un autre commercial ; libre, il devient le sien.
create function public.commercial_take(p_restaurant uuid, p_commercial uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.crm_restaurants;
  v_holder uuid;
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
  values (p_restaurant, p_commercial)
  on conflict (restaurant_id) do nothing;
  select commercial_id into v_holder from public.commercial_holds where restaurant_id = p_restaurant;
  if v_holder <> p_commercial then
    raise exception 'Ce restaurant est suivi par un autre commercial : fais une demande de visite.';
  end if;
end;
$$;
revoke execute on function public.commercial_take(uuid, uuid) from public, anon, authenticated;

create or replace function public.commercial_visit(p_restaurant uuid, p jsonb)
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

-- Lance l'inscription d'un restaurant, ou reprend celle qui n'a pas encore
-- créé de compte : le commercial qui revient au restaurant ne repart pas
-- d'un jeton neuf.
create function public.commercial_start_signup(p_restaurant uuid)
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
  select id into v_id from public.commercial_signups
  where restaurant_id = p_restaurant and commercial_id = me.id and etablissement_id is null and finished_at is null
  order by created_at desc limit 1;
  if v_id is null then
    insert into public.commercial_signups (restaurant_id, commercial_id)
    values (p_restaurant, me.id)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
