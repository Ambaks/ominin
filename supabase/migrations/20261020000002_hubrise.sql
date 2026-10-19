-- HubRise : le restaurant relie SA caisse (Popina, Zelty, Clyo…) à Ominin par
-- le hub HubRise. Les commandes passent du menu QR et du click & collect à
-- sa caisse ; en retour la caisse nous donne son catalogue (les références
-- qu'elle exige), ses stocks, ses horaires et l'état de chaque commande.
--
-- HubRise n'est PAS un encaisseur : il ne rejoint pas l'enum payment_provider
-- et se cumule avec Stripe, Square ou le paiement au comptoir.

-- ---------------------------------------------------------------------------
-- Connexion. Jeton d'accès (il n'expire jamais, HubRise le révoque ou le
-- bloque) et identifiants rendus par l'autorisation : ce sont des secrets,
-- RLS activée sans aucune policy — service_role uniquement. Le statut passe
-- par /api/hubrise/connect (réservée au gérant).
create table public.hubrise_connections (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  access_token text not null,
  account_id text not null,
  location_id text not null unique,
  catalog_id text,
  customer_list_id text,
  account_name text,
  location_name text,
  catalog_name text,
  customer_list_name text,
  -- Réglages propres à la caisse du restaurant : les codes qu'elle attend pour
  -- le mode de paiement « Ominin », le type de commande et le pourboire.
  payment_ref text,
  payment_name text,
  service_type_ref_eat_in text,
  service_type_ref_collection text,
  tip_charge_ref text,
  connected_at timestamptz not null default now(),
  -- Posé sur un 401 (jeton bloqué, révoqué ou abonnement impayé), effacé au
  -- premier appel réussi : le gérant est invité à reconnecter.
  last_failed_at timestamptz,
  callback_registered_at timestamptz,
  catalog_synced_at timestamptz,
  -- Le catalogue a changé chez HubRise ; relu une fois le calme revenu
  -- (GET /catalogs/:id est plafonné à 10 par minute).
  catalog_dirty_at timestamptz,
  inventory_synced_at timestamptz,
  hours_synced_at timestamptz,
  -- Ce que la synchro des horaires n'a pas pu reprendre à la lettre.
  hours_note text,
  catalog_snapshot jsonb
);

alter table public.hubrise_connections enable row level security;

-- Références HubRise de la carte. Les caisses retrouvent un produit par son
-- code : un article se relie à un SKU, un choix d'option à une option. Les
-- choix vivent dans items.options (jsonb), d'où l'adresse item + groupe + choix.
create table public.hubrise_ref_map (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  group_id text,
  choice_id text,
  target text not null check (target in ('sku', 'option')),
  ref text not null,
  option_list_name text,
  hubrise_name text,
  matched_by text not null check (matched_by in ('auto', 'manual')),
  created_at timestamptz not null default now(),
  check ((group_id is null) = (choice_id is null)),
  check ((target = 'sku') = (choice_id is null))
);

create unique index hubrise_ref_map_cible
  on public.hubrise_ref_map (item_id, coalesce(group_id, ''), coalesce(choice_id, ''));
create index hubrise_ref_map_etab_idx
  on public.hubrise_ref_map (etablissement_id);

alter table public.hubrise_ref_map enable row level security;

-- ---------------------------------------------------------------------------
-- File d'envoi vers HubRise, sur le modèle de print_jobs. La charge utile est
-- construite à l'envoi (les lignes de commande n'existent pas encore quand la
-- commande est insérée) ; la ligne porte l'état de l'acheminement.
--   pending : à envoyer ou à renvoyer (next_attempt_at)
--   blocked : jeton refusé (401), repart à la reconnexion
--   sent    : transmis (hubrise_id)
--   dead    : abandonné, l'admin est alerté
--   skipped : plus rien à envoyer (commande annulée avant l'envoi)
create table public.hubrise_outbox (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  kind text not null check (kind in ('order', 'order_cancel', 'stock')),
  order_id uuid references public.orders (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'blocked', 'sent', 'dead', 'skipped')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  hubrise_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  check ((kind = 'stock') = (item_id is not null)),
  check ((kind = 'stock') = (order_id is null))
);

-- Une commande part une fois, une annulation une fois.
create unique index hubrise_outbox_commande
  on public.hubrise_outbox (order_id, kind) where order_id is not null;
create index hubrise_outbox_a_envoyer
  on public.hubrise_outbox (next_attempt_at) where status = 'pending';
create index hubrise_outbox_etab_idx
  on public.hubrise_outbox (etablissement_id, status);

alter table public.hubrise_outbox enable row level security;

alter table public.orders
  add column hubrise_order_id text unique,
  -- Dernier statut rapporté par la caisse (new, received, accepted…).
  add column hubrise_status text;

alter table public.loyalty_customers
  add column hubrise_customer_id text;

-- ---------------------------------------------------------------------------
-- Déclencheurs.

-- Une commande part chez HubRise dès qu'elle est « vraie » : réglée en ligne,
-- ou choisie pour se régler sur place (online_payment_started_at retombe à
-- null). Un paiement en cours n'est jamais envoyé. Le déclencheur est différé
-- à la fin de la transaction : place_order insère les lignes après la
-- commande. Sans connexion HubRise, il ne fait rien.
create function public.hubrise_enqueue_order()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from hubrise_connections
    where etablissement_id = new.etablissement_id
  ) then
    return null;
  end if;
  if new.online_payment_started_at is null or new.paid_online then
    insert into hubrise_outbox (etablissement_id, kind, order_id)
    values (new.etablissement_id, 'order', new.id)
    on conflict (order_id, kind) where order_id is not null do nothing;
  end if;
  return null;
