-- La salle telle qu'elle se tient ailleurs qu'au BOHO. Trois gestes retirés
-- en septembre parce qu'un seul client n'en voulait pas, rendus ici derrière
-- leurs cases : une table confiée à un serveur, des tables réunies sous une
-- même addition, et le pourboire qui revient à celui qui tenait la table.
--
-- Les serveurs désignés sont les fiches d'équipe (public.staff) et non plus
-- des comptes : au BOHO comme ailleurs, un serveur n'a pas forcément d'email,
-- et la tablette du comptoir n'appartient à personne.

-- ---------------------------------------------------------------------------
-- Groupes de tables. Le groupe vit sur la table, pas sur la commande : une
-- addition de groupe rassemble simplement les commandes de ses tables, et
-- défaire le groupe ne touche à rien de ce qui a été encaissé.

create table public.table_groups (
  id uuid primary key default gen_random_uuid(),
  etablissement_id uuid not null
    references public.etablissements (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index table_groups_etablissement_idx
  on public.table_groups (etablissement_id);

alter table public.tables
  add column staff_id uuid references public.staff (id) on delete set null,
  add column group_id uuid references public.table_groups (id) on delete set null;
create index tables_staff_idx on public.tables (staff_id);
create index tables_group_idx on public.tables (group_id);

-- Qui a encaissé, pour le partage des pourboires. Figé au règlement : la
-- table peut changer de main le lendemain, la part gagnée reste acquise.
alter table public.orders
  add column staff_id uuid references public.staff (id) on delete set null;
create index orders_staff_idx on public.orders (staff_id);

-- ---------------------------------------------------------------------------
-- Droits. Affecter une table et réunir des tables sont des gestes de service :
-- le serveur les fait. Le reste de la ligne (le numéro) reste au gérant, d'où
-- le trigger — une policy ne sait pas borner des colonnes.

alter table public.table_groups enable row level security;

create policy "member read" on public.table_groups
  for select to authenticated
  using (public.current_member_role(etablissement_id) is not null);
create policy "salle insert" on public.table_groups
  for insert to authenticated
  with check (public.current_member_role(etablissement_id) in ('gerant', 'serveur'));
create policy "salle delete" on public.table_groups
  for delete to authenticated
  using (public.current_member_role(etablissement_id) in ('gerant', 'serveur'));

create policy "serveur update" on public.tables
  for update to authenticated
  using (public.current_member_role(etablissement_id) = 'serveur')
  with check (public.current_member_role(etablissement_id) = 'serveur');

create function public.enforce_table_update_rights()
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
  if to_jsonb(new) - 'staff_id' - 'group_id'
     is distinct from to_jsonb(old) - 'staff_id' - 'group_id' then
    raise exception 'Le rôle serveur ne permet pas cette modification.';
  end if;
  return new;
end;
$$;

create trigger tables_update_rights
  before update on public.tables
  for each row execute function public.enforce_table_update_rights();

-- Une fiche affectée doit être du même établissement que la table : le
-- rapprochement se fait à la main dans l'écran, rien ne l'impose en base.
create function public.enforce_table_staff_etablissement()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.staff_id is not null and not exists (
    select 1 from staff
    where id = new.staff_id and etablissement_id = new.etablissement_id
  ) then
    raise exception 'Ce serveur n''appartient pas à cet établissement.';
  end if;
  if new.group_id is not null and not exists (
    select 1 from table_groups
    where id = new.group_id and etablissement_id = new.etablissement_id
  ) then
    raise exception 'Ce groupe n''appartient pas à cet établissement.';
  end if;
  return new;
end;
$$;

create trigger tables_staff_etablissement
  before insert or update of staff_id, group_id on public.tables
  for each row execute function public.enforce_table_staff_etablissement();

-- ---------------------------------------------------------------------------
-- Attribution du règlement. Rien ne change à la signature des fonctions
-- d'encaissement — le serveur n'est pas saisi, il est lu sur la table. Une
-- table sans serveur affecté laisse simplement la colonne à null.

create or replace function public.stamp_order_staff()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.staff_id is null
     and new.table_id is not null
     and (old.payment_mode is null and new.payment_mode is not null
          or old.paid_online is distinct from new.paid_online and new.paid_online) then
    new.staff_id := (select staff_id from tables where id = new.table_id);
  end if;
  return new;
end;
$$;

create trigger orders_stamp_staff
  before update on public.orders
  for each row execute function public.stamp_order_staff();

-- Le serveur peut désormais toucher `staff_id` en même temps que le
-- règlement : sans cela, le trigger de droits refuserait sa propre écriture.
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
  if v_role = 'serveur' then
    if to_jsonb(new) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id'
         is distinct from to_jsonb(old) - 'status' - 'payment_mode' - 'cash_given' - 'cash_change' - 'tip_amount' - 'estimated_ready_at' - 'staff_id'
       or old.status in ('servie', 'annulee', 'retiree')
       or (new.status <> old.status
           and new.status not in ('payee', 'servie', 'en_preparation', 'prete', 'retiree')
           and not (new.status = 'annulee' and old.status = 'en_attente')) then
      raise exception 'Le rôle serveur ne permet pas cette modification.';
    end if;
    return new;
  end if;
  raise exception 'Modification non autorisée.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Réunir et séparer des tables. Deux fonctions plutôt que des écritures
-- libres : un groupe d'une seule table n'a pas de sens, et un groupe vidé ne
-- doit pas rester derrière.

create function public.group_tables(p_table_ids uuid[])
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
  v_group uuid;
begin
  if array_length(p_table_ids, 1) is null or array_length(p_table_ids, 1) < 2 then
    raise exception 'Il faut au moins deux tables.';
  end if;
  select etablissement_id into v_etab from tables where id = p_table_ids[1];
  if v_etab is null then
    raise exception 'Table introuvable.';
  end if;
  if exists (
    select 1 from tables where id = any(p_table_ids) and etablissement_id <> v_etab
  ) then
    raise exception 'Les tables doivent appartenir au même établissement.';
  end if;
  if (select count(*) from tables where id = any(p_table_ids))
     <> array_length(p_table_ids, 1) then
    raise exception 'Table introuvable.';
  end if;
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  if exists (
    select 1 from tables where id = any(p_table_ids) and group_id is not null
  ) then
    raise exception 'Une de ces tables est déjà réunie à une autre.';
  end if;

  insert into table_groups (etablissement_id) values (v_etab) returning id into v_group;
  update tables set group_id = v_group where id = any(p_table_ids);
  return v_group;
end;
$$;

create function public.ungroup_tables(p_group_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
  v_role public.member_role;
begin
  select etablissement_id into v_etab from table_groups where id = p_group_id;
  if v_etab is null then
    raise exception 'Groupe introuvable.';
  end if;
  v_role := current_member_role(v_etab);
  if v_role is null or v_role not in ('gerant', 'serveur') then
    raise exception 'Modification non autorisée.';
  end if;
  update tables set group_id = null where group_id = p_group_id;
  delete from table_groups where id = p_group_id;
end;
$$;

revoke execute on function public.group_tables(uuid[]) from public, anon;
grant execute on function public.group_tables(uuid[]) to authenticated;
revoke execute on function public.ungroup_tables(uuid) from public, anon;
grant execute on function public.ungroup_tables(uuid) to authenticated;
revoke execute on function public.enforce_table_update_rights() from public, anon, authenticated;
revoke execute on function public.enforce_table_staff_etablissement() from public, anon, authenticated;
revoke execute on function public.stamp_order_staff() from public, anon, authenticated;

