-- Lien gérant. Ominin remet au propriétaire d'un établissement déjà en base
-- (carte semée avant la signature) un lien à lui seul, par SMS ou WhatsApp :
-- il y crée son compte — ou se connecte — et devient gérant, sans que son
-- adresse ait à être connue d'avance.
--
-- L'invitation par email (table invitations) ne convient pas à ce canal : le
-- jeton Supabase qu'elle envoie est consommé à la première ouverture, et
-- l'aperçu que génère la messagerie l'ouvre avant le destinataire. Ici,
-- ouvrir le lien ne consomme rien ; seule la confirmation, par un compte
-- connecté, le fait.
--
-- Un seul lien vivant par établissement : en émettre un nouveau révoque le
-- précédent. Sans policy, la table ne s'atteint que par le service role
-- (npm run menu:gerant) et par les fonctions ci-dessous.

create table public.gerant_links (
  etablissement_id uuid primary key
    references public.etablissements (id) on delete cascade,
  -- 24 octets, comme le lien de planning : deviner l'adresse est hors de
  -- portée.
  token text not null unique
    default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now()
);

alter table public.gerant_links enable row level security;

-- Nom de l'établissement, affiché avant toute connexion ; null si le lien a
-- servi ou n'existe pas.
create function public.gerant_link_etablissement(p_token text)
returns text
language sql stable security definer
set search_path = public
as $$
  select e.name
  from gerant_links l
  join etablissements e on e.id = l.etablissement_id
  where l.token = p_token;
$$;

revoke execute on function public.gerant_link_etablissement(text) from public;
grant execute on function public.gerant_link_etablissement(text) to anon, authenticated;

-- Rattache le compte connecté comme gérant et consomme le lien, dans la même
-- transaction : deux ouvertures concurrentes ne font qu'un gérant.
create function public.claim_gerant_link(p_token text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_etablissement uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  delete from gerant_links where token = p_token
  returning etablissement_id into v_etablissement;
  if v_etablissement is null then
    raise exception 'Ce lien a déjà servi ou n''existe plus.';
  end if;

  insert into memberships (user_id, etablissement_id, role, email)
  select auth.uid(), v_etablissement, 'gerant', u.email
  from auth.users u where u.id = auth.uid()
  on conflict (user_id, etablissement_id) do update set role = excluded.role;

  return v_etablissement;
end;
$$;

revoke execute on function public.claim_gerant_link(text) from public, anon;
grant execute on function public.claim_gerant_link(text) to authenticated;
