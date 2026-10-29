-- Jeu commun, chargé dans la transaction de chaque script (annulée à la fin).
--   admin       …0a0   (admin_users)
--   commercial A …0a1  signé, actif
--   commercial B …0b1  signé, actif
--   commercial C …0c1  invité, jamais signé
--   commercial D …0d1  signé, contrat terminé (ended_at passé)
-- Restaurants : libres …f01 à …f09 ; client par lien …e01, par téléphone
-- …e02 ; opposition …e06.

\set admin '00000000-0000-0000-0000-0000000000a0'
\set a_user '00000000-0000-0000-0000-0000000000a1'
\set b_user '00000000-0000-0000-0000-0000000000b1'
\set c_user '00000000-0000-0000-0000-0000000000c1'
\set d_user '00000000-0000-0000-0000-0000000000d1'
\set a '00000000-0000-0000-0000-00000000aaaa'
\set b '00000000-0000-0000-0000-00000000bbbb'
\set c '00000000-0000-0000-0000-00000000cccc'
\set d '00000000-0000-0000-0000-00000000dddd'
\set v1 '00000000-0000-0000-0000-0000000000f1'
\set r1 '00000000-0000-0000-0000-000000000f01'
\set r2 '00000000-0000-0000-0000-000000000f02'
\set r3 '00000000-0000-0000-0000-000000000f03'
\set r4 '00000000-0000-0000-0000-000000000f04'
\set r5 '00000000-0000-0000-0000-000000000f05'
\set r6 '00000000-0000-0000-0000-000000000f06'
\set r7 '00000000-0000-0000-0000-000000000f07'
\set r8 '00000000-0000-0000-0000-000000000f08'
\set r9 '00000000-0000-0000-0000-000000000f09'
\set rc_link '00000000-0000-0000-0000-000000000e01'
\set rc_phone '00000000-0000-0000-0000-000000000e02'
\set r_optout '00000000-0000-0000-0000-000000000e06'
\set etab '00000000-0000-0000-0000-0000000e7ab1'

-- Agir comme un compte connecté (ce que fait PostgREST), puis revenir.
create function pg_temp.act(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
create function pg_temp.act_service() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role": "service_role"}', true),
         set_config('role', 'service_role', true);
$$;
create function pg_temp.reset() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'postgres', true);
$$;
create function pg_temp.ok(p_cond boolean, p_what text) returns void language plpgsql as $$
begin
  if p_cond is not true then
    raise exception 'ÉCHEC : %', p_what;
  end if;
end;
$$;
-- Vrai si l'instruction échoue (et l'annule, par un sous-bloc).
create function pg_temp.fails(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;

insert into auth.users (id, email) values
  (:'admin', 'admin@ominin.test'), (:'a_user', 'a@ominin.test'), (:'b_user', 'b@ominin.test'),
  (:'c_user', 'c@ominin.test'), (:'d_user', 'd@ominin.test');
insert into public.admin_users (user_id, email) values (:'admin', 'admin@ominin.test');

insert into public.legal_versions (id, doc, version, effective_from, body_sha256, summary)
values (:'v1', 'commercial', 'test-1', now() - interval '30 days', 'x', 'test');

insert into public.commerciaux (id, email, user_id, first_name, last_name) values
  (:'a', 'a@ominin.test', :'a_user', 'Alice', 'A'),
  (:'b', 'b@ominin.test', :'b_user', 'Bruno', 'B'),
  (:'c', 'c@ominin.test', :'c_user', null, null),
  (:'d', 'd@ominin.test', :'d_user', 'Dora', 'D');
insert into public.legal_acceptances (version_id, scope, commercial_id, user_id, signatory_email, scope_label, terms, accepted_at)
select :'v1', 'commercial', id, user_id, email, email, '{}', now() - interval '20 days'
from public.commerciaux where id in (:'a', :'b', :'d');
update public.commerciaux set ended_at = now() - interval '1 day', end_reason = 'mutual' where id = :'d';

insert into public.etablissements (id, slug, name, tagline, address, phone, hours)
values (:'etab', 'chez-test', 'Chez Test', '', '1 rue du Test', '04 67 00 00 02', '');

insert into public.crm_restaurants (id, name, slug, address, city, phone, email, owner_name, important_notes, description) values
  (:'r1', 'Le Bistrot Libre', 'r1', '1 rue Libre', 'Montpellier', '04 67 11 11 11', 'r1@resto.test', 'Patron Un', 'note admin', 'desc admin'),
  (:'r2', 'La Table Deux', 'r2', '2 rue Libre', 'Montpellier', '04 67 22 22 22', null, null, null, null),
  (:'r3', 'Trois Saveurs', 'r3', '3 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r4', 'Quatre Vents', 'r4', '4 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r5', 'Cinq Sens', 'r5', '5 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r6', 'Six Pieds', 'r6', '6 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r7', 'Sept Mers', 'r7', '7 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r8', 'Huit Clos', 'r8', '8 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'r9', 'Neuf Lunes', 'r9', '9 rue Libre', 'Montpellier', null, null, null, null, null),
  (:'rc_link', 'Client Relié', 'rc-link', '10 rue Client', 'Montpellier', null, null, null, null, null),
  (:'rc_phone', 'Autre Nom', 'rc-phone', '11 rue Client', 'Montpellier', '0467000002', null, null, null, null),
  (:'r_optout', 'Opposé', 'r-optout', '15 rue', 'Montpellier', null, null, null, null, null);

update public.crm_restaurants set etablissement_id = :'etab' where id = :'rc_link';
update public.crm_restaurants set outreach_opted_out_at = now() - interval '5 days' where id = :'r_optout';
