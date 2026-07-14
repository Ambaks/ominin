-- Click & collect : commandes à emporter passées sur le sous-domaine
-- collect et payées en ligne via Stripe. Le panier attend le paiement dans
-- collect_pending ; la commande n'est créée (create_collect_order) qu'au
-- webhook checkout.session.completed — aucune écriture anonyme sur orders.

-- ---------------------------------------------------------------------------
-- Abonnements : une ligne par produit. Les lignes existantes deviennent le
-- produit 'offre' ; un établissement souscrivant au click & collect gagne
-- une seconde ligne (product = 'collect'), les deux partagent le même
-- client Stripe (d'où la levée de l'unicité de stripe_customer_id).

alter table public.subscriptions
  add column product public.product not null default 'offre';
alter table public.subscriptions
  drop constraint subscriptions_pkey,
  add primary key (etablissement_id, product);
alter table public.subscriptions
  drop constraint subscriptions_stripe_customer_id_key;

-- ---------------------------------------------------------------------------
-- Commandes : le type distingue sur place / à emporter. Une commande collect
-- n'a pas de table mais porte le contact client, l'heure de retrait souhaitée
-- (null = dès que possible) et la session Stripe qui l'a payée (unicité =
-- idempotence du webhook).

alter table public.orders
  add column type public.order_type not null default 'sur_place',
  add column customer_name text,
  add column customer_phone text,
  add column pickup_at timestamptz,
  add column stripe_session_id text unique,
  alter column table_id drop not null;

alter table public.orders
  add constraint orders_type_table_check
    check ((type = 'sur_place') = (table_id is not null)),
  add constraint orders_collect_customer_check
    check (type <> 'collect'
           or (customer_name is not null and customer_phone is not null));

-- Transitions par type : sur place inchangé ; collect s'arrête à 'retiree'
-- (remise au client) — jamais 'servie' ni 'payee' (déjà payée en ligne).
create or replace function public.enforce_order_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (case
    when new.type = 'collect' then case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('retiree', 'annulee')
      else false
    end
    else case old.status
      when 'en_attente' then new.status in ('en_preparation', 'annulee')
      when 'en_preparation' then new.status in ('prete', 'annulee')
      when 'prete' then new.status in ('servie', 'annulee')
      when 'servie' then new.status = 'payee'
      else false
    end
  end) then
    raise exception 'Transition de statut invalide : % → %.', old.status, new.status;
  end if;
  return new;
end;
$$;

-- Le serveur peut aussi remettre une commande à emporter.
create or replace function public.enforce_order_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_role public.member_role;
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  v_role := current_member_role(new.etablissement_id);
  if v_role = 'gerant' then
    return new;
  end if;
  if v_role = 'cuisinier' then
    if to_jsonb(new) - 'status' is distinct from to_jsonb(old) - 'status'
       or new.status = 'payee' then
      raise exception 'Le rôle cuisinier ne permet pas cette modification.';
    end if;
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'group_id'
         is distinct from to_jsonb(old) - 'status' - 'group_id'
       or (new.status <> old.status and new.status not in ('servie', 'retiree')) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Paniers en attente de paiement. payload : {customer_name, customer_phone,
-- pickup_at, items: [{item_id, name, quantity, unit_price, options}]} — les
-- prix y sont figés côté serveur depuis la table items, jamais depuis le
-- client. Aucune policy : accès réservé au service_role (routes serveur).

create table public.collect_pending (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.collect_pending enable row level security;

-- ---------------------------------------------------------------------------
-- Conversion panier → commande à la confirmation du paiement, en une
-- transaction. Idempotente : un événement webhook rejoué retrouve la
-- commande existante via stripe_session_id.

create or replace function public.create_collect_order(
  p_pending_id uuid,
  p_stripe_session_id text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_pending collect_pending;
  v_order uuid;
begin
  select * into v_pending
  from collect_pending where id = p_pending_id
  for update;

  if not found then
    select id into v_order
    from orders where stripe_session_id = p_stripe_session_id;
    return v_order;
  end if;

  insert into orders (
    etablissement_id, type, status, payment_mode,
    customer_name, customer_phone, pickup_at, stripe_session_id
  )
  values (
    v_pending.etablissement_id, 'collect', 'en_attente', 'en_ligne',
    v_pending.payload->>'customer_name',
    v_pending.payload->>'customer_phone',
    nullif(v_pending.payload->>'pickup_at', '')::timestamptz,
    p_stripe_session_id
  )
  on conflict (stripe_session_id) do nothing
  returning id into v_order;

  if v_order is not null then
    insert into order_items (order_id, item_id, name, quantity, unit_price, options)
    select
      v_order,
      nullif(line->>'item_id', '')::uuid,
      line->>'name',
      (line->>'quantity')::int,
      (line->>'unit_price')::numeric,
      coalesce(line->'options', '[]'::jsonb)
    from jsonb_array_elements(v_pending.payload->'items') as line;
  end if;

  delete from collect_pending where id = p_pending_id;

  return coalesce(
    v_order,
    (select id from orders where stripe_session_id = p_stripe_session_id)
  );
end;
$$;

revoke execute on function public.create_collect_order(uuid, text)
  from public, anon, authenticated;
