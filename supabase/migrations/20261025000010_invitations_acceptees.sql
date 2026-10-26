-- Invitations d'équipe : acceptées par l'invité, jamais converties d'office.
--
-- Jusqu'ici une invitation devenait membership dès qu'un compte existait à
-- son adresse (handle_new_invitation) ou y était créé (handle_new_user). Or le
-- projet confirme les e-mails d'office : n'importe qui peut ouvrir un compte à
-- l'adresse de l'invité, avant ou après l'invitation, et recevoir sa place —
-- gérant compris. Désormais seul celui qui lit l'e-mail accepte : le jeton
-- n'existe que dans le lien envoyé, et l'adresse du compte connecté doit être
-- celle de l'invitation.

drop trigger invitations_convert_existing on public.invitations;
drop function public.handle_new_invitation();
drop trigger on_auth_user_created on auth.users;
drop function public.handle_new_user();

alter table public.invitations
  add column token uuid not null default gen_random_uuid();
alter table public.invitations
  add constraint invitations_token_key unique (token);

create function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
begin
  select * into v_invitation from public.invitations where token = p_token;
  if v_invitation.id is null or v_invitation.email is distinct from (
    select lower(email) from auth.users where id = auth.uid()
  ) then
    raise exception 'Invitation introuvable pour ce compte.' using errcode = 'P0002';
  end if;

  insert into public.memberships (user_id, etablissement_id, role, email)
  values (auth.uid(), v_invitation.etablissement_id, v_invitation.role, v_invitation.email)
  on conflict (user_id, etablissement_id) do update set role = excluded.role;
  delete from public.invitations where id = v_invitation.id;
  return v_invitation.etablissement_id;
end;
$$;

revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;
