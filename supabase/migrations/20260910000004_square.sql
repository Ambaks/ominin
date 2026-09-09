-- Paiement à table par Square. Le restaurant relie SON compte Square (nous
-- n'en créons aucun) : l'argent des additions lui arrive directement, et
-- Square pousse lui-même la commande réglée vers sa caisse et son Order
-- Manager — nous n'envoyons rien en caisse, nous constatons.
--
-- Le catalogue n'est pas synchronisé : Ominin reste la source de vérité du
-- menu, les commandes partent avec des lignes ad-hoc (nom, prix, TVA).

-- Jetons OAuth du marchand, mêmes règles que sumup_accounts : ce sont des
-- secrets, RLS activée sans aucune policy — service_role uniquement. Le
-- statut de connexion passe par /api/square/connect (réservée au gérant).
create table public.square_accounts (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  merchant_id text not null,
  access_token text not null,
  refresh_token text not null,
  -- Square date l'expiration (expires_at ISO) là où SumUp donne une durée.
  access_token_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.square_accounts enable row level security;

create index square_accounts_expiry_idx
  on public.square_accounts (access_token_expires_at);

-- Point de vente auquel les QR codes appartiennent (un compte Square
-- multi-sites en a plusieurs). Volontairement HORS de la table à secrets :
-- le SDK Web Payments le consomme dans le navigateur — il est public par
-- conception — et le menu anonyme doit le lire dans le même aller-retour que
-- le reste de la carte.
alter table public.etablissements
  add column square_location_id text;

-- Références Square de la commande, pendants de stripe_session_id et
-- sumup_checkout_id. La clé d'idempotence est écrite AVANT l'appel de
-- paiement : une relance réutilise la même clé et ne peut pas débiter deux
-- fois (cf. app/api/square/pay).
alter table public.orders
  add column square_order_id text unique,
  add column square_payment_id text unique,
  add column square_idempotency_key uuid;

-- ---------------------------------------------------------------------------
-- La garde posée en 20260907000001 exigeait un compte STRIPE capable
-- d'encaisser pour proposer la carte : un établissement Square se la verrait
-- refuser. L'invariant vaut d'être gardé (BOHO avait été provisionné avec
-- online_payment sans compte capable d'encaisser, envoyant les clients vers
-- un paiement qui échoue) — il devient simplement fonction du fournisseur.
-- Null et 'sumup' gardent exactement le chemin d'aujourd'hui.

create or replace function public.enforce_online_payment_account()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not new.online_payment then
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

-- Changer de fournisseur revalide : on ne bascule pas vers un encaisseur
-- qu'on n'a pas relié en laissant la carte proposée sur le menu.
drop trigger if exists enforce_online_payment_account on public.etablissements;
create trigger enforce_online_payment_account
  before insert or update of online_payment, payment_provider, square_location_id
  on public.etablissements
  for each row execute function public.enforce_online_payment_account();

-- Compte Square délié (révocation côté marchand, remise à zéro) : le menu
-- cesse aussitôt de proposer la carte — pendant de
-- sync_online_payment_with_account pour Stripe.
create or replace function public.sync_online_payment_with_square()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update public.etablissements
  set online_payment = false
  where id = old.etablissement_id
    and online_payment
    and payment_provider = 'square';
  return old;
end;
$$;

create trigger sync_online_payment_with_square
  after delete on public.square_accounts
  for each row execute function public.sync_online_payment_with_square();
