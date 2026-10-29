-- Taux de commission propre à chaque commercial (contrat, version 3,
-- art. 4.6). Vide : le taux de base de commercial_settings. Ominin peut le
-- relever, jamais le baisser ; une hausse vaut pour les relevés à venir :
-- chaque relevé porte le taux qu'il applique, et la régularisation d'un mois
-- déjà envoyé le recalcule à ce taux-là.
--
-- Ominin peut aussi résilier avec préavis (art. 7.5) : nouveau motif de fin.

alter table public.commerciaux
  add column commission_percent numeric check (commission_percent > 0 and commission_percent <= 100),
  drop constraint commerciaux_end_reason_check,
  add constraint commerciaux_end_reason_check
    check (end_reason in ('term', 'resignation', 'termination', 'breach', 'immediate', 'mutual'));

-- Jamais sous le taux de base, jamais sous le taux en cours (vide vaut base),
-- que l'écriture passe par admin_set_commission_percent ou par la RLS admin.
create function public.commerciaux_commission_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base numeric := (public.commercial_cfg()).commission_percent;
  v_floor numeric := greatest(v_base, old.commission_percent);
begin
  if coalesce(new.commission_percent, v_base) < v_floor then
    raise exception 'Le taux d''un commercial ne baisse pas : au moins % %%.', v_floor;
  end if;
  return new;
end;
$$;
revoke execute on function public.commerciaux_commission_guard() from public, anon, authenticated;
create trigger commerciaux_commission_guard
  before insert or update of commission_percent on public.commerciaux
  for each row execute function public.commerciaux_commission_guard();

-- Taux appliqué aujourd'hui : le sien, jamais moins que la base.
create function public.commercial_rate(p_commercial uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(m.commission_percent, cfg.commission_percent)
  from public.commercial_cfg() cfg
  left join public.commerciaux m on m.id = p_commercial;
$$;
revoke execute on function public.commercial_rate(uuid) from public, anon, authenticated;

create function public.admin_set_commission_percent(p_commercial uuid, p_percent numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_require();
  update public.commerciaux set commission_percent = p_percent where id = p_commercial;
  if not found then
    raise exception 'Commercial introuvable.';
  end if;
end;
$$;
revoke execute on function public.admin_set_commission_percent(uuid, numeric) from public, anon;
grant execute on function public.admin_set_commission_percent(uuid, numeric) to authenticated;

-- Le taux de chaque relevé, figé avec ses lignes à l'envoi. Les relevés
-- existants ont tous été calculés au taux de base.
alter table public.commercial_statements add column commission_percent numeric;
update public.commercial_statements set commission_percent = (select commission_percent from public.commercial_settings);
alter table public.commercial_statements alter column commission_percent set not null;

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
               * public.commercial_rate(p_commercial) / 100)::bigint
  from public.commercial_clients c
  join public.crm_restaurants r on r.id = c.restaurant_id
  left join public.etablissements e on e.id = c.etablissement_id
  left join public.shops s on s.id = c.shop_id,
  bounds,
  lateral public.commercial_base(c, bounds.lo, bounds.hi) b
  where c.commercial_id = p_commercial and c.validated_at is not null and c.commission_from is not null
  order by 3;
$$;

-- Brouillon d'un mois au taux du jour ; la régularisation d'un mois envoyé
-- le recalcule au taux de son relevé.
create or replace function public.commercial_draft_statement(p_commercial uuid, p_month date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_percent numeric := public.commercial_rate(p_commercial);
  v_lines jsonb;
  v_auto jsonb;
  v_id uuid;
begin
  select coalesce(jsonb_agg(to_jsonb(l)), '[]') into v_lines
  from public.commercial_month_lines(p_commercial, p_month) l;

  select coalesce(jsonb_agg(jsonb_build_object(
           'label', 'Régularisation de ' || to_char(f.month, 'MM/YYYY'),
           'month', f.month, 'cents', f.gap, 'auto', true)), '[]')
  into v_auto
  from (
    select s.month,
           coalesce((select sum(round(l.base_cents * s.commission_percent / 100)::bigint)
                     from public.commercial_month_lines(p_commercial, s.month) l), 0)
           - coalesce((select sum((x ->> 'commission_cents')::bigint) from jsonb_array_elements(s.lines) x), 0)
           - coalesce((select sum((a ->> 'cents')::bigint)
                       from public.commercial_statements o, jsonb_array_elements(o.adjustments) a
                       where o.commercial_id = p_commercial and o.status <> 'draft'
                         and (a ->> 'auto')::boolean and (a ->> 'month')::date = s.month), 0) as gap
    from public.commercial_statements s
    where s.commercial_id = p_commercial and s.status <> 'draft' and s.month < p_month
  ) f
  where f.gap <> 0;

  insert into public.commercial_statements (commercial_id, month, commission_percent, lines, adjustments, total_cents)
  values (p_commercial, p_month, v_percent, v_lines, v_auto, public.commercial_statement_total(v_lines, v_auto))
  on conflict (commercial_id, month) do update
    set commission_percent = excluded.commission_percent,
        lines = excluded.lines,
        adjustments = excluded.adjustments || coalesce((
          select jsonb_agg(a) from jsonb_array_elements(public.commercial_statements.adjustments) a
          where not coalesce((a ->> 'auto')::boolean, false)), '[]'),
        total_cents = public.commercial_statement_total(
          excluded.lines,
          excluded.adjustments || coalesce((
            select jsonb_agg(a) from jsonb_array_elements(public.commercial_statements.adjustments) a
            where not coalesce((a ->> 'auto')::boolean, false)), '[]'))
    where public.commercial_statements.status = 'draft'
  returning id into v_id;
  if v_id is null then
    raise exception 'Ce relevé est déjà envoyé : une correction passe par le relevé suivant.';
  end if;
  return v_id;
end;
$$;

create or replace function public.commercial_month_estimate()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('money'))
  select jsonb_build_object(
    'month', date_trunc('month', now() at time zone 'Europe/Paris')::date,
    'percent', public.commercial_rate(me.id),
    'lines', coalesce((
      select jsonb_agg(to_jsonb(l))
      from public.commercial_month_lines(me.id, date_trunc('month', now() at time zone 'Europe/Paris')::date) l), '[]'))
  from me;
$$;

-- Le tableau de bord, au taux du commercial.
create or replace function public.commercial_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select * from public.commercial_me('work')),
  cfg as (select * from public.commercial_cfg()),
  rate as (select public.commercial_rate(me.id) as percent from me),
  month as (select (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris' as lo),
  mine as (
    select v.restaurant_id, v.created_at as at from public.commercial_visits v, me where v.commercial_id = me.id
    union all
    select s.restaurant_id, s.created_at from public.commercial_signups s, me where s.commercial_id = me.id
  ),
  places as (select restaurant_id, max(at) as at from mine group by restaurant_id)
  select jsonb_build_object(
    'percent', rate.percent,
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
                                    * rate.percent / 100)::bigint
                       from public.commercial_base(c, c.commission_from, 'infinity') b),
      'month_cents', (select round((b.menu_cents + b.shop_cents + b.club_cents + b.invoice_cents)
                                   * rate.percent / 100)::bigint
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
  from cfg, rate;
$$;
