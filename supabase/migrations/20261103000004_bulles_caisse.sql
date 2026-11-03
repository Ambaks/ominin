-- Les places de bulle payées entrent dans l'encaissé du restaurant, mêlées aux
-- commandes : Paiements, le CA du jour et ses comparaisons. Une place de bulle
-- n'est pas une commande : elle n'entre ni dans le nombre de commandes, ni dans
-- le panier moyen.
--
-- Une part compte au jour de service de son paiement (paid_at), dans son mode :
-- en ligne (Square), carte ou espèces sur place (tender), « caisse » pour une
-- part sur place d'avant le mode. Elle sort de l'encaissé, comme une commande
-- annulée, quand elle est remboursée ou que sa réservation est fermée.

create index bulle_parts_paid_idx
  on public.bulle_parts (etablissement_id, paid_at)
  where paid_at is not null;

-- Chaque part qui a été payée. etat : « encaissee » compte ; « remboursee »
-- (rendue par Square), « a_rembourser » (réservation fermée, remboursement à
-- venir) et « annulee » (réservation annulée par le restaurant après un
-- règlement sur place) restent visibles sans compter.
create view public.bulle_encaissements
with (security_invoker = true) as
select
  p.id,
  p.etablissement_id,
  p.reservation_id,
  b.name as bulle_name,
  p.name,
  p.places,
  (p.amount_cents / 100.0)::numeric(10, 2) as amount,
  case
    when p.method = 'en_ligne' then 'en_ligne'
    else coalesce(p.tender::text, 'caisse')
  end as mode,
  p.paid_at,
  p.refunded_at,
  case
    when p.status = 'remboursee' then 'remboursee'
    when p.status = 'payee' and r.status in ('en_attente', 'confirmee', 'arrivee') then 'encaissee'
    when r.status = 'annulee' then 'annulee'
    else 'a_rembourser'
  end as etat
from public.bulle_parts p
join public.bulle_reservations r on r.id = p.reservation_id
join public.bulles b on b.id = r.bulle_id
where p.paid_at is not null;

revoke all on public.bulle_encaissements from anon;
grant select on public.bulle_encaissements to authenticated;

-- Les encaissements, commandes et places de bulle ensemble, du plus récent au
-- plus ancien : la liste de Paiements, page par page. Une commande se range à
-- sa création, une place à son paiement. Les statuts relus : payée sur place
-- (servie ou non), prête (fast food réglée, ou à emporter payée en ligne qui
-- attend son client), retirée, ou payée en ligne puis refusée par la caisse ;
-- isPaid trie ensuite ce qui compte. p_mode filtre sur un règlement de la
-- commande, ou sur le mode de la place.
create function public.gestion_paiements(
  p_etablissement_id uuid,
  p_mode text,
  p_limit int,
  p_offset int
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with paiements as (
    select 'commande'::text as kind, o.id, o.created_at as at
    from orders o
    where o.etablissement_id = p_etablissement_id
      and (o.status in ('payee', 'prete', 'servie', 'retiree') or (o.status = 'annulee' and o.paid_online))
      and (p_mode is null or exists (
        select 1 from order_payments p where p.order_id = o.id and p.mode::text = p_mode
      ))
    union all
    select 'bulle', e.id, e.paid_at
    from bulle_encaissements e
    where e.etablissement_id = p_etablissement_id
      and (p_mode is null or e.mode = p_mode)
  ),
  page as (
    select * from paiements order by at desc, id limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from paiements),
    'rows', coalesce((
      select jsonb_agg(
        case page.kind
          when 'commande' then (
            select jsonb_build_object('kind', 'commande', 'order', to_jsonb(o) || jsonb_build_object(
              'order_items', coalesce((select jsonb_agg(to_jsonb(i)) from order_items i where i.order_id = o.id), '[]'::jsonb),
              'order_payments', coalesce((select jsonb_agg(to_jsonb(p)) from order_payments p where p.order_id = o.id), '[]'::jsonb)
            ))
            from orders o where o.id = page.id
          )
          else (
            select jsonb_build_object('kind', 'bulle', 'part', to_jsonb(e))
            from bulle_encaissements e where e.id = page.id
          )
        end
        order by page.at desc, page.id
      )
      from page
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.gestion_paiements(uuid, text, int, int) from public, anon;
grant execute on function public.gestion_paiements(uuid, text, int, int) to authenticated;

-- Les ventes jour par jour d'avant la fenêtre chargée : revenue compte les
-- places de bulle encaissées (bulles en dit la part), orders les seules
-- commandes. Mêmes règles que les sélecteurs (lib/gestion/selectors.ts).
drop function public.gestion_daily_sales(uuid, date, date, int);

create function public.gestion_daily_sales(
  p_etablissement_id uuid,
  p_from date,
  p_to date,
  p_day_end_hour int
)
returns table (day date, revenue numeric, orders int, bulles numeric)
language sql
stable
security definer
set search_path = public
as $$
  with paid as (
    select
      o.id,
      (
        coalesce(
          (select max(p.paid_at) from order_payments p where p.order_id = o.id),
          o.created_at
        ) at time zone 'Europe/Paris'
      ) - make_interval(hours => p_day_end_hour) as service_at
    from orders o
    where o.etablissement_id = p_etablissement_id
      and o.etablissement_id in (select public.member_etablissements())
      and o.created_at >= ((p_from - 7)::timestamp at time zone 'Europe/Paris')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
      and case
        when o.type = 'collect' then
          o.status <> 'annulee' and (o.paid_online or o.payment_mode is not null)
        else
          o.status in ('payee', 'servie')
          or (o.order_number is not null and o.status = 'prete')
      end
  ),
  order_days as (
    select paid.service_at::date as day, coalesce(sum(lines.total), 0) as revenue, count(*)::int as orders
    from paid
    cross join lateral (
      select sum(i.quantity * i.unit_price) as total
      from order_items i
      where i.order_id = paid.id
    ) lines
    group by 1
  ),
  bulle_days as (
    select
      ((e.paid_at at time zone 'Europe/Paris') - make_interval(hours => p_day_end_hour))::date as day,
      sum(e.amount) as bulles
    from bulle_encaissements e
    where e.etablissement_id = p_etablissement_id
      and e.etablissement_id in (select public.member_etablissements())
      and e.etat = 'encaissee'
      and e.paid_at >= ((p_from - 1)::timestamp at time zone 'Europe/Paris')
      and e.paid_at < ((p_to + 1)::timestamp at time zone 'Europe/Paris')
    group by 1
  )
  select
    coalesce(o.day, b.day),
    coalesce(o.revenue, 0) + coalesce(b.bulles, 0),
    coalesce(o.orders, 0),
    coalesce(b.bulles, 0)
  from order_days o
  full join bulle_days b on b.day = o.day
  where coalesce(o.day, b.day) >= p_from and coalesce(o.day, b.day) < p_to
  order by 1;
$$;

revoke execute on function public.gestion_daily_sales(uuid, date, date, int) from public, anon;
grant execute on function public.gestion_daily_sales(uuid, date, date, int) to authenticated;
