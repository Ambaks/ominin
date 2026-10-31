-- L'heure où une commande passe « servie », rendue au téléphone du client : la
-- suite du repas en production se compte depuis elle, page fermée entre-temps.
-- Là où le ticket part en cuisine à l'encaissement, c'est l'heure du ticket, pas
-- celle de l'assiette sur la table. order_items.served_at ne remplace pas : posé
-- à l'impression, il ne suit pas une commande servie à la main.

alter table public.orders add column served_at timestamptz;

create function public.stamp_served()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.served_at := now();
  return new;
end;
$$;

revoke execute on function public.stamp_served() from public, anon, authenticated;

create trigger orders_stamp_served
  before update of status on public.orders
  for each row
  when (new.status = 'servie' and old.status is distinct from 'servie')
  execute function public.stamp_served();

-- Reprise de 20261022000002 : seule la colonne served_at s'ajoute. Le type de
-- retour change, la fonction se recrée et ses droits avec elle.
drop function public.order_ticket(uuid);

create function public.order_ticket(p_order uuid)
returns table (
  order_number int,
  status public.order_status,
  created_at timestamptz,
  served_at timestamptz,
  total numeric,
  due numeric,
  paid boolean,
  paying boolean,
  items jsonb
)
language sql stable security definer
set search_path = public
as $$
  select
    o.order_number,
    o.status,
    o.created_at,
    o.served_at,
    (select coalesce(sum(oi.quantity * oi.unit_price), 0)
     from order_items oi where oi.order_id = o.id),
    (select coalesce(sum(oi.quantity * oi.unit_price), 0)
     from order_items oi where oi.order_id = o.id and oi.paid_mode is null),
    o.payment_mode is not null,
    o.online_payment_started_at is not null and not o.paid_online,
    (select coalesce(jsonb_agg(jsonb_build_object(
              'name', l.name, 'quantity', l.quantity, 'choices', l.choices)
            order by l.name), '[]'::jsonb)
     from (select oi.name, sum(oi.quantity) as quantity,
                  (select coalesce(jsonb_agg(c.value->>'choiceName' order by c.ordinality), '[]'::jsonb)
                   from jsonb_array_elements(oi.options) with ordinality c) as choices
           from order_items oi where oi.order_id = o.id
           group by oi.name, oi.options) l)
  from orders o
  join etablissement_settings s on s.etablissement_id = o.etablissement_id
  cross join lateral (
    select
      (o.created_at at time zone 'Europe/Paris'
       - make_interval(hours => s.order_number_reset_hour))::date as ordered,
      (now() at time zone 'Europe/Paris'
       - make_interval(hours => s.order_number_reset_hour))::date as today
  ) d
  where o.id = p_order
    and (o.order_number is not null or o.table_id is not null)
    and (d.ordered = d.today
         or (d.ordered = d.today - 1 and o.status not in ('servie', 'annulee')));
$$;

revoke execute on function public.order_ticket(uuid) from public;
grant execute on function public.order_ticket(uuid) to anon, authenticated;
