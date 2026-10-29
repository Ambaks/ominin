-- Refonte de l'espace commercial : la carte. Un restaurant visité reste au
-- commercial qui l'a visité (« Visité par ») jusqu'à sa libération.

create table public.commercial_holds (
  restaurant_id uuid primary key references public.crm_restaurants (id) on delete cascade,
  commercial_id uuid not null references public.commerciaux (id) on delete cascade,
  since timestamptz not null default now()
);
create index commercial_holds_commercial_id_idx on public.commercial_holds (commercial_id);

alter table public.commercial_holds enable row level security;
create policy "admin read" on public.commercial_holds
  for select to authenticated using ((select public.is_admin()));

-- Les restaurants de la carte et leur état : client, visité (par qui) ou
-- libre ; et s'ils ont déjà reçu un e-mail de Léa. Un restaurant qui ne veut
-- plus être contacté n'y figure pas.
create function public.commercial_map()
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
      and r.latitude is not null and r.longitude is not null;
end;
$$;
