-- Le client à table suit sa commande comme en fast food : reçue (à régler),
-- en préparation (encaissée, partie en cuisine), servie. order_ticket et les
-- signaux du canal « commande:<id> » valent désormais pour une commande de
-- table, qui n'a pas de numéro du jour : le client numérote les siennes.
-- Reprise de 20260929000003, seule la condition sur la commande change.

create or replace function public.order_ticket(p_order uuid)
returns table (
  order_number int,
  status public.order_status,
  created_at timestamptz,
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

create or replace function public.broadcast_order_status()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if (new.order_number is not null or new.table_id is not null)
     and (new.status is distinct from old.status
          or new.online_payment_started_at is distinct from old.online_payment_started_at) then
    perform realtime.send(
      jsonb_build_object('status', new.status),
      'statut',
      'commande:' || new.id::text,
      false
    );
  end if;
  return new;
end;
$$;

create or replace function public.broadcast_order_lines()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_order record;
begin
  for v_order in
    select o.id, o.status
    from orders o
    where (o.order_number is not null or o.table_id is not null)
      and o.id in (select order_id from changed)
  loop
    perform realtime.send(
      jsonb_build_object('status', v_order.status),
      'statut',
      'commande:' || v_order.id::text,
      false
    );
  end loop;
  return null;
end;
$$;
