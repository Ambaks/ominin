-- Abonnements Stripe. Table séparée d'etablissements car etablissements est
-- lisible anonymement (page QR) : l'état de facturation ne doit pas l'être.
-- Écritures réservées au webhook Stripe via service_role — aucune policy
-- d'écriture pour les autres rôles.

create table public.subscriptions (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  -- Statut Stripe brut (active, past_due, canceled…) : ce vocabulaire
  -- appartient à Stripe, pas d'enum local à maintenir.
  status text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "member read" on public.subscriptions
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
