-- Téléphones reconnus par le programme de fidélité. Le client coche « Se
-- souvenir de ce téléphone » à sa commande : le serveur remet au navigateur
-- une clé aléatoire (cookie httpOnly, /api/fidelite) et ne garde ici que son
-- empreinte SHA-256, liée au contact. Au scan suivant, le menu le salue, montre
-- ses points et rattache la commande sans rien lui faire taper.
--
-- Lié au contact, pas à un établissement : le même téléphone retrouve son
-- numéro chez chaque restaurant Ominin, ses points restent ceux de la maison.
-- Aucune policy : seul le route handler (service_role) lit et écrit.

create table public.loyalty_devices (
  token_hash text primary key,
  -- Normalisé par loyalty_contact, comme loyalty_customers.contact.
  contact text not null,
  first_name text check (first_name is null or btrim(first_name) <> ''),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.loyalty_devices enable row level security;

-- ---------------------------------------------------------------------------
-- Retenir le téléphone : seulement pour un client déjà connu de la maison —
-- place_order vient de le créer. Un téléphone qui change de contact change de
-- personne : le prénom de l'ancien ne le suit pas.

create function public.loyalty_device_remember(
  p_slug text,
  p_token_hash text,
  p_contact text,
  p_first_name text default null
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_contact text := loyalty_contact(p_contact);
begin
  select id into v_etab from etablissements where slug = p_slug;
  if v_etab is null or not loyalty_active(v_etab) then
    raise exception 'Le programme de fidélité n''est pas proposé ici.';
  end if;
  if not exists (
    select 1 from loyalty_customers
    where etablissement_id = v_etab and contact = v_contact
  ) then
    raise exception 'Contact inconnu de ce programme de fidélité.';
  end if;
  insert into loyalty_devices (token_hash, contact, first_name)
  values (p_token_hash, v_contact, nullif(btrim(p_first_name), ''))
  on conflict (token_hash) do update
    set first_name = case
          when loyalty_devices.contact = excluded.contact
            then coalesce(excluded.first_name, loyalty_devices.first_name)
          else excluded.first_name
        end,
        contact = excluded.contact,
        last_seen_at = now();
end;
$$;

-- Le client derrière un téléphone, vu d'un restaurant : son contact (pour
-- rattacher la commande), son prénom, son solde ici et la date de sa carte —
-- null tous deux s'il n'a pas encore de carte dans cette maison. Aucune
-- ligne : téléphone inconnu, ou programme éteint.

create function public.loyalty_device_member(p_slug text, p_token_hash text)
returns table (contact text, first_name text, points int, member_since timestamptz)
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
begin
  select id into v_etab from etablissements where slug = p_slug;
  if v_etab is null or not loyalty_active(v_etab) then
    return;
  end if;
  return query
  update loyalty_devices d
  set last_seen_at = now()
  where d.token_hash = p_token_hash
  returning
    d.contact,
    d.first_name,
    (
      select coalesce(sum(le.points), 0)::int
      from loyalty_customers lc
      left join loyalty_entries le on le.customer_id = lc.id
      where lc.etablissement_id = v_etab and lc.contact = d.contact
      group by lc.id
    ),
    (
      select lc.created_at
      from loyalty_customers lc
      where lc.etablissement_id = v_etab and lc.contact = d.contact
    );
end;
$$;

-- La carte d'un téléphone reconnu, ligne à ligne, de la plus récente à la
-- plus ancienne : les gains avec leur table, les articles offerts, les
-- gestes du gérant.

create function public.loyalty_device_history(p_slug text, p_token_hash text)
returns table (
  kind public.loyalty_entry_kind,
  points int,
  created_at timestamptz,
  table_number int,
  rewards text
)
language sql stable security definer
set search_path = public
as $$
  select
    le.kind,
    le.points,
    le.created_at,
    t.number,
    case when le.kind = 'depense' then (
      select string_agg(oi.name, ', ' order by oi.name)
      from order_items oi
      where oi.order_id = le.order_id and oi.loyalty_points is not null
    ) end
  from etablissements e
  join loyalty_devices d on d.token_hash = p_token_hash
  join loyalty_customers lc
    on lc.etablissement_id = e.id and lc.contact = d.contact
  join loyalty_entries le on le.customer_id = lc.id
  left join orders o on o.id = le.order_id
  left join tables t on t.id = o.table_id
  where e.slug = p_slug and loyalty_active(e.id)
  order by le.created_at desc;
$$;

revoke execute on function public.loyalty_device_remember(text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_device_member(text, text)
  from public, anon, authenticated;
revoke execute on function public.loyalty_device_history(text, text)
  from public, anon, authenticated;
grant execute on function public.loyalty_device_remember(text, text, text, text)
  to service_role;
grant execute on function public.loyalty_device_member(text, text)
  to service_role;
grant execute on function public.loyalty_device_history(text, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- « Cette commande vaut 22 points. On les garde ? » Le client qui n'a pas
-- laissé de contact à la commande le donne sur l'écran de confirmation.
-- L'identifiant de la commande sert de preuve, comme pour son suivi. Déjà
-- réglée (en ligne), son gain se pose tout de suite, au calcul de
-- loyalty_earn ; sinon c'est loyalty_earn qui le posera à l'encaissement.

create function public.loyalty_claim_order(p_order_id uuid, p_contact text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_contact text := loyalty_contact(p_contact);
  v_customer uuid;
  v_points int;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.status = 'annulee' then
    raise exception 'Commande introuvable.';
  end if;
  if not loyalty_active(v_order.etablissement_id) then
    raise exception 'Le programme de fidélité n''est pas proposé ici.';
  end if;
  if v_order.loyalty_customer_id is not null then
    raise exception 'Cette commande a déjà sa carte de fidélité.';
  end if;

  insert into loyalty_customers (etablissement_id, contact)
  values (v_order.etablissement_id, v_contact)
  on conflict (etablissement_id, contact) do nothing;
  select id into v_customer from loyalty_customers
  where etablissement_id = v_order.etablissement_id and contact = v_contact
  for update;

  update orders set loyalty_customer_id = v_customer where id = p_order_id;

  if v_order.payment_mode is not null then
    select floor(coalesce(sum(oi.quantity * oi.unit_price), 0) * e.loyalty_points_per_euro)
    into v_points
    from etablissements e
    left join order_items oi
      on oi.order_id = p_order_id and oi.loyalty_points is null
    where e.id = v_order.etablissement_id
    group by e.loyalty_points_per_euro;
    if v_points > 0 then
      insert into loyalty_entries (customer_id, order_id, kind, points)
      values (v_customer, p_order_id, 'gain', v_points)
      on conflict (order_id, kind) where order_id is not null do nothing;
    end if;
  end if;
end;
$$;

revoke execute on function public.loyalty_claim_order(uuid, text) from public;
grant execute on function public.loyalty_claim_order(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Les résultats du programme pour le gérant (onglet Fidélité), semaine par
-- semaine depuis la première carte : commandes réglées, celles qui portaient
-- une carte, récompenses servies, nouveaux membres. Semaines à l'heure de
-- Paris, du lundi au dimanche.

create function public.loyalty_stats_weeks(p_etablissement_id uuid)
returns table (
  week date,
  paid_orders int,
  card_orders int,
  rewards_used int,
  new_members int
)
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_start date;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  select date_trunc('week', min(created_at) at time zone 'Europe/Paris')::date
  into v_start
  from loyalty_customers where etablissement_id = p_etablissement_id;
  if v_start is null then
    return;
  end if;
  return query
  with weeks as (
    select generate_series(
      v_start,
      date_trunc('week', now() at time zone 'Europe/Paris')::date,
      interval '1 week'
    )::date as week
  ),
  paid as (
    select date_trunc('week', o.created_at at time zone 'Europe/Paris')::date as week,
           count(*)::int as paid_orders,
           count(o.loyalty_customer_id)::int as card_orders
    from orders o
    where o.etablissement_id = p_etablissement_id
      and o.payment_mode is not null and o.status <> 'annulee'
      and o.created_at >= v_start
    group by 1
  ),
  gifts as (
    select date_trunc('week', o.created_at at time zone 'Europe/Paris')::date as week,
           sum(oi.quantity)::int as rewards_used
    from orders o
    join order_items oi on oi.order_id = o.id and oi.loyalty_points is not null
    where o.etablissement_id = p_etablissement_id and o.status <> 'annulee'
      and o.created_at >= v_start
    group by 1
  ),
  joined as (
    select date_trunc('week', created_at at time zone 'Europe/Paris')::date as week,
           count(*)::int as new_members
    from loyalty_customers
    where etablissement_id = p_etablissement_id
    group by 1
  )
  select w.week,
         coalesce(p.paid_orders, 0),
         coalesce(p.card_orders, 0),
         coalesce(g.rewards_used, 0),
         coalesce(j.new_members, 0)
  from weeks w
  left join paid p on p.week = w.week
  left join gifts g on g.week = w.week
  left join joined j on j.week = w.week
  order by w.week;
end;
$$;

-- Les membres d'un coup d'œil : combien, combien sont revenus (deux
-- commandes au moins portant leur carte), combien ont un téléphone retenu,
-- et les points en circulation.

create function public.loyalty_stats_members(p_etablissement_id uuid)
returns table (
  members int,
  returning_members int,
  remembered_phones int,
  points_outstanding int
)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  return query
  select
    (select count(*)::int from loyalty_customers where etablissement_id = p_etablissement_id),
    (select count(*)::int from (
       select o.loyalty_customer_id
       from orders o
       where o.etablissement_id = p_etablissement_id
         and o.loyalty_customer_id is not null and o.status <> 'annulee'
       group by 1
       having count(*) >= 2
     ) r),
    (select count(distinct d.contact)::int
     from loyalty_devices d
     join loyalty_customers lc
       on lc.contact = d.contact and lc.etablissement_id = p_etablissement_id),
    (select coalesce(sum(le.points), 0)::int
     from loyalty_entries le
     join loyalty_customers lc on lc.id = le.customer_id
     where lc.etablissement_id = p_etablissement_id);
end;
$$;

revoke execute on function public.loyalty_stats_weeks(uuid) from public, anon;
revoke execute on function public.loyalty_stats_members(uuid) from public, anon;
grant execute on function public.loyalty_stats_weeks(uuid) to authenticated;
grant execute on function public.loyalty_stats_members(uuid) to authenticated;
