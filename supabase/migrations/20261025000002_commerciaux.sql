-- Commerciaux indépendants (apporteurs d'affaires). Une ligne par personne
-- invitée par Ominin : l'invitation nominative est l'offre de contrat
-- (article 10 du contrat), d'où l'adresse posée par l'admin et non par
-- l'intéressé. Le compte s'y rattache à la première connexion ; l'identité
-- est complétée à la signature et recopiée dans legal_acceptances.terms, qui
-- seul fait foi.

create table public.commerciaux (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email <> '' and email = lower(btrim(email))),
  user_id uuid unique references auth.users (id) on delete set null,
  first_name text,
  last_name text,
  siret text check (siret ~ '^[0-9]{14}$'),
  address text,
  phone text,
  invited_at timestamptz not null default now()
);

-- Écritures par le service_role (invitation, rattachement, signature) ou par
-- l'admin ; le commercial ne fait que relire sa fiche.
alter table public.commerciaux enable row level security;

create policy "admin all" on public.commerciaux
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "self read" on public.commerciaux
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Une fiche signée ne se retire pas : la page d'admin le masque, ceci le
-- garantit — l'exemplaire PDF se retrouve par la fiche.
create function public.prevent_signed_commercial_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.legal_acceptances where commercial_id = old.id
  ) then
    raise exception 'Ce commercial a signé son contrat : sa fiche ne se supprime pas.';
  end if;
  return old;
end;
$$;

revoke execute on function public.prevent_signed_commercial_delete() from public, anon, authenticated;

create trigger commerciaux_keep_signed
  before delete on public.commerciaux
  for each row execute function public.prevent_signed_commercial_delete();

-- Troisième portée de signature. Même règle que les deux autres : la clé
-- tombe à null si la fiche disparaît, scope_label et terms gardent le sens.
alter table public.legal_acceptances
  add column commercial_id uuid references public.commerciaux (id) on delete set null;

alter table public.legal_acceptances
  drop constraint legal_acceptances_one_scope;

alter table public.legal_acceptances
  add constraint legal_acceptances_one_scope check (
    (scope = 'etablissement' and shop_id is null and commercial_id is null)
    or (scope = 'shop' and etablissement_id is null and commercial_id is null)
    or (scope = 'commercial' and etablissement_id is null and shop_id is null)
  );

create or replace function public.enforce_legal_acceptance_scope()
returns trigger
language plpgsql
as $$
begin
  if (new.scope = 'etablissement' and new.etablissement_id is null)
    or (new.scope = 'shop' and new.shop_id is null)
    or (new.scope = 'commercial' and new.commercial_id is null) then
    raise exception 'Une acceptation doit désigner le périmètre qu''elle engage.';
  end if;
  return new;
end;
$$;

create index legal_acceptances_commercial_idx
  on public.legal_acceptances (commercial_id, accepted_at desc);

-- Une version se signe une fois : un double envoi ne doit pas écrire deux
-- preuves (ni partir en deux copies).
create unique index legal_acceptances_commercial_version_key
  on public.legal_acceptances (commercial_id, version_id)
  where scope = 'commercial';

create policy "commercial read" on public.legal_acceptances
  for select to authenticated
  using (
    commercial_id is not null
    and commercial_id in (
      select id from public.commerciaux where user_id = (select auth.uid())
    )
  );

create policy "admin read" on public.legal_acceptances
  for select to authenticated
  using (scope = 'commercial' and (select public.is_admin()));

-- Compte existant à une adresse, pour l'invitation. Seul un compte créé par
-- une invitation de commercial (app_metadata.commercial, que seul le
-- service_role peut écrire) se rattache à une fiche : tout autre compte à la
-- même adresse a pu être ouvert par n'importe qui, avant l'invitation.
-- Réservé au service_role.
create function public.auth_account_state(p_email text)
returns table (id uuid, confirmed boolean, invited boolean, commercial boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id,
         u.email_confirmed_at is not null,
         u.invited_at is not null,
         coalesce((u.raw_app_meta_data ->> 'commercial')::boolean, false)
  from auth.users u
  where lower(u.email) = lower(p_email);
$$;

revoke execute on function public.auth_account_state(text) from public, anon, authenticated;
grant execute on function public.auth_account_state(text) to service_role;
