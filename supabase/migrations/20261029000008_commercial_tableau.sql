-- Refonte de l'espace commercial, lot 5 : le tableau de bord et la
-- commission des restaurants inscrits pendant la visite.
--
-- Un restaurant inscrit devient Client Apporté de son commercial le jour où
-- il est client (Stripe et HubRise branchés) : sa commission court de ce
-- jour pour la durée réglée. Le Client Apporté porte désormais lui-même son
-- commercial et son restaurant ; la déclaration n'est plus qu'une origine
-- parmi deux.

alter table public.commercial_clients
  add column commercial_id uuid references public.commerciaux (id),
  add column restaurant_id uuid references public.crm_restaurants (id),
  add column signup_id uuid unique references public.commercial_signups (id),
  alter column declaration_id drop not null,
  add check (num_nonnulls(declaration_id, signup_id) = 1);

update public.commercial_clients c
set commercial_id = d.commercial_id, restaurant_id = d.restaurant_id
from public.commercial_declarations d
where d.id = c.declaration_id;

-- Les Clients Apportés nés d'une déclaration (lot 2) se complètent seuls.
create function public.commercial_clients_from_declaration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.declaration_id is not null then
    select d.commercial_id, d.restaurant_id into new.commercial_id, new.restaurant_id
    from public.commercial_declarations d where d.id = new.declaration_id;
  end if;
  return new;
end;
$$;
create trigger commercial_clients_from_declaration
  before insert on public.commercial_clients
  for each row execute function public.commercial_clients_from_declaration();

alter table public.commercial_clients
  alter column commercial_id set not null,
  alter column restaurant_id set not null;
create index commercial_clients_commercial_idx on public.commercial_clients (commercial_id);

create or replace function public.commercial_month_lines(p_commercial uuid, p_month date)
returns table (
  client_id uuid, restaurant_id uuid, name text,
  menu_cents bigint, shop_cents bigint, club_cents bigint, invoice_cents bigint,
  base_cents bigint, commission_cents bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('month', p_month::timestamp)) at time zone 'Europe/Paris' as lo,
           (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone 'Europe/Paris' as hi
  )
  select c.id, r.id, coalesce(e.name, s.name, r.name),
         b.menu_cents, b.shop_cents, b.club_cents, b.invoice_cents,
         b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents,
         round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
               * (public.commercial_cfg()).commission_percent / 100)::bigint
  from public.commercial_clients c
  join public.crm_restaurants r on r.id = c.restaurant_id
  left join public.etablissements e on e.id = c.etablissement_id
  left join public.shops s on s.id = c.shop_id,
  bounds,
  lateral public.commercial_base(c, bounds.lo, bounds.hi) b
  where c.commercial_id = p_commercial and c.validated_at is not null and c.commission_from is not null
  order by 3;
$$;

create or replace function public.commercial_draft_statements()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := (date_trunc('month', now() at time zone 'Europe/Paris') - interval '1 month')::date;
  m record;
  v_count int := 0;
begin
  for m in
    select f.commercial_id, g.month::date as month
    from (
      select c.commercial_id, min(c.commission_from) as since
      from public.commercial_clients c
      where c.validated_at is not null and c.commission_from is not null
      group by c.commercial_id
    ) f,
    generate_series(date_trunc('month', f.since at time zone 'Europe/Paris'), v_month::timestamp, interval '1 month') g(month)
    where not exists (
      select 1 from public.commercial_statements s
      where s.commercial_id = f.commercial_id and s.month = g.month::date and s.status <> 'draft'
    )
    order by 1, 2
  loop
    if m.month = v_month
       or exists (select 1 from public.commercial_statements s where s.commercial_id = m.commercial_id and s.month = m.month)
       or exists (select 1 from public.commercial_month_lines(m.commercial_id, m.month) l where l.commission_cents <> 0) then
      perform public.commercial_draft_statement(m.commercial_id, m.month);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Inscriptions finies qui attendent Stripe ou HubRise : la tâche quotidienne
