-- Deux mesures qui manquaient à l'analytique du menu QR.
--
--   - menu_item_views : les ouvertures de la fiche d'un plat. menu_item_clicks
--     ne compte que les touches « Ajouter », et l'admin les présentait comme
--     des plats vus.
--   - online_payment_attempts : le sort de chaque paiement en ligne. Une
--     tentative expirée supprime sa commande : ni l'échec ni son motif ne
--     laissaient de trace, et le taux de réussite paraissait parfait.
--
-- Même parti pris que 20260911000001_menu_analytics : aucune donnée
-- personnelle. Une vue est un compteur par plat et par jour, sans lien avec la
-- visite. Une tentative ne garde le lien vers sa commande que tant qu'elle est
-- en cours : une fois close, elle ne dit plus que le restaurant, l'heure et
-- l'issue (contrainte online_payment_attempts_closed_unlinked).

-- --------------------------------------------------------------------------
-- Vues par plat
-- --------------------------------------------------------------------------

create table public.menu_item_views (
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  day date not null,
  views int not null default 0,
  primary key (etablissement_id, day, item_id)
);

-- RLS active, aucune policy : même régime que menu_item_clicks.
alter table public.menu_item_views enable row level security;

-- --------------------------------------------------------------------------
-- Journal des tentatives de paiement en ligne
-- --------------------------------------------------------------------------

create type public.online_payment_outcome as enum (
  'en_cours',
  'reussi',
  -- Écartée sans qu'aucun refus soit connu : le client est parti.
  'expire',
  -- Écartée après un refus : le client a essayé, le paiement n'est pas passé.
  'echoue',
  -- Le client a renoncé au paiement en ligne : la commande reste due en caisse.
  'comptoir'
);

create table public.online_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  outcome public.online_payment_outcome not null default 'en_cours',
  -- L'encaisseur a refusé au moins une fois, même si un second essai a réussi.
  refused boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint online_payment_attempts_closed_unlinked
    check (outcome = 'en_cours' or order_id is null),
  constraint online_payment_attempts_closed_dated
    check ((outcome = 'en_cours') = (ended_at is null))
);

-- Seules les tentatives en cours ont une commande : une par commande au plus,
-- et un index qui ne grossit pas avec le journal.
create unique index online_payment_attempts_order_idx
  on public.online_payment_attempts (order_id)
  where order_id is not null;
create index online_payment_attempts_day_idx
  on public.online_payment_attempts (etablissement_id, started_at);

-- RLS active, aucune policy : écrit par le déclencheur et par le serveur.
alter table public.online_payment_attempts enable row level security;

-- Un déclencheur plutôt qu'une écriture dans chaque route : Stripe, Square,
-- SumUp et la démonstration passent tous par ces colonnes, et aucun nouveau
-- chemin ne pourra oublier le journal. Une relance sur la même commande
-- (online_payment_started_at réécrit) reste la même tentative.
create function public.orders_log_online_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outcome public.online_payment_outcome;
begin
  if new.online_payment_started_at is not null
     and not new.paid_online
     and new.status <> 'annulee'
     and (tg_op = 'INSERT' or old.online_payment_started_at is null) then
    insert into online_payment_attempts (etablissement_id, order_id)
    values (new.etablissement_id, new.id)
    on conflict (order_id) where order_id is not null do nothing;
    return null;
  end if;
  if tg_op = 'INSERT' then
    return null;
  end if;

  v_outcome := case
    when new.paid_online and not old.paid_online then 'reussi'
    when new.status = 'annulee' and old.status <> 'annulee' then 'expire'
    when new.online_payment_started_at is null
         and old.online_payment_started_at is not null then 'comptoir'
  end;
  if v_outcome is null then
    return null;
  end if;

  -- Rien à payer en euros : place_order efface l'heure dans la transaction qui
  -- a créé la commande. Il n'y a jamais eu de tentative.
  if v_outcome = 'comptoir' then
    delete from online_payment_attempts
    where order_id = new.id and started_at = now();
  end if;

  update online_payment_attempts
  set outcome = case when v_outcome = 'expire' and refused then 'echoue' else v_outcome end,
      ended_at = now(),
      order_id = null
  where order_id = new.id;
  return null;
exception when others then
  -- Le journal ne bloque jamais un paiement : un client débité dont la
  -- commande échouerait à cause d'une statistique serait bien pire qu'un trou.
  raise warning 'orders_log_online_payment: %', sqlerrm;
  return null;
end;
$$;

revoke execute on function public.orders_log_online_payment()
  from public, anon, authenticated;

create trigger orders_log_online_payment
  after insert or update of paid_online, online_payment_started_at, status
  on public.orders
  for each row execute function public.orders_log_online_payment();

-- --------------------------------------------------------------------------
-- Ingestion des vues (anon)
-- --------------------------------------------------------------------------

