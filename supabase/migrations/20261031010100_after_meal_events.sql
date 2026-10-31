-- Ce qui se passe sur la feuille de la suite du repas, geste par geste : chaque
-- apparition, chaque toucher, comment elle se ferme, et la commande qui suit.
-- Sans nom, ni téléphone, ni identifiant de visite : une apparition porte un id
-- tiré au hasard pour elle seule. La seule attache à un client est order_id, comme
-- menu_sessions.order_id. Plus fin que menu_suggestion_stats, compté une fois par
-- visite, qui reste tel quel.

create type public.after_meal_event as enum (
  'apparue',          -- la feuille est à l'écran
  'ajout',            -- une assiette ajoutée à la commande
  'retrait',          -- la même, retirée d'un toucher
  'ajout_combo',      -- le combo parfait ajouté
  'voir_commande',    -- « Voir la commande »
  'non_merci',        -- « Non merci » ou « Plus tard »
  'croix',            -- la croix
  'fermee_autrement', -- le fond, Échap, le geste de fermeture
  'avis',             -- le lien d'avis Google touché
  'page_quittee',     -- l'onglet passe en arrière-plan, feuille ouverte
  'commande'          -- une commande passée après un ajout
);

create table public.after_meal_events (
  id bigint generated always as identity primary key,
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  appearance uuid not null,
  event public.after_meal_event not null,
  moment text,
  -- Les assiettes montrées, sur « apparue ».
  shown_items uuid[],
  item_id uuid references public.items (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  -- Depuis l'apparition : le temps passé à regarder avant de toucher.
  ms_since_shown int,
  created_at timestamptz not null default now()
);

alter table public.after_meal_events enable row level security;

create index after_meal_events_etab_created
  on public.after_meal_events (etablissement_id, created_at);

-- Un rechargement ou un double envoi ne fait pas deux apparitions.
create unique index after_meal_events_one_shown
  on public.after_meal_events (appearance)
  where event = 'apparue';

create function public.after_meal_track(
  p_slug text,
  p_appearance uuid,
  p_event public.after_meal_event,
  p_moment text default null,
  p_shown_items uuid[] default null,
  p_item uuid default null,
  p_order uuid default null,
  p_ms int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Les mêmes valeurs que menu_track et menu_track_views.
  c_budget_per_minute constant int := 300;
  c_ttl_days constant int := 400;
  c_prune_odds constant numeric := 0.005;
  c_max_items constant int := 20;
  v_etab uuid;
  v_minute timestamptz := date_trunc('minute', now());
  v_n int;
begin
  select id into v_etab from etablissements where slug = p_slug;
  -- Silence volontaire, comme menu_track : un mouchard ne casse pas la page.
  if v_etab is null then
    return;
  end if;

  insert into menu_track_budget (etablissement_id, minute, n)
  values (v_etab, v_minute, 1)
  on conflict (etablissement_id, minute) do update set n = menu_track_budget.n + 1
  returning n into v_n;
  if v_n > c_budget_per_minute then
    return;
  end if;

  if random() < c_prune_odds then
    delete from after_meal_events
      where created_at < now() - make_interval(days => c_ttl_days);
  end if;

  -- Rien que ce qui appartient à CE restaurant.
  insert into after_meal_events (
    etablissement_id, appearance, event, moment, shown_items, item_id, order_id, ms_since_shown
  )
  values (
    v_etab,
    p_appearance,
    p_event,
    left(p_moment, 20),
    (select array_agg(i.id) from items i
     where i.etablissement_id = v_etab and i.id = any(p_shown_items[1:c_max_items])),
    (select i.id from items i where i.etablissement_id = v_etab and i.id = p_item),
    (select o.id from orders o where o.etablissement_id = v_etab and o.id = p_order),
    p_ms
  )
  on conflict do nothing;
end;
$$;

revoke execute on function
  public.after_meal_track(text, uuid, public.after_meal_event, text, uuid[], uuid, uuid, int)
  from public;
grant execute on function
  public.after_meal_track(text, uuid, public.after_meal_event, text, uuid[], uuid, uuid, int)
  to anon, authenticated;

-- La lecture de l'admin. Servies : les commandes passées « servie » sur la période,
-- ce que la feuille aurait pu suivre (le téléphone a pu ne jamais revenir). Recette :
-- les lignes de la commande qui suit, non annulée, dont le plat a été ajouté depuis
-- la feuille.
create function public.admin_after_meal_stats(
  p_etab uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with events as (
    select e.*
    from after_meal_events e
    where e.etablissement_id = p_etab
      and e.created_at >= p_from and e.created_at < p_to
      and (select public.is_admin())
  ),
  apparitions as (
    select appearance, moment, shown_items, created_at from events where event = 'apparue'
  ),
  added as (
    select appearance, item_id from events where event in ('ajout', 'ajout_combo')
  ),
  sold as (
    select oi.item_id, oi.quantity, oi.unit_price, oi.order_id
    from events c
    join orders o on o.id = c.order_id and o.status <> 'annulee'
    join order_items oi on oi.order_id = c.order_id
    join added a on a.appearance = c.appearance and a.item_id = oi.item_id
    where c.event = 'commande'
  )
  select jsonb_build_object(
    'served_orders', (
      select count(*)::int from orders o
      where o.etablissement_id = p_etab
        and o.served_at >= p_from and o.served_at < p_to
        and (select public.is_admin())
    ),
    'appearances', (select count(*)::int from apparitions),
    'by_event', coalesce((
      select jsonb_object_agg(event, jsonb_build_object(
               'total', total, 'appearances', appearances, 'median_ms', median_ms))
      from (
        select event, count(*)::int as total, count(distinct appearance)::int as appearances,
               (percentile_cont(0.5) within group (order by ms_since_shown))::int as median_ms
        from events group by event
      ) t
    ), '{}'::jsonb),
    'by_moment', coalesce((
      select jsonb_agg(jsonb_build_object('moment', moment, 'appearances', n) order by n desc)
      from (select moment, count(*)::int as n from apparitions group by moment) t
    ), '[]'::jsonb),
    'orders', (select count(distinct order_id)::int from sold),
    'revenue', (select coalesce(sum(quantity * unit_price), 0) from sold),
    'items', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.shown desc, t.name)
      from (
        select i.name,
               (select count(*)::int from apparitions a where i.id = any(a.shown_items)) as shown,
               (select count(*)::int from events e where e.event = 'ajout' and e.item_id = i.id) as added,
               (select count(*)::int from events e where e.event = 'retrait' and e.item_id = i.id) as removed,
               (select coalesce(sum(s.quantity), 0)::int from sold s where s.item_id = i.id) as sold
        from items i
        where i.etablissement_id = p_etab
          and exists (select 1 from apparitions a where i.id = any(a.shown_items))
      ) t
    ), '[]'::jsonb)
  )
$$;

revoke execute on function public.admin_after_meal_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_after_meal_stats(uuid, timestamptz, timestamptz) to authenticated;
