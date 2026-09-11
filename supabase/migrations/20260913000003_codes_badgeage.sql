-- Le code de badgeage. Sur la tablette du comptoir, n'importe qui peut
-- toucher n'importe quel nom : la signature prouve qu'on a badgé, pas qu'on
-- est bien celui qu'on dit. Chaque fiche reçoit donc un code à quatre
-- chiffres, posé par le gérant, que l'on tape pour badger son arrivée ou son
-- départ. Le code ne se lit jamais : sa table n'a aucune policy, comme
-- admin_pins, et seules les fonctions ci-dessous y touchent.
--
-- Une fiche d'avant cette migration n'a pas de code : elle badge comme
-- avant, jusqu'à ce que le gérant lui en pose un depuis sa fiche. Une fiche
-- nouvelle en a un dès sa création (create_staff) — sans code, pas de fiche.

create table public.staff_codes (
  staff_id uuid primary key references public.staff (id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.staff_codes enable row level security;

-- Drapeau lisible par l'équipe : la badgeuse demande le code quand il y en a
-- un, et le gérant voit d'un coup d'œil quelle fiche n'en a pas encore.
alter table public.staff add column code_set boolean not null default false;

-- Une fiche masquée sort de la badgeuse, du planning et de l'affectation des
-- tables sans être supprimée — l'extra de l'été, le serveur en congé. Elle
-- reste dans l'équipe, grisée, à réafficher d'un geste ; ses heures badgées
-- et son lien de planning ne bougent pas.
alter table public.staff add column hidden boolean not null default false;

create function public.set_staff_code(p_staff_id uuid, p_code text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_etab uuid;
begin
  select etablissement_id into v_etab from staff where id = p_staff_id;
  if v_etab is null or current_member_role(v_etab) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_code is null or p_code !~ '^[0-9]{4}$' then
    raise exception 'Le code doit compter exactement 4 chiffres.';
  end if;
  insert into staff_codes (staff_id, code_hash)
  values (p_staff_id, extensions.crypt(p_code, extensions.gen_salt('bf')))
  on conflict (staff_id) do update
    set code_hash = excluded.code_hash, updated_at = now();
  update staff set code_set = true where id = p_staff_id;
end;
$$;

revoke execute on function public.set_staff_code(uuid, text) from public, anon;
grant execute on function public.set_staff_code(uuid, text) to authenticated;

-- La fiche et son code d'un seul tenant : un deuxième appel perdu ne peut pas
-- laisser une fiche sans code. La ligne complète revient à l'écran, jeton de
-- planning compris.
create function public.create_staff(
  p_etablissement_id uuid,
  p_name text,
  p_role public.member_role,
  p_code text
)
returns public.staff
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff public.staff;
begin
  if current_member_role(p_etablissement_id) is distinct from 'gerant' then
    raise exception 'Réservé au gérant de l''établissement.';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Le nom ne peut pas être vide.';
  end if;
  insert into staff (etablissement_id, name, role)
  values (p_etablissement_id, trim(p_name), p_role)
  returning * into v_staff;
  perform set_staff_code(v_staff.id, p_code);
  select * into v_staff from staff where id = v_staff.id;
  return v_staff;
end;
$$;

revoke execute on function public.create_staff(uuid, text, public.member_role, text) from public, anon;
grant execute on function public.create_staff(uuid, text, public.member_role, text) to authenticated;

-- Vrai si le code présenté est celui de la fiche, ou si la fiche n'en a pas.
-- Interne aux fonctions de badgeage : personne ne le sonde depuis l'API.
create function public.staff_code_ok(p_staff_id uuid, p_code text)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  v_hash text;
begin
  select code_hash into v_hash from staff_codes where staff_id = p_staff_id;
  if v_hash is null then
    return true;
  end if;
  return p_code is not null and extensions.crypt(p_code, v_hash) = v_hash;
end;
$$;

revoke execute on function public.staff_code_ok(uuid, text) from public, anon, authenticated;

-- Badger. La badgeuse ne touche plus time_entries directement : la fonction
-- vérifie le code de la fiche quand elle en a un, puis pose la ligne. Le
-- compte qui saisit reste noté (created_by), comme avant.
create function public.clock_in(p_staff_id uuid, p_code text, p_signature text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_staff public.staff;
  v_id uuid;
begin
  select * into v_staff from staff where id = p_staff_id;
  if v_staff.id is null or current_member_role(v_staff.etablissement_id) is null then
    raise exception 'Fiche introuvable.';
  end if;
  if v_staff.hidden then
    raise exception 'Cette fiche est masquée : le gérant la réaffiche depuis Équipe.';
  end if;
  if not staff_code_ok(v_staff.id, p_code) then
    raise exception 'Code incorrect.';
  end if;
  if p_signature is null or length(p_signature) = 0 then
    raise exception 'Signature manquante.';
  end if;
  begin
    insert into time_entries (etablissement_id, staff_id, member_name, signature_in, created_by)
    values (v_staff.etablissement_id, v_staff.id, v_staff.name, p_signature, auth.uid())
    returning id into v_id;
  exception when unique_violation then
    -- Index partiel time_entries_open_idx : déjà en service.
    raise exception '% a déjà badgé son arrivée.', v_staff.name;
  end;
  return v_id;
end;
$$;

revoke execute on function public.clock_in(uuid, text, text) from public, anon;
grant execute on function public.clock_in(uuid, text, text) to authenticated;

-- Le départ : l'heure retenue reste celle du serveur (trigger
-- time_entries_enforce_update_rights), la tablette peut être déréglée.
create function public.clock_out(p_entry_id uuid, p_code text, p_signature text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_entry public.time_entries;
begin
  select * into v_entry from time_entries where id = p_entry_id;
  if v_entry.id is null or current_member_role(v_entry.etablissement_id) is null then
    raise exception 'Badgeage introuvable.';
  end if;
  if v_entry.ended_at is not null then
    raise exception 'Ce badgeage est déjà clos.';
  end if;
  if v_entry.staff_id is null then
    raise exception 'La fiche a été retirée : le gérant clôt ce badgeage depuis le journal.';
  end if;
  if not staff_code_ok(v_entry.staff_id, p_code) then
    raise exception 'Code incorrect.';
  end if;
  if p_signature is null or length(p_signature) = 0 then
    raise exception 'Signature manquante.';
  end if;
  update time_entries
  set ended_at = now(), signature_out = p_signature
  where id = p_entry_id;
end;
$$;

revoke execute on function public.clock_out(uuid, text, text) from public, anon;
grant execute on function public.clock_out(uuid, text, text) to authenticated;
