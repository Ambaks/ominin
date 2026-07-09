-- Performance RLS sur les tables à fort volume (orders, order_items).
-- current_member_role(etablissement_id) est SECURITY DEFINER : Postgres ne
-- peut pas l'inliner et l'exécute pour CHAQUE ligne lue (et chaque événement
-- realtime). On le remplace, sur les chemins chauds, par un test
-- d'appartenance `in (sous-requête stable)` que le planner évalue une seule
-- fois par requête (hashed subplan). Les policies d'écriture, qui touchent
-- peu de lignes, restent sur current_member_role.

-- Établissements du membre courant. SECURITY DEFINER : lisible depuis les
-- policies sans déclencher la RLS de memberships (pas de récursion).
create or replace function public.member_etablissements()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select etablissement_id from public.memberships
  where user_id = auth.uid();
$$;

revoke execute on function public.member_etablissements() from public, anon;
grant execute on function public.member_etablissements() to authenticated;

drop policy "member read" on public.orders;
create policy "member read" on public.orders
  for select to authenticated
  using (etablissement_id in (select public.member_etablissements()));

drop policy "member update" on public.orders;
create policy "member update" on public.orders
  for update to authenticated
  using (etablissement_id in (select public.member_etablissements()))
  with check (etablissement_id in (select public.member_etablissements()));

drop policy "member read" on public.order_items;
create policy "member read" on public.order_items
  for select to authenticated
  using (order_id in (
    select id from public.orders
    where etablissement_id in (select public.member_etablissements())
  ));

-- Le store borne désormais les commandes par (etablissement_id, created_at) :
-- l'index composite couvre ce filtre et le tri ; l'ancien index mono-colonne
-- devient un préfixe redondant.
drop index public.orders_etablissement_idx;
create index orders_etablissement_created_idx
  on public.orders (etablissement_id, created_at);