-- relit leur état chez Stripe et HubRise, puis appelle commercial_signup_client.
create function public.commercial_pending_signups()
returns table (id uuid, etablissement_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.etablissement_id
  from public.commercial_signups s
  where s.finished_at is not null and s.etablissement_id is not null
    and not exists (select 1 from public.commercial_clients c where c.signup_id = s.id);
$$;
revoke execute on function public.commercial_pending_signups() from public, anon, authenticated;
grant execute on function public.commercial_pending_signups() to service_role;

-- Le restaurant inscrit est client : relié à son établissement, et Client
-- Apporté de son commercial si son contrat court encore. Vrai la première fois.
create function public.commercial_signup_client(p_signup uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.commercial_signups;
  v_id uuid;
begin
  select * into s from public.commercial_signups where id = p_signup;
  if s.etablissement_id is null then
    raise exception 'Inscription sans établissement.';
  end if;
  update public.crm_restaurants set etablissement_id = s.etablissement_id
  where id = s.restaurant_id and etablissement_id is null;
  insert into public.commercial_clients (commercial_id, restaurant_id, signup_id, etablissement_id, commission_from, validated_at)
  select s.commercial_id, s.restaurant_id, s.id, s.etablissement_id, now(), now()
  from public.commerciaux m
  where m.id = s.commercial_id and (m.ended_at is null or m.ended_at > now())
  on conflict do nothing
  returning id into v_id;
  return v_id is not null;
end;
$$;
revoke execute on function public.commercial_signup_client(uuid) from public, anon, authenticated;
grant execute on function public.commercial_signup_client(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Le tableau de bord : chaque restaurant que le commercial a visité ou
-- inscrit, son état, et pour ses clients ce qu'ils lui ont rapporté.
--   signed          Client Apporté
--   waiting         inscription commencée, pas encore client (missing : ce qui manque)
--   not_interested  dernière visite : pas intéressé
--   absent          dernière visite : responsable absent, contact à rappeler
create function public.commercial_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  month as (select (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris' as lo),
  mine as (
    select v.restaurant_id, v.created_at as at from public.commercial_visits v, me where v.commercial_id = me.id
    union all
    select s.restaurant_id, s.created_at from public.commercial_signups s, me where s.commercial_id = me.id
  ),
  places as (select restaurant_id, max(at) as at from mine group by restaurant_id)
  select jsonb_build_object(
    'percent', cfg.commission_percent,
    'term_months', cfg.term_months,
    'restaurants', coalesce((select jsonb_agg(item order by item ->> 'at' desc) from (
    select jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'at', p.at,
      'status', case
        when c.id is not null then 'signed'
        when s.id is not null then 'waiting'
        else v.outcome
      end,
      'missing', case
        when c.id is not null or s.id is null then null
        when s.etablissement_id is null then array['account']
        else array_remove(array[
          case when not exists (select 1 from public.payment_accounts a
                                where a.etablissement_id = s.etablissement_id and a.charges_enabled) then 'stripe' end,
          case when not exists (select 1 from public.hubrise_connections h
                                where h.etablissement_id = s.etablissement_id) then 'hubrise' end
        ], null)
      end,
      'signup_id', s.id,
      'commission_from', c.commission_from,
      'commission_until', least(c.commission_from + make_interval(months => cfg.term_months), c.ended_at),
      'earned_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                    * cfg.commission_percent / 100)::bigint
                       from public.commercial_base(c, c.commission_from, 'infinity') b),
      'month_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                   * cfg.commission_percent / 100)::bigint
                      from public.commercial_base(c, month.lo, 'infinity') b)
    ) as item
    from places p
    join public.crm_restaurants r on r.id = p.restaurant_id
    cross join me cross join month
    left join lateral (
      select * from public.commercial_clients c
      where c.restaurant_id = r.id and c.commercial_id = me.id and c.validated_at is not null
      order by c.commission_from desc limit 1
    ) c on true
    left join lateral (
      select * from public.commercial_signups s
      where s.restaurant_id = r.id and s.commercial_id = me.id
      order by s.created_at desc limit 1
    ) s on true
    left join lateral (
      select v.outcome from public.commercial_visits v
      where v.restaurant_id = r.id and v.commercial_id = me.id
      order by v.created_at desc limit 1
    ) v on true
  ) items), '[]'))
  from cfg, me;
$$;
revoke execute on function public.commercial_dashboard() from public, anon;
grant execute on function public.commercial_dashboard() to authenticated;