end;
$$;

create constraint trigger hubrise_enqueue_order
  after insert or update of paid_online, online_payment_started_at
  on public.orders
  deferrable initially deferred
  for each row execute function public.hubrise_enqueue_order();

-- Une commande annulée côté Ominin après son envoi est annulée chez HubRise.
-- Quand c'est la caisse qui l'a annulée (hubrise_status déjà cancelled ou
-- rejected), il n'y a rien à lui annoncer.
create function public.hubrise_enqueue_cancel()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into hubrise_outbox (etablissement_id, kind, order_id)
  values (new.etablissement_id, 'order_cancel', new.id)
  on conflict (order_id, kind) where order_id is not null do nothing;
  return null;
end;
$$;

create trigger hubrise_enqueue_cancel
  after update of status on public.orders
  for each row
  when (
    new.status = 'annulee' and old.status <> 'annulee'
    and new.hubrise_order_id is not null
    and new.hubrise_status is not distinct from old.hubrise_status
  )
  execute function public.hubrise_enqueue_cancel();

-- Un article relié que le gérant marque épuisé (ou remet en vente) le dit à
-- la caisse. Seule la bascule explicite de disponible compte : les stocks
-- décrémentés par place_order ne sont pas renvoyés, la caisse décompte
-- elle-même les commandes qu'elle reçoit.
create function public.hubrise_enqueue_stock()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from hubrise_ref_map
    where item_id = new.id and choice_id is null
  ) then
    insert into hubrise_outbox (etablissement_id, kind, item_id)
    values (new.etablissement_id, 'stock', new.id);
  end if;
  return null;
end;
$$;

create trigger hubrise_enqueue_stock
  after update of disponible on public.items
  for each row
  when (old.disponible is distinct from new.disponible)
  execute function public.hubrise_enqueue_stock();

-- ---------------------------------------------------------------------------
-- Épuisement d'un choix d'option demandé par la caisse. Même écriture que
-- set_option_choice_disponible, mais pour le service_role : la caisse n'est
-- pas un membre de l'établissement.
create function public.hubrise_set_choice_disponible(
  p_item uuid,
  p_group text,
  p_choice text,
  p_disponible boolean
) returns void
language sql
security definer
set search_path = public
as $$
  update items
  set options = (
    select coalesce(jsonb_agg(
      case when g.value->>'id' = p_group then
        jsonb_set(g.value, '{choices}', (
          select coalesce(jsonb_agg(
            case when c.value->>'id' = p_choice then
              case when p_disponible then c.value - 'disponible'
                   else c.value || '{"disponible": false}'::jsonb end
            else c.value end
            order by c.ordinality), '[]'::jsonb)
          from jsonb_array_elements(g.value->'choices') with ordinality as c
        ))
      else g.value end
      order by g.ordinality), '[]'::jsonb)
    from jsonb_array_elements(options) with ordinality as g
  )
  where id = p_item;
$$;

revoke execute on function public.hubrise_set_choice_disponible(uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.hubrise_set_choice_disponible(uuid, text, text, boolean)
  to service_role;

revoke execute on function public.hubrise_enqueue_order() from public, anon, authenticated;
revoke execute on function public.hubrise_enqueue_cancel() from public, anon, authenticated;
revoke execute on function public.hubrise_enqueue_stock() from public, anon, authenticated;
