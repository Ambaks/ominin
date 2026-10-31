-- Le combo parfait quitte l'Aperçu du gérant : ce que les suggestions du menu
-- ont fait commander se lit dans l'admin, par établissement (p_etab) ou sur
-- toute la flotte (p_etab null, démos exclues comme dans la Synthèse). Mêmes
-- règles que l'ancien panneau : annulées exclues, période sur la date de
-- commande, tous types de commande, une ligne fusionnée compte en entier.
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
    select oi.name, oi.accord, oi.quantity, oi.quantity * oi.unit_price as amount
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
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(amount) from lines where accord is not null), 0),
    'lines', (select count(*) from lines where accord is not null),
    'total', coalesce((select sum(amount) from lines), 0),
    'by_source', coalesce((select jsonb_agg(jsonb_build_object('source', accord, 'lines', lines, 'revenue', revenue)) from by_source), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'revenue', revenue) order by quantity desc, name) from top), '[]'::jsonb)
  );
$$;

revoke execute on function public.admin_combo_parfait(uuid, timestamptz, timestamptz, int) from public, anon;
grant execute on function public.admin_combo_parfait(uuid, timestamptz, timestamptz, int) to authenticated;
