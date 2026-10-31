-- L'onglet Clientes ne charge plus toutes ses lignes : l'en-tête demande ses
-- cumuls à la base. Invoker : la vue reste filtrée par la RLS des commandes.

create function public.shop_customer_totals(p_shop_id uuid)
returns table (customers int, revenue_cents bigint)
language sql stable
set search_path = public
as $$
  select count(*)::int, coalesce(sum(total_spent_cents), 0)::bigint
  from shop_customer_stats
  where shop_id = p_shop_id;
$$;

revoke execute on function public.shop_customer_totals(uuid) from public, anon;
grant execute on function public.shop_customer_totals(uuid) to authenticated;

-- Le score moyen des prospects qualifiés, sur tous et non sur la page affichée.
-- Invoker : la RLS d'outreach_prospects réserve la lecture aux admins.
create function public.outreach_qualified_score()
returns table (average int, scored int)
language sql stable
set search_path = public
as $$
  select round(avg(priority_score))::int, count(priority_score)::int
  from outreach_prospects
  where qualification = 'qualified';
$$;

revoke execute on function public.outreach_qualified_score() from public, anon;
grant execute on function public.outreach_qualified_score() to authenticated;
