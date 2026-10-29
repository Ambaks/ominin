-- Effacement d'un client fidélité (art. 17 RGPD ; l'accord de sous-traitance,
-- art. 7, promet au gérant de répondre lui-même aux demandes). Sa carte part
-- (points, téléphones reconnus), ses commandes passées perdent nom, téléphone
-- et note — les montants restent, pour la comptabilité — et, s'il était
-- connu de la caisse, HubRise l'anonymise à son tour (file
-- « customer_anonymise », l'identifiant HubRise du client dans hubrise_id).
--
-- Deux portes : le gérant, depuis l'onglet Fidélité (loyalty_erase_customer),
-- et chaque nuit les clients sans activité depuis 3 ans (durée validée par le
-- propriétaire le 2026-10-29, celle que donnent HubRise et la CNIL).

-- ---------------------------------------------------------------------------
-- File HubRise : une anonymisation ne porte ni commande ni article.

alter table public.hubrise_outbox
  drop constraint hubrise_outbox_kind_check,
  add constraint hubrise_outbox_kind_check check (
    kind in (
      'order', 'order_cancel', 'stock', 'order_payments', 'order_status',
      'customer_anonymise'
    )
  );

-- La contrainte d'origine (20261021000003), anonyme, exige une commande pour
-- tout ce qui n'est pas un stock.
do $$
declare
  v_name text;
begin
  select conname into strict v_name
  from pg_constraint
  where conrelid = 'public.hubrise_outbox'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%(order_id IS NULL)%';
  execute format('alter table public.hubrise_outbox drop constraint %I', v_name);
end;
$$;

alter table public.hubrise_outbox
  add constraint hubrise_outbox_order_check check (
    (kind in ('stock', 'customer_anonymise')) = (order_id is null)
  ),
  add constraint hubrise_outbox_customer_check check (
    kind <> 'customer_anonymise' or hubrise_id is not null
  );

-- Les commandes d'un client : l'effacement les vide, la purge de nuit y lit
-- sa dernière activité.
create index orders_loyalty_customer_idx
  on public.orders (loyalty_customer_id)
  where loyalty_customer_id is not null;

-- ---------------------------------------------------------------------------
-- Effacement. Les commandes sont vidées avant la suppression de la carte :
-- celle-ci remet leur loyalty_customer_id à null (on delete set null). Les
-- téléphones reconnus sont liés au contact et valent pour chaque restaurant
-- Ominin : ils ne partent qu'avec la dernière carte de ce contact.

create function public.erase_loyalty_customer(p_customer_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_customer record;
begin
  select etablissement_id, contact, hubrise_customer_id
    into v_customer
  from loyalty_customers
  where id = p_customer_id
  for update;
  if not found then
    return;
  end if;

  update orders
  set customer_name = null, customer_phone = null, customer_note = null
  where loyalty_customer_id = p_customer_id;

  if v_customer.hubrise_customer_id is not null and exists (
    select 1 from hubrise_connections
    where etablissement_id = v_customer.etablissement_id
  ) then
    insert into hubrise_outbox (etablissement_id, kind, hubrise_id)
    values (v_customer.etablissement_id, 'customer_anonymise', v_customer.hubrise_customer_id);
  end if;

  delete from loyalty_customers where id = p_customer_id;

  delete from loyalty_devices
  where contact = v_customer.contact
    and not exists (
      select 1 from loyalty_customers where contact = v_customer.contact
    );
end;
$$;

revoke execute on function public.erase_loyalty_customer(uuid) from public, anon, authenticated;

-- Le gérant efface un client de son établissement.
create function public.loyalty_erase_customer(
  p_etablissement_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if not exists (
    select 1 from loyalty_customers
    where id = p_customer_id and etablissement_id = p_etablissement_id
  ) then
    raise exception 'Client introuvable.';
  end if;
  perform erase_loyalty_customer(p_customer_id);
end;
$$;

revoke execute on function public.loyalty_erase_customer(uuid, uuid) from public, anon;
grant execute on function public.loyalty_erase_customer(uuid, uuid) to authenticated;

-- Dernière activité : la carte, sa dernière commande, son dernier mouvement
-- de points (greatest ignore les null).
create function public.erase_inactive_loyalty_customers()
returns int
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count int := 0;
begin
  for v_id in
    select lc.id
    from loyalty_customers lc
    where greatest(
      lc.created_at,
      (select max(o.created_at) from orders o where o.loyalty_customer_id = lc.id),
      (select max(le.created_at) from loyalty_entries le where le.customer_id = lc.id)
    ) < now() - interval '3 years'
  loop
    perform erase_loyalty_customer(v_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.erase_inactive_loyalty_customers() from public, anon, authenticated;

-- Chaque nuit, 3 h UTC (4 h ou 5 h à Paris), après la fermeture des bars.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'loyalty-erase-inactive',
  '0 3 * * *',
  $$ select public.erase_inactive_loyalty_customers() $$
);
