-- Paiement à table en ligne (Stripe Connect). Chaque restaurant relie son
-- propre compte Express : l'argent des additions va au restaurateur, pas à
-- Ominin. Le flag public online_payment pilote l'affichage du choix de
-- règlement sur le menu QR ; l'identifiant de compte Stripe reste privé
-- (table dédiée, lecture membre, écriture service_role uniquement).

alter table public.etablissements
  add column online_payment boolean not null default false;

create table public.payment_accounts (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  stripe_account_id text not null unique,
  charges_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

create policy "member read" on public.payment_accounts
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);

-- Trace du paiement en ligne sur la commande : le webhook Stripe le pose,
-- le cycle de statuts (cuisine → service → encaissée) reste inchangé.
alter table public.orders
  add column paid_online boolean not null default false;
