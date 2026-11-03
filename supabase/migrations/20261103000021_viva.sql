-- Paiement en ligne par Viva. Chaque restaurant a SON compte marchand Viva
-- (programme ISV : Ominin crée et relie les comptes, sa commission part par
-- commande dans isvAmount) ; l'argent des additions lui arrive directement.
-- Le client règle sur la page de paiement hébergée par Viva (Smart
-- Checkout) puis revient au menu : /api/viva/pay crée la commande Viva,
-- /api/viva/return et /api/viva/webhook relisent la transaction chez Viva
-- avant de clore quoi que ce soit.

-- Le compte Viva du restaurant. Aucun secret ici (les identifiants d'API
-- sont ceux d'Ominin, en variables d'environnement) mais même régime que
-- square_accounts : RLS activée sans policy, service_role uniquement. Le
-- statut passe par /api/viva/connect (réservée au gérant).
create table public.viva_accounts (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  -- Compte créé par Ominin (POST /isv/v1/accounts) ; nul pour un compte
  -- marchand relié à la main (démonstration, mode marchand).
  viva_account_id text unique,
  -- Pas unique : un groupe peut encaisser plusieurs salles sur un même
  -- compte marchand, chacune avec sa source.
  merchant_id text not null,
  -- Viva a vérifié le marchand : il peut encaisser.
  verified boolean not null default false,
  -- Source de paiement du marchand : elle porte les URL de retour (succès,
  -- échec) de la page hébergée, qu'une commande ne peut pas fixer.
  source_code text,
  updated_at timestamptz not null default now()
);

alter table public.viva_accounts enable row level security;

-- Références Viva de la commande, pendants de square_order_id et
-- square_payment_id. Le code de commande Viva compte 16 chiffres : du texte,
-- jamais un nombre (un double JavaScript n'en garde que 15 ou 16).
--   - viva_tip : le pourboire inclus dans le montant demandé à Viva. Le
--     règlement exige que la transaction porte exactement les lignes plus ce
--     pourboire ; il n'est inscrit sur la commande (tip_amount) qu'une fois
--     payé.
--   - viva_return_url : la page du menu d'où le client est parti, où le
--     ramène /api/viva/return. Les URL de retour de Viva sont celles de la
--     source, communes à toutes les commandes ; le menu, lui, vit sur
--     plusieurs hôtes (menu, collect, sites dédiés).
alter table public.orders
  add column viva_order_code text unique,
  add column viva_transaction_id text unique,
  add column viva_tip numeric(10,2) check (viva_tip >= 0),
  add column viva_return_url text;

-- ---------------------------------------------------------------------------
-- Reprise de 20261015000005 : un établissement Viva propose la carte avec un
-- compte vérifié et sa source de paiement, pas avant.

create or replace function public.enforce_online_payment_account()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not new.online_payment then
    return new;
  end if;

  if new.payment_provider = 'demo' then
    return new;
  end if;

  if new.payment_provider = 'square' then
    if new.square_location_id is null or not exists (
      select 1 from public.square_accounts
      where etablissement_id = new.id
    ) then
      raise exception 'Reliez un compte Square et choisissez un point de vente avant de proposer le paiement par carte.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.payment_provider = 'viva' then
    if not exists (
      select 1 from public.viva_accounts
      where etablissement_id = new.id
        and verified
        and source_code is not null
    ) then
      raise exception 'Le compte Viva du restaurant doit être vérifié avant de proposer le paiement par carte.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.payment_accounts
    where etablissement_id = new.id
      and charges_enabled
  ) then
    raise exception 'Reliez un compte Stripe vérifié avant de proposer le paiement par carte.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Compte Viva délié : le menu cesse aussitôt de proposer la carte —
-- pendant de sync_online_payment_with_square.
create function public.sync_online_payment_with_viva()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.etablissements
  set online_payment = false
  where id = old.etablissement_id
    and online_payment
    and payment_provider = 'viva';
  return old;
end;
$$;

revoke execute on function public.sync_online_payment_with_viva() from public, anon, authenticated;

create trigger sync_online_payment_with_viva
  after delete on public.viva_accounts
  for each row execute function public.sync_online_payment_with_viva();

-- ---------------------------------------------------------------------------
-- La commande Viva va être créée : la commande Ominin est revendiquée pour
-- ce paiement et sa tentative datée de cet instant, comme
-- begin_square_payment. L'expiration (/api/square/expire) ne peut donc pas
-- écarter une commande dont le client part payer ; si elle vient de
-- l'écarter, la revendication échoue et aucune commande Viva n'est créée.
-- Une commande déjà passée au comptoir garde son heure nulle : elle reste en
-- caisse.

create function public.begin_viva_payment(p_order_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  update orders
  set online_payment_started_at = case
        when online_payment_started_at is not null then now()
      end
  where id = p_order_id
    and status = 'en_attente'
    and not paid_online
  returning true;
$$;

revoke execute on function public.begin_viva_payment(uuid) from public, anon, authenticated;
grant execute on function public.begin_viva_payment(uuid) to service_role;
