-- Refonte de l'espace commercial, lot 6 : l'ancien espace est éteint.
--
-- Une demande de visite ne part que si celui qui suit le restaurant peut y
-- répondre depuis Discord ; et les restaurants d'un commercial dont le
-- contrat est fini redeviennent libres (tâche quotidienne).

create or replace function public.commercial_request_visit(p_restaurant uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.commerciaux := public.commercial_me('work');
  v_holder public.commerciaux;
  v_id uuid;
begin
  select c.* into v_holder
  from public.commercial_holds h join public.commerciaux c on c.id = h.commercial_id
  where h.restaurant_id = p_restaurant;
  if v_holder.id is null then
    raise exception 'Ce restaurant est libre : tu peux y aller directement.';
  end if;
  if v_holder.id = me.id then
    raise exception 'Ce restaurant est déjà le tien.';
  end if;
  if v_holder.discord_user_id is null then
    raise exception '% n''a pas encore relié son compte Discord : préviens l''équipe Ominin.',
      coalesce(v_holder.first_name, v_holder.email);
  end if;
  insert into public.commercial_visit_requests (restaurant_id, requester_id, holder_id)
  values (p_restaurant, me.id, v_holder.id)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Une demande est déjà en cours sur ce restaurant.';
end;
$$;

create function public.commercial_release_holds()
returns int
language sql
security definer
set search_path = ''
as $$
  with released as (
    delete from public.commercial_holds h
    using public.commerciaux c
    where c.id = h.commercial_id and c.ended_at <= now()
    returning 1
  )
  select count(*)::int from released;
$$;
revoke execute on function public.commercial_release_holds() from public, anon, authenticated;
grant execute on function public.commercial_release_holds() to service_role;
