-- Le combo parfait quitte l'Aperçu du gérant : ce que les suggestions du menu
-- ont fait commander se lit dans l'admin, par établissement (p_etab) ou sur
-- toute la flotte (p_etab null, démos exclues comme dans la Synthèse). Mêmes
-- règles que l'ancien panneau : annulées exclues, période sur la date de
-- commande, tous types de commande, une ligne fusionnée compte en entier.
-- Proposées et retenues par sorte, suite du repas comprise, calculées comme dans
-- admin_menu_pilotage ; la suite du repas reste à 0 tant qu'elle est en démo.
create function public.admin_combo_parfait(
  p_etab uuid, p_from timestamptz, p_to timestamptz, p_top int
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with lines as (
    select oi.order_id, oi.name, oi.accord, oi.quantity, oi.quantity * oi.unit_price as amount
    from order_items oi
    join orders o on o.id = oi.order_id
    join etablissements e on e.id = o.etablissement_id
    where o.status <> 'annulee'
      and o.created_at >= p_from and o.created_at < p_to
      and (case when p_etab is null then not e.demo else e.id = p_etab end)
      and (select public.is_admin())
  ),
  by_source as (
    select accord, count(*)::int as lines, sum(amount) as revenue
    from lines where accord is not null group by accord
  ),
  top as (
    select name, sum(quantity)::int as quantity, sum(amount) as revenue
    from lines where accord is not null
    group by name order by sum(quantity) desc, name limit p_top
  ),
  shown as (
    select s.kind, sum(s.shown)::int as shown
    from menu_suggestion_stats s
    join etablissements e on e.id = s.etablissement_id
    where s.day >= p_from::date and s.day <= p_to::date
      and (case when p_etab is null then not e.demo else e.id = p_etab end)
      and (select public.is_admin())
    group by s.kind
  ),
  accepted as (
    select accord, count(distinct order_id)::int as orders, sum(amount) as revenue
    from lines where accord is not null group by accord
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(amount) from lines where accord is not null), 0),
    'lines', (select count(*) from lines where accord is not null),
    'total', coalesce((select sum(amount) from lines), 0),
    'by_source', coalesce((select jsonb_agg(jsonb_build_object('source', accord, 'lines', lines, 'revenue', revenue)) from by_source), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'revenue', revenue) order by quantity desc, name) from top), '[]'::jsonb),
    'suggestions', (
      select jsonb_agg(jsonb_build_object(
               'kind', k.kind,
               'shown', coalesce(shown.shown, 0),
               'orders', coalesce(accepted.orders, 0),
               'revenue', coalesce(accepted.revenue, 0)
             ) order by k.kind)
      from unnest(enum_range(null::public.menu_suggestion_kind)) as k(kind)
      left join shown on shown.kind = k.kind
      left join accepted on accepted.accord::text = k.kind::text
    )
  );
$$;

revoke execute on function public.admin_combo_parfait(uuid, timestamptz, timestamptz, int) from public, anon;
grant execute on function public.admin_combo_parfait(uuid, timestamptz, timestamptz, int) to authenticated;
