-- Serveurs nommés et affectés aux tables : chaque membre porte un nom
-- d'affichage (saisi à l'inscription, modifiable par lui-même), chaque table
-- peut être affectée à un serveur. L'affectation cible les notifications
-- (nouvelle commande / commande prête / appel serveur) et attribue les
-- pourboires. Les pourboires sont saisis par le client au paiement en ligne
-- (Stripe/SumUp) ou par le personnel à l'encaissement.

-- ---------------------------------------------------------------------------
-- Nom d'affichage des membres. Nullable : les membres existants n'en ont pas
-- (le tableau de bord invite les serveurs à le renseigner).

alter table public.memberships add column display_name text;

-- Chaque membre peut modifier sa propre ligne ; le trigger ci-dessous la
-- restreint au seul display_name (la policy « gerant update » existante
-- exclut sa propre ligne, donc pas de recouvrement de droits).
create policy "self update" on public.memberships
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.enforce_membership_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  -- Sa propre ligne : seul le nom d'affichage est modifiable (le gérant
  -- inclus — il ne peut pas changer son propre rôle).
  if new.user_id = auth.uid() then
    if to_jsonb(new) - 'display_name' is distinct from to_jsonb(old) - 'display_name' then
      raise exception 'Seul le nom d''affichage est modifiable sur sa propre fiche.';
    end if;
  end if;
  -- La ligne d'un autre membre : réservé au gérant par la policy RLS.
  return new;
end;
$$;

create trigger memberships_enforce_update_rights
  before update on public.memberships
  for each row execute function public.enforce_membership_update_rights();

-- ---------------------------------------------------------------------------
-- Affectation d'un serveur à une table. FK vers auth.users (le PK de
-- memberships est composite) ; le départ du compte libère la table.

alter table public.tables
  add column server_id uuid references auth.users (id) on delete set null;

create index tables_server_idx on public.tables (server_id);

-- Le serveur peut désormais modifier group_id ET server_id — mais ne peut
-- s'affecter que lui-même (ou libérer la table).
create or replace function public.enforce_table_update_rights()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;
  if current_member_role(new.etablissement_id) = 'gerant' then
    return new;
  end if;
  -- Serveur : uniquement le groupement et l'affectation serveur.
  if to_jsonb(new) - 'group_id' - 'server_id'
       is distinct from to_jsonb(old) - 'group_id' - 'server_id' then
    raise exception 'Seuls le groupement et l''affectation sont modifiables par ce rôle.';
  end if;
  if new.server_id is not null and new.server_id is distinct from old.server_id
     and new.server_id <> auth.uid() then
    raise exception 'Un serveur ne peut affecter que lui-même à une table.';
  end if;
  return new;
end;
$$;

-- L'espace de gestion suit les affectations et groupements en direct
-- (RLS « member read » s'applique aussi aux événements realtime).
alter publication supabase_realtime add table public.tables;

-- ---------------------------------------------------------------------------
-- Le serveur peut désormais encaisser (servie → payee) : la version initiale
-- de enforce_order_update_rights (migration void_cash_payment) ne l'autorise
-- pas encore. Les colonnes de paiement (payment_mode, cash_given, cash_change,
-- tip_amount) sont également débloquées ; old.status = 'payee' reste interdit
-- (seul le gérant peut corriger ou annuler un encaissement).
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
    if to_jsonb(new) - 'status' - 'estimated_ready_at'
         is distinct from to_jsonb(old) - 'status' - 'estimated_ready_at'
       or new.status = 'payee'
       or old.status = 'payee' then
      raise exception 'Le rôle cuisinier ne permet pas cette modification.';
    end if;
    return new;
  end if;
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'group_id' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount'
         is distinct from to_jsonb(old) - 'status' - 'group_id' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount'
       or (new.status <> old.status and new.status not in ('servie', 'payee', 'retiree'))
       or old.status = 'payee' then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Pourboires. tip_amount est un fait nouveau (choisi par le client ou saisi
-- à l'encaissement), pas un montant dérivable — il est donc persisté.
-- server_id fige le serveur de la table au moment de la commande : c'est lui
-- que le pourboire rémunère, même si l'affectation change ensuite.

alter table public.orders
  add column server_id uuid references auth.users (id) on delete set null,
  add column tip_amount numeric(10,2) check (tip_amount >= 0);

create or replace function public.snapshot_order_server()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.server_id is null and new.table_id is not null then
    select server_id into new.server_id from tables where id = new.table_id;
  end if;
  return new;
end;
$$;

create trigger orders_snapshot_server
  before insert on public.orders
  for each row execute function public.snapshot_order_server();

-- ---------------------------------------------------------------------------
-- Appel serveur depuis le menu QR : nouvel événement de notification.
-- Défaut vrai — un serveur veut être appelé ; les autres rôles le coupent
-- via leurs préférences (défauts par rôle côté app).

alter table public.notification_prefs
  add column appel_serveur boolean not null default true;

-- Anti-spam de la route publique d'appel : au plus un appel par table par
-- fenêtre (durée côté app). Service_role uniquement, comme push_notified.
create table public.call_throttle (
  table_id uuid primary key references public.tables (id) on delete cascade,
  called_at timestamptz not null default now()
);

alter table public.call_throttle enable row level security;