-- Distincte de menu_track : aucun identifiant de visite ne l'accompagne.
-- Plafonds en littéraux, partagés avec menu_track (même ligne de budget), pour
-- la même raison : la fonction est exposée à anon. La purge du journal des
-- tentatives passe ici pour ne jamais ralentir un paiement.
create function public.menu_track_views(p_slug text, p_items uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c_budget_per_minute constant int := 300;
  c_view_ttl_days constant int := 400;
  c_attempt_ttl_days constant int := 400;
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
    delete from menu_item_views
      where day < current_date - c_view_ttl_days;
    delete from online_payment_attempts
      where started_at < now() - make_interval(days => c_attempt_ttl_days);
  end if;

  -- Seuls les plats de CE restaurant comptent, une fois par envoi.
  insert into menu_item_views (etablissement_id, item_id, day, views)
  select v_etab, i.id, current_date, 1
  from items i
  where i.etablissement_id = v_etab
    and i.id = any(p_items[1:c_max_items])
  on conflict (etablissement_id, day, item_id)
    do update set views = menu_item_views.views + 1;
end;
$$;

grant execute on function public.menu_track_views(text, uuid[])
  to anon, authenticated;

-- --------------------------------------------------------------------------
-- Lecture (admin)
-- --------------------------------------------------------------------------

-- Reprise de 20260911000001_menu_analytics, avec les vues. Le type de retour
-- change : la fonction est recréée, ses droits avec. La fin de période vaut
-- « maintenant » : la journée de p_to est comprise, sans quoi les compteurs du
-- jour resteraient invisibles jusqu'au lendemain.
drop function public.admin_menu_items(uuid, timestamptz, timestamptz);

create function public.admin_menu_items(
  p_etab uuid, p_from timestamptz, p_to timestamptz
)
returns table (
  item_id uuid, name text, views int, clicks int, sold int, revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with views as (
    select v.item_id, sum(v.views)::int as views
    from menu_item_views v
    where v.etablissement_id = p_etab
      and v.day >= p_from::date and v.day <= p_to::date
    group by v.item_id
  ),
  clicks as (
    select c.item_id, sum(c.clicks)::int as clicks
    from menu_item_clicks c
    where c.etablissement_id = p_etab
      and c.day >= p_from::date and c.day <= p_to::date
    group by c.item_id
  ),
  sold as (
    select oi.item_id,
           sum(oi.quantity)::int as sold,
           sum(oi.quantity * oi.unit_price) as revenue
    from order_items oi
    join orders o on o.id = oi.order_id
    where o.etablissement_id = p_etab
      and o.type = 'sur_place'
      and o.status <> 'annulee'
      and oi.paid_at >= p_from and oi.paid_at < p_to
      and oi.item_id is not null
    group by oi.item_id
  )
  select i.id, i.name,
         coalesce(views.views, 0), coalesce(clicks.clicks, 0),
         coalesce(sold.sold, 0), coalesce(sold.revenue, 0)
  from items i
  left join views on views.item_id = i.id
  left join clicks on clicks.item_id = i.id
  left join sold on sold.item_id = i.id
  where i.etablissement_id = p_etab
    and (views.item_id is not null or clicks.item_id is not null or sold.item_id is not null)
    and (select public.is_admin())
  order by coalesce(views.views, 0) desc, coalesce(sold.sold, 0) desc,
           coalesce(clicks.clicks, 0) desc;
$$;

-- Les totaux de la période, et la date où chaque mesure commence : une période
-- antérieure doit se lire « pas encore mesuré », pas « zéro ».
create function public.admin_menu_measures(
  p_etab uuid, p_from timestamptz, p_to timestamptz
)
returns table (
  views int,
  views_since date,
  attempts_open int,
  succeeded int,
  expired int,
  failed int,
  counter int,
  refused int,
  attempts_since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select coalesce(sum(v.views), 0)::int from menu_item_views v
     where v.etablissement_id = p_etab
       and v.day >= p_from::date and v.day <= p_to::date),
    (select min(v.day) from menu_item_views v where v.etablissement_id = p_etab),
    a.attempts_open, a.succeeded, a.expired, a.failed, a.counter, a.refused,
    (select min(t.started_at) from online_payment_attempts t
     where t.etablissement_id = p_etab)
  from (
    select count(*) filter (where t.outcome = 'en_cours')::int as attempts_open,
           count(*) filter (where t.outcome = 'reussi')::int as succeeded,
           count(*) filter (where t.outcome = 'expire')::int as expired,
           count(*) filter (where t.outcome = 'echoue')::int as failed,
           count(*) filter (where t.outcome = 'comptoir')::int as counter,
           count(*) filter (where t.refused)::int as refused
    from online_payment_attempts t
    where t.etablissement_id = p_etab
      and t.started_at >= p_from and t.started_at < p_to
  ) a
  where (select public.is_admin());
$$;

revoke execute on function
  public.admin_menu_items(uuid, timestamptz, timestamptz) from public, anon;
revoke execute on function
  public.admin_menu_measures(uuid, timestamptz, timestamptz) from public, anon;

grant execute on function
  public.admin_menu_items(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function
  public.admin_menu_measures(uuid, timestamptz, timestamptz) to authenticated;
