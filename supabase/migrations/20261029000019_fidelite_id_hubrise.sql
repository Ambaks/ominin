-- La liste des clients fidélité montre aussi l'id du client chez HubRise
-- (guide d'intégration HubRise : un id stocké s'affiche). Le type de retour
-- change : la fonction est recréée, ses droits avec.

drop function public.loyalty_customers_summary(uuid);

create function public.loyalty_customers_summary(p_etablissement_id uuid)
returns table (
  id uuid,
  contact text,
  points int,
  last_activity timestamptz,
  hubrise_customer_id text
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  return query
  select lc.id,
         lc.contact,
         coalesce(sum(le.points), 0)::int,
         greatest(lc.created_at, max(le.created_at)),
         lc.hubrise_customer_id
  from loyalty_customers lc
  left join loyalty_entries le on le.customer_id = lc.id
  where lc.etablissement_id = p_etablissement_id
  group by lc.id
  order by 4 desc;
end;
$$;

revoke execute on function public.loyalty_customers_summary(uuid) from public, anon;
grant execute on function public.loyalty_customers_summary(uuid) to authenticated;
