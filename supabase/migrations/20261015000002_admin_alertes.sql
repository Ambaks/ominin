-- Notifications de l'admin au-delà du suivi : crons en panne, alertes du
-- backend, paiements refusés en série, inscriptions, chiffres de la veille,
-- clients qui décrochent, RDV du lendemain.

-- Compteur par clé d'alerte : n'envoie qu'à partir d'un seuil d'occurrences
-- dans une fenêtre, et pas deux fois dans le délai de répit. Sans lui, un cron
-- en panne toutes les 15 minutes sonnerait 96 fois par jour.
create table public.admin_alert_counters (
  key text primary key,
  window_start timestamptz not null,
  hits int not null,
  notified_at timestamptz
);
alter table public.admin_alert_counters enable row level security;

create function public.admin_alert_hit(
  p_key text,
  p_threshold int,
  p_window interval,
  p_cooldown interval
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v admin_alert_counters;
begin
  insert into admin_alert_counters as c (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when c.window_start < now() - p_window then now() else c.window_start end,
    hits = case when c.window_start < now() - p_window then 1 else c.hits + 1 end
  returning * into v;

  if v.hits >= p_threshold
     and (v.notified_at is null or v.notified_at < now() - p_cooldown) then
    update admin_alert_counters set notified_at = now() where key = p_key;
    return true;
  end if;
  return false;
end;
$$;

-- Chiffres d'une fenêtre par établissement et par boutique, pour les tâches
-- planifiées (clé service, sans session admin). Mêmes règles que
-- admin_menu_overview pour le CA (order_items.paid_at, hors commandes
-- annulées), toutes formes de commande comprises.
create function public.admin_service_figures(p_from timestamptz, p_to timestamptz)
returns table (
  kind text,
  id uuid,
  name text,
  revenue numeric,
  commission numeric,
  orders int,
  sessions int
)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select o.etablissement_id,
           sum(oi.quantity * oi.unit_price) as revenue,
           count(distinct o.id)::int as orders
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
    group by o.etablissement_id
  ),
  fees as (
    select o.etablissement_id, sum(o.platform_fee_cents)::numeric / 100 as commission
    from orders o
    where o.paid_online and o.status <> 'annulee'
      and o.created_at >= p_from and o.created_at < p_to
    group by o.etablissement_id
  ),
  visits as (
    select s.etablissement_id, count(*)::int as sessions
    from menu_sessions s
    where s.started_at >= p_from and s.started_at < p_to
    group by s.etablissement_id
  )
  select 'etablissement', e.id, e.name,
         coalesce(paid.revenue, 0), coalesce(fees.commission, 0),
         coalesce(paid.orders, 0), coalesce(visits.sessions, 0)
  from etablissements e
  left join paid on paid.etablissement_id = e.id
  left join fees on fees.etablissement_id = e.id
  left join visits on visits.etablissement_id = e.id
  union all
  select 'shop', s.id, s.name,
         coalesce(sum(o.total_cents) filter (where o.paid_at >= p_from and o.paid_at < p_to), 0)::numeric / 100,
         coalesce(sum(o.platform_fee_cents) filter (where o.paid_at >= p_from and o.paid_at < p_to), 0)::numeric / 100,
         (count(o.id) filter (where o.paid_at >= p_from and o.paid_at < p_to))::int,
         0
  from shops s
  left join shop_orders o on o.shop_id = s.id
  group by s.id, s.name;
$$;

revoke execute on function public.admin_alert_hit(text, int, interval, interval)
  from public, anon, authenticated;
revoke execute on function public.admin_service_figures(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_alert_hit(text, int, interval, interval)
  to service_role;
grant execute on function public.admin_service_figures(timestamptz, timestamptz)
  to service_role;
